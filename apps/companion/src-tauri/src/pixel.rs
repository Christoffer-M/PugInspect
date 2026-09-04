//! Decoder for the pixel strip the addon paints in the top-left of the WoW window.
use image::RgbaImage;
use serde::Serialize;

/// Strip protocol version this build understands; the addon writes its own as the
/// first header field. Bump both together whenever the payload shape changes.
pub const PROTOCOL: u32 = 2;
pub const B: u32 = 4;
pub const COLS: u32 = 250;
pub const MAX_ROWS: u32 = 4;
const MAGIC: [u8; 3] = [42, 0, 69];
const MAX_LEN: usize = ((COLS * MAX_ROWS - 2) * 3) as usize;

#[derive(Debug, PartialEq)]
pub enum ParseErr {
    /// Header carried another protocol version (the value found).
    Version(u32),
    Malformed,
}

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
    /// Raid difficulty letter: "N" | "H" | "M", "+" for Mythic+, "" unknown.
    pub difficulty: String,
    pub applicants: Vec<Applicant>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Applicant {
    pub name: String,
    pub realm: String,
    pub class: String,
    pub role: String,
    pub ilvl: u32,
    pub rio: u32,
    /// In-game applicant id; members of one group application share it, first = leader.
    pub group: u64,
    /// Best key level in the listed dungeon (M+ listings only, else 0) and whether it was timed.
    pub best_level: u32,
    pub best_timed: bool,
}

/// CRC-8/SMBUS: poly 0x07, init 0, no reflection, no xor-out.
pub fn crc8(data: &[u8]) -> u8 {
    data.iter().fold(0u8, |crc, &b| {
        (0..8).fold(crc ^ b, |c, _| if c & 0x80 != 0 { (c << 1) ^ 0x07 } else { c << 1 })
    })
}

/// The addon may move the strip down (`/pi hud <px>`); scan this far for the magic block.
pub const MAX_OFFSET: u32 = 400;
/// A window-capture frame starts at the window rect, not the client area, so in plain
/// Windowed mode the strip sits a border's width in from the left (the title bar is just
/// another vertical offset). 32 covers that border up to 200% display scaling.
pub const MAX_INSET: u32 = 32;

/// RGB at the centre of block `i` of a strip whose top-left corner is at `(x0, y0)`,
/// or None if outside.
fn block(img: &RgbaImage, x0: u32, y0: u32, i: u32) -> Option<[u8; 3]> {
    let (x, y) = (x0 + (i % COLS) * B + B / 2, y0 + (i / COLS) * B + B / 2);
    if x >= img.width() || y >= img.height() {
        return None;
    }
    let p = img.get_pixel(x, y).0;
    Some([p[0], p[1], p[2]])
}

fn is_magic(px: [u8; 3]) -> bool {
    px.iter().zip(MAGIC).all(|(a, b)| a.abs_diff(b) <= 3)
}

/// Finds the strip near the top-left of the frame and decodes it.
pub fn decode(img: &RgbaImage) -> Result<String, DecodeErr> {
    // Every origin whose sample matches the magic colour is a candidate, and the
    // first one that survives the CRC wins. Committing to the first match instead
    // would let one dark-purple game pixel above a moved strip block decoding for
    // as long as it is on screen; trying them all also means a candidate whose
    // sample lands on a block's edge row simply loses to the next one.
    // ponytail: brute force. ~13k single-pixel probes worst case, 4x a second.
    let mut err = DecodeErr::NoMagic;
    for y in 0..=MAX_OFFSET {
        for x in 0..=MAX_INSET {
            if !block(img, x, y, 0).is_some_and(is_magic) {
                continue;
            }
            match decode_at(img, x, y) {
                Ok(payload) => return Ok(payload),
                Err(e) => err = e,
            }
        }
    }
    Err(err)
}

fn decode_at(img: &RgbaImage, x0: u32, y0: u32) -> Result<String, DecodeErr> {
    let [hi, lo, crc] = block(img, x0, y0, 1).ok_or(DecodeErr::Truncated)?;
    let len = (hi as usize) << 8 | lo as usize;
    if len > MAX_LEN {
        return Err(DecodeErr::TooLong);
    }
    let mut bytes = Vec::with_capacity(len + 3);
    for i in 2..2 + len.div_ceil(3) as u32 {
        bytes.extend(block(img, x0, y0, i).ok_or(DecodeErr::Truncated)?);
    }
    bytes.truncate(len);
    if crc8(&bytes) != crc {
        return Err(DecodeErr::Crc);
    }
    String::from_utf8(bytes).map_err(|_| DecodeErr::Utf8)
}

/// Header: "1\t<hb>\t<region>\t<myRealm>\t<sessionId>\t<activityId>\t<title>\t<nTotal>"
/// Lines:  "<Name-Realm>:<CLASSFILE>:<T|H|D|>:<ilvl>:<rio>"
pub fn parse(payload: &str) -> Result<Frame, ParseErr> {
    let mut lines = payload.split('\n');
    let h: Vec<&str> = lines.next().ok_or(ParseErr::Malformed)?.split('\t').collect();
    let version: u32 = h.first().and_then(|v| v.parse().ok()).ok_or(ParseErr::Malformed)?;
    if version != PROTOCOL {
        return Err(ParseErr::Version(version));
    }
    if h.len() != 9 {
        return Err(ParseErr::Malformed);
    }
    parse_body(&h, lines).ok_or(ParseErr::Malformed)
}

fn parse_body<'a>(h: &[&str], lines: impl Iterator<Item = &'a str>) -> Option<Frame> {
    let realm = h[3].to_string();
    let applicants = lines
        .map(|l| {
            let f: Vec<&str> = l.split(':').collect();
            if f.len() != 8 {
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
                group: f[5].parse().ok()?,
                best_level: f[6].parse().ok()?,
                best_timed: f[7] == "1",
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
        difficulty: h[8].into(),
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

    const PAYLOAD: &str = "2\t17\tEU\tRavencrest\t1234\t2516\t+15 Ara-Kara go\t3\t+\n\
        Puggy-Ravencrest:WARRIOR:T:635:2874:41:15:1\n\
        Healbot:PRIEST:H:628:2410:41:0:0\n\
        Zapzap-Tarren-Mill:MAGE:D:641:3102:42:11:0";

    #[test]
    fn crc_check_value() {
        assert_eq!(crc8(b"123456789"), 0xF4);
    }

    #[test]
    fn round_trip() {
        assert_eq!(decode(&encode(PAYLOAD.as_bytes())).unwrap(), PAYLOAD);
    }

    #[test]
    fn corrupted_block_fails_crc() {
        // The whole block, not one pixel: scanning every candidate offset means a
        // single bad pixel is recovered from by sampling a different row.
        let mut img = encode(PAYLOAD.as_bytes());
        for y in 0..B {
            for x in 2 * B..3 * B {
                img.put_pixel(x, y, Rgba([9, 9, 9, 255]));
            }
        }
        assert_eq!(decode(&img), Err(DecodeErr::Crc));
    }

    #[test]
    fn single_bad_pixel_is_recovered() {
        let mut img = encode(PAYLOAD.as_bytes());
        img.put_pixel(2 * B + B / 2, B / 2, Rgba([9, 9, 9, 255]));
        assert_eq!(decode(&img).unwrap(), PAYLOAD);
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

    /// Plain Windowed mode: the capture starts at the window rect, so the client area
    /// (and the strip) sits in from the left border and below the title bar.
    #[test]
    fn strip_inset_by_window_border_is_found() {
        let strip = encode(PAYLOAD.as_bytes());
        for (dx, dy) in [(1, 32), (8, 31), (MAX_INSET, 0)] {
            let mut win = RgbaImage::from_pixel(strip.width() + dx, strip.height() + dy, Rgba([9, 9, 9, 255]));
            image::imageops::replace(&mut win, &strip, dx as i64, dy as i64);
            assert_eq!(decode(&win).unwrap(), PAYLOAD, "inset ({dx}, {dy})");
        }
        // Past the inset budget it is not found, as before.
        let mut far = RgbaImage::from_pixel(strip.width() + 64, strip.height(), Rgba([9, 9, 9, 255]));
        image::imageops::replace(&mut far, &strip, (MAX_INSET + B) as i64, 0);
        assert_eq!(decode(&far), Err(DecodeErr::NoMagic));
    }

    #[test]
    fn false_magic_above_the_strip_is_skipped() {
        // A stray pixel the colour of the magic block, 40 px above the real strip.
        let strip = encode(PAYLOAD.as_bytes());
        let mut img = RgbaImage::from_pixel(strip.width(), strip.height() + 200, Rgba([9, 9, 9, 255]));
        image::imageops::replace(&mut img, &strip, 0, 100);
        img.put_pixel(B / 2, 60, Rgba([MAGIC[0], MAGIC[1], MAGIC[2], 255]));
        assert_eq!(decode(&img).unwrap(), PAYLOAD);
    }

    #[test]
    fn missing_magic() {
        let img = RgbaImage::from_pixel(COLS * B, MAX_ROWS * B, Rgba([0, 0, 0, 255]));
        assert_eq!(decode(&img), Err(DecodeErr::NoMagic));
    }

    #[test]
    fn twenty_applicants_fit() {
        let mut p = "2\t99\tUS\tIllidan\t1\t2516\tWeekly +10s, chill run\t20\t+".to_string();
        for i in 0..20 {
            p += &format!("\nApplicantname{i}-Somerealmname:DEATHKNIGHT:D:640:2500:7:0:0");
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
        assert!(parse("2\tx").is_err());
        assert_eq!(parse("2\t1\tEU\tR\t1\t1\tt\t1\tH\nbad line"), Err(ParseErr::Malformed));
        assert_eq!(parse("1\t1\tEU\tR\t1\t1\tt\t1\tH"), Err(ParseErr::Version(1)));
        assert_eq!(parse("3\t1\tx"), Err(ParseErr::Version(3)));
    }
}
