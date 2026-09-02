//! Decoder for the pixel strip the addon paints in the top-left of the WoW window.
use image::RgbaImage;
use serde::Serialize;

pub const B: u32 = 4;
pub const COLS: u32 = 250;
pub const MAX_ROWS: u32 = 4;
const MAGIC: [u8; 3] = [42, 0, 69];
const MAX_LEN: usize = ((COLS * MAX_ROWS - 2) * 3) as usize;

#[derive(Debug, PartialEq)]
pub enum DecodeErr {
    NoMagic,
    TooLong,
    Crc,
    Utf8,
    Truncated,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Frame {
    pub hb: u64,
    pub region: String,
    pub realm: String,
    pub session_id: u64,
    pub activity_id: u64,
    pub title: String,
    pub total: u32,
    pub applicants: Vec<Applicant>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Applicant {
    pub name: String,
    pub realm: String,
    pub class: String,
    pub role: String,
    pub ilvl: u32,
    pub rio: u32,
}

/// CRC-8/SMBUS: poly 0x07, init 0, no reflection, no xor-out.
pub fn crc8(data: &[u8]) -> u8 {
    data.iter().fold(0u8, |crc, &b| {
        (0..8).fold(crc ^ b, |c, _| if c & 0x80 != 0 { (c << 1) ^ 0x07 } else { c << 1 })
    })
}

/// The addon may move the strip down (`/pi hud <px>`); scan this far for the magic block.
pub const MAX_OFFSET: u32 = 400;

/// RGB at the centre of block `i` of a strip whose top edge is at `y0`, or None if outside.
fn block(img: &RgbaImage, y0: u32, i: u32) -> Option<[u8; 3]> {
    let (x, y) = ((i % COLS) * B + B / 2, y0 + (i / COLS) * B + B / 2);
    if x >= img.width() || y >= img.height() {
        return None;
    }
    let p = img.get_pixel(x, y).0;
    Some([p[0], p[1], p[2]])
}

fn is_magic(px: [u8; 3]) -> bool {
    px.iter().zip(MAGIC).all(|(a, b)| a.abs_diff(b) <= 3)
}

/// Finds the strip anywhere in the top `MAX_OFFSET` px of the left edge and decodes it.
pub fn decode(img: &RgbaImage) -> Result<String, DecodeErr> {
    // Scan 1 px at a time so the first hit is the block's top edge; centre sampling then
    // lands inside every block. ~400 single-pixel reads per capture, negligible.
    let y0 = (0..=MAX_OFFSET)
        .find(|&y| block(img, y, 0).is_some_and(is_magic))
        .ok_or(DecodeErr::NoMagic)?;
    decode_at(img, y0)
}

fn decode_at(img: &RgbaImage, y0: u32) -> Result<String, DecodeErr> {
    let [hi, lo, crc] = block(img, y0, 1).ok_or(DecodeErr::Truncated)?;
    let len = (hi as usize) << 8 | lo as usize;
    if len > MAX_LEN {
        return Err(DecodeErr::TooLong);
    }
    let mut bytes = Vec::with_capacity(len + 3);
    for i in 2..2 + len.div_ceil(3) as u32 {
        bytes.extend(block(img, y0, i).ok_or(DecodeErr::Truncated)?);
    }
    bytes.truncate(len);
    if crc8(&bytes) != crc {
        return Err(DecodeErr::Crc);
    }
    String::from_utf8(bytes).map_err(|_| DecodeErr::Utf8)
}

/// Header: "1\t<hb>\t<region>\t<myRealm>\t<sessionId>\t<activityId>\t<title>\t<nTotal>"
/// Lines:  "<Name-Realm>:<CLASSFILE>:<T|H|D|>:<ilvl>:<rio>"
pub fn parse(payload: &str) -> Option<Frame> {
    let mut lines = payload.split('\n');
    let h: Vec<&str> = lines.next()?.split('\t').collect();
    if h.len() != 8 || h[0] != "1" {
        return None;
    }
    let realm = h[3].to_string();
    let applicants = lines
        .map(|l| {
            let f: Vec<&str> = l.split(':').collect();
            if f.len() != 5 {
                return None;
            }
            let (name, r) = f[0].rsplit_once('-').unwrap_or((f[0], &realm));
            Some(Applicant {
                name: name.into(),
                realm: r.into(),
                class: f[1].into(),
                role: f[2].into(),
                ilvl: f[3].parse().ok()?,
                rio: f[4].parse().ok()?,
            })
        })
        .collect::<Option<Vec<_>>>()?;
    Some(Frame {
        hb: h[1].parse().ok()?,
        region: h[2].into(),
        realm,
        session_id: h[4].parse().ok()?,
        activity_id: h[5].parse().ok()?,
        title: h[6].into(),
        total: h[7].parse().ok()?,
        applicants,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::Rgba;

    /// Mirrors the Lua encoder: fills each 4x4 block solid.
    fn encode(payload: &[u8]) -> RgbaImage {
        let mut img = RgbaImage::from_pixel(COLS * B, MAX_ROWS * B, Rgba([0, 0, 0, 255]));
        let len = payload.len() as u16;
        let header = [(len >> 8) as u8, (len & 255) as u8, crc8(payload)];
        let blocks = [MAGIC, header].into_iter().chain(payload.chunks(3).map(|c| {
            let mut b = [0u8; 3];
            b[..c.len()].copy_from_slice(c);
            b
        }));
        for (i, [r, g, b]) in blocks.enumerate() {
            let (x0, y0) = ((i as u32 % COLS) * B, (i as u32 / COLS) * B);
            for y in y0..y0 + B {
                for x in x0..x0 + B {
                    img.put_pixel(x, y, Rgba([r, g, b, 255]));
                }
            }
        }
        img
    }

    const PAYLOAD: &str = "1\t17\tEU\tRavencrest\t1234\t2516\t+15 Ara-Kara go\t3\n\
        Puggy-Ravencrest:WARRIOR:T:635:2874\n\
        Healbot:PRIEST:H:628:2410\n\
        Zapzap-Tarren-Mill:MAGE:D:641:3102";

    #[test]
    fn crc_check_value() {
        assert_eq!(crc8(b"123456789"), 0xF4);
    }

    #[test]
    fn round_trip() {
        assert_eq!(decode(&encode(PAYLOAD.as_bytes())).unwrap(), PAYLOAD);
    }

    #[test]
    fn corrupted_byte_fails_crc() {
        let mut img = encode(PAYLOAD.as_bytes());
        img.put_pixel(2 * B + B / 2, B / 2, Rgba([9, 9, 9, 255]));
        assert_eq!(decode(&img), Err(DecodeErr::Crc));
    }

    #[test]
    fn strip_moved_down_is_found() {
        let strip = encode(b"1\t3\teu\tKazzak\t9\t1\tmoved\t0");
        let mut big = RgbaImage::from_pixel(strip.width(), strip.height() + 300, image::Rgba([9, 9, 9, 255]));
        image::imageops::replace(&mut big, &strip, 0, 120);
        assert_eq!(decode(&big).unwrap(), "1\t3\teu\tKazzak\t9\t1\tmoved\t0");
        let mut far = RgbaImage::from_pixel(strip.width(), strip.height() + 600, image::Rgba([9, 9, 9, 255]));
        image::imageops::replace(&mut far, &strip, 0, (MAX_OFFSET + B) as i64);
        assert_eq!(decode(&far), Err(DecodeErr::NoMagic));
    }

    #[test]
    fn missing_magic() {
        let img = RgbaImage::from_pixel(COLS * B, MAX_ROWS * B, Rgba([0, 0, 0, 255]));
        assert_eq!(decode(&img), Err(DecodeErr::NoMagic));
    }

    #[test]
    fn twenty_applicants_fit() {
        let mut p = "1\t99\tUS\tIllidan\t1\t2516\tWeekly +10s, chill run\t20".to_string();
        for i in 0..20 {
            p += &format!("\nApplicantname{i}-Somerealmname:DEATHKNIGHT:D:640:2500");
        }
        assert!(p.len() <= MAX_LEN);
        assert!(p.len() > (COLS * 3) as usize, "should spill onto row 2");
        assert_eq!(decode(&encode(p.as_bytes())).unwrap(), p);
    }

    #[test]
    fn parse_frame() {
        let f = parse(PAYLOAD).unwrap();
        assert_eq!((f.hb, f.region.as_str(), f.realm.as_str()), (17, "EU", "Ravencrest"));
        assert_eq!((f.session_id, f.activity_id, f.total), (1234, 2516, 3));
        assert_eq!(f.title, "+15 Ara-Kara go");
        let a = &f.applicants;
        assert_eq!(a.len(), 3);
        assert_eq!((a[0].name.as_str(), a[0].realm.as_str(), a[0].ilvl, a[0].rio), ("Puggy", "Ravencrest", 635, 2874));
        assert_eq!((a[1].name.as_str(), a[1].realm.as_str(), a[1].role.as_str()), ("Healbot", "Ravencrest", "H"));
        assert_eq!((a[2].name.as_str(), a[2].realm.as_str()), ("Zapzap-Tarren", "Mill"));
        assert!(parse("2\tx").is_none());
        assert!(parse("1\t1\tEU\tR\t1\t1\tt\t1\nbad line").is_none());
    }
}
