//! Decoder for the pixel strip the addon paints in the top-left of the WoW window.
//!
//! Each 4x4 block carries three nibbles, one per channel, painted at `level * STEP`.
//! Protocol 2 packed a whole byte into each channel, which needs the captured colour to
//! survive the compositor bit-exact -- it does not: a machine with display colour
//! management (or any driver colour pass) hands the capture values a few counts off,
//! worst in the darks, which broke both the magic block and every payload byte. Sixteen
//! levels 17 apart survive a drift of +/-8, so the same block reads back the same nibble.
//!
//! Protocol 4 deflates the payload before encoding it (LibDeflate addon-side), and protocol 5
//! carries only what the app cannot look up -- class, item level and score come from
//! puginspect.com instead. At 12 bits per 4x4 block every byte saved is screen area: together
//! these keep a full 20-applicant list on one 4px row of the strip instead of three.
use image::RgbaImage;
use serde::Serialize;

/// Strip protocol version this build understands; the addon writes its own as the
/// first header field. Bump both together whenever the payload shape changes.
pub const PROTOCOL: u32 = 5;
pub const B: u32 = 4;
pub const COLS: u32 = 250;
pub const MAX_ROWS: u32 = 4;
/// Channel value per nibble level: level 15 lands exactly on 255.
const STEP: u32 = 17;
/// Magic block, as nibble levels.
const MAGIC: [u8; 3] = [10, 1, 13];
/// Protocol 2's magic block, as a raw colour. Recognised only so an app meeting an old
/// addon can say which side to update instead of looking dead. It does not collide with
/// `MAGIC`: quantised it reads (2, 0, 4).
const MAGIC_V2: [u8; 3] = [42, 0, 69];
/// Magic, length (3 nibbles), CRC-8 (2 nibbles + pad).
const HEADER_BLOCKS: u32 = 3;
/// Two nibbles per byte, three per block.
const MAX_LEN: usize = ((COLS * MAX_ROWS - HEADER_BLOCKS) * 3 / 2) as usize;

#[derive(Debug, PartialEq)]
pub enum ParseErr {
    /// Header carried another protocol version (the value found).
    Version(u32),
    Malformed,
}

#[derive(Debug, PartialEq)]
pub enum DecodeErr {
    NoMagic,
    /// A protocol 2 strip is on screen; the addon needs updating.
    LegacyAddon,
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
    pub role: String,
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

/// Nearest nibble level for a captured channel value. The half-step of 8 is the whole
/// point: it is the drift budget a colour-managed capture gets to spend.
fn level(v: u8) -> u8 {
    (((v as u32 + STEP / 2) / STEP).min(15)) as u8
}

/// Block `i` as its three nibble levels.
fn nibbles(img: &RgbaImage, x0: u32, y0: u32, i: u32) -> Option<[u8; 3]> {
    block(img, x0, y0, i).map(|p| [level(p[0]), level(p[1]), level(p[2])])
}

/// Whether block 0 at this origin is a protocol 2 magic block. Sampled twice across the
/// block so a lone dark-purple game pixel does not read as an outdated addon, and loosely,
/// because the colour drift that forced protocol 3 also moves this block.
fn is_legacy(img: &RgbaImage, x0: u32, y0: u32) -> bool {
    let near = |p: [u8; 3]| p.iter().zip(MAGIC_V2).all(|(a, b)| a.abs_diff(b) <= 8);
    [1, 2].iter().all(|&dx| {
        (x0 + dx < img.width() && y0 + B / 2 < img.height())
            && near({
                let p = img.get_pixel(x0 + dx, y0 + B / 2).0;
                [p[0], p[1], p[2]]
            })
    })
}

/// Finds the strip near the top-left of the frame and decodes it.
pub fn decode(img: &RgbaImage) -> Result<String, DecodeErr> {
    // Every origin whose block 0 quantises to the magic levels is a candidate, and the
    // first one that survives the CRC wins. Committing to the first match instead would
    // let one game block the colour of the magic sit above a moved strip and block
    // decoding for as long as it is on screen.
    // ponytail: brute force. ~13k single-pixel probes worst case, 4x a second.
    let mut err = DecodeErr::NoMagic;
    let mut legacy = false;
    for y in 0..=MAX_OFFSET {
        for x in 0..=MAX_INSET {
            if nibbles(img, x, y, 0) != Some(MAGIC) {
                legacy = legacy || is_legacy(img, x, y);
                continue;
            }
            match decode_at(img, x, y) {
                Ok(payload) => return Ok(payload),
                Err(e) => err = e,
            }
        }
    }
    // Only when nothing decoded: a live protocol 3 strip always wins over a stale match.
    if err == DecodeErr::NoMagic && legacy {
        return Err(DecodeErr::LegacyAddon);
    }
    Err(err)
}

/// Raw deflate, as the addon's `LibDeflate:CompressDeflate` writes it. The limit is well above
/// a full strip's worth of text: the payload is attacker-supplied in the sense that anything on
/// screen can end up here, and a deflate bomb is 1 KB on the wire.
fn inflate(bytes: &[u8]) -> Option<Vec<u8>> {
    miniz_oxide::inflate::decompress_to_vec_with_limit(bytes, 16 * 1024).ok()
}

fn decode_at(img: &RgbaImage, x0: u32, y0: u32) -> Result<String, DecodeErr> {
    let n = nibbles(img, x0, y0, 1).ok_or(DecodeErr::Truncated)?;
    let len = (n[0] as usize) << 8 | (n[1] as usize) << 4 | n[2] as usize;
    if len == 0 || len > MAX_LEN {
        return Err(DecodeErr::TooLong);
    }
    let c = nibbles(img, x0, y0, 2).ok_or(DecodeErr::Truncated)?;
    let crc = c[0] << 4 | c[1];
    let mut ns = Vec::with_capacity(len * 2 + 2);
    for i in HEADER_BLOCKS..HEADER_BLOCKS + (len * 2).div_ceil(3) as u32 {
        ns.extend(nibbles(img, x0, y0, i).ok_or(DecodeErr::Truncated)?);
    }
    // `chunks_exact` drops the block's zero padding; `take` drops the odd trailing nibble.
    let bytes: Vec<u8> = ns.chunks_exact(2).take(len).map(|p| p[0] << 4 | p[1]).collect();
    if crc8(&bytes) != crc {
        return Err(DecodeErr::Crc);
    }
    // A protocol 3 addon paints plain text; pass it through so `parse` sees the version and the
    // app says which side to update, instead of a bare decode error.
    let bytes = inflate(&bytes).unwrap_or(bytes);
    String::from_utf8(bytes).map_err(|_| DecodeErr::Utf8)
}

/// Header: "1\t<hb>\t<region>\t<myRealm>\t<sessionId>\t<activityId>\t<title>\t<nTotal>"
/// Lines:  "<Name-Realm>:<T|H|D|>:<applicantId>:<bestKeyLevel>:<0|1 timed>"
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
            if f.len() != 5 {
                return None;
            }
            let (name, r) = f[0].rsplit_once('-').unwrap_or((f[0], &realm));
            Some(Applicant {
                name: name.into(),
                realm: r.into(),
                role: f[1].into(),
                group: f[2].parse().ok()?,
                best_level: f[3].parse().ok()?,
                best_timed: f[4] == "1",
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

    /// Mirrors the Lua encoder: three nibbles per block, each filling a solid 4x4 at
    /// `level * STEP`.
    fn encode(payload: &[u8]) -> RgbaImage {
        encode_shifted(payload, |v| v)
    }

    /// The same, with a colour-management style drift applied to every channel -- what a
    /// capture on the machine that forced protocol 3 actually hands the decoder.
    fn encode_shifted(payload: &[u8], shift: impl Fn(u8) -> u8) -> RgbaImage {
        let len = payload.len();
        let crc = crc8(payload);
        let mut nibs: Vec<u8> = vec![
            ((len >> 8) & 15) as u8,
            ((len >> 4) & 15) as u8,
            (len & 15) as u8,
            crc >> 4,
            crc & 15,
            0,
        ];
        for b in payload {
            nibs.push(b >> 4);
            nibs.push(b & 15);
        }
        while nibs.len() % 3 != 0 {
            nibs.push(0);
        }
        let mut img = RgbaImage::from_pixel(COLS * B, MAX_ROWS * B, Rgba([0, 0, 0, 255]));
        let blocks = [MAGIC].into_iter().chain(nibs.chunks(3).map(|c| [c[0], c[1], c[2]]));
        for (i, lv) in blocks.enumerate() {
            let (x0, y0) = ((i as u32 % COLS) * B, (i as u32 / COLS) * B);
            let [r, g, b] = lv.map(|l| shift((l as u32 * STEP) as u8));
            for y in y0..y0 + B {
                for x in x0..x0 + B {
                    img.put_pixel(x, y, Rgba([r, g, b, 255]));
                }
            }
        }
        img
    }

    /// Protocol 2's encoder, kept only to prove an old strip is reported as such.
    fn encode_v2(payload: &[u8]) -> RgbaImage {
        let mut img = RgbaImage::from_pixel(COLS * B, MAX_ROWS * B, Rgba([0, 0, 0, 255]));
        let len = payload.len() as u16;
        let header = [(len >> 8) as u8, (len & 255) as u8, crc8(payload)];
        let blocks = [MAGIC_V2, header].into_iter().chain(payload.chunks(3).map(|c| {
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

    fn deflate(s: &[u8]) -> Vec<u8> {
        miniz_oxide::deflate::compress_to_vec(s, 1)
    }

    const PAYLOAD: &str = "5\t17\teu\tRavencrest\t1234\t2516\t+15 Ara-Kara go\t3\t+\n\
        Puggy-Ravencrest:T:41:15:1\n\
        Healbot:H:41:0:0\n\
        Zapzap-Tarren-Mill:D:42:11:0";

    #[test]
    fn crc_check_value() {
        assert_eq!(crc8(b"123456789"), 0xF4);
    }

    #[test]
    fn round_trip() {
        assert_eq!(decode(&encode(&deflate(PAYLOAD.as_bytes()))).unwrap(), PAYLOAD);
    }

    /// A real `LibDeflate:CompressDeflate(payload)` stream, straight out of the
    /// addon's Lua. The golden vector for the compression half of the contract: if miniz_oxide
    /// and LibDeflate ever stop agreeing, this is where it shows.
    #[test]
    fn libdeflate_stream_inflates() {
        let z: &[u8] = b"\x33\xe5\x34\xe7\x4c\x2d\xe5\xf4\x4e\xac\xaa\x4a\xcc\xe6\x34\x34\
              \x37\x80\x02\x4e\x43\x23\x63\x13\x4e\x5f\x6d\x05\x43\x23\x85\xec\
              \xd4\x4a\x85\xf4\x7c\x4e\x63\x4e\x0f\x2e\xff\xa2\x94\xcc\xbc\x3c\
              \xdd\x90\xc4\xa2\xa2\xd4\x3c\xdf\xcc\x9c\x1c\x2b\x0f\x2b\x43\x03\
              \x2b\x20\xe4\x72\xca\xd7\x85\x98\x62\x15\x02\x15\x02\xfc\x36\x2e\
              \x30";
        let want = "5\t7\teu\tKazzak\t1700000000\t1234\tM+ 12 key go\t3\tH\n\
            Ordinn-TarrenMill:H:10:0:0\n\
            Bo-Kazzak:T:10:0:0";
        assert_eq!(decode(&encode(&z)).unwrap(), want);
    }

    /// A protocol 3 addon still paints plain text, and it has to reach `parse` intact so the
    /// app can tell the user to update the addon rather than showing a decode error.
    #[test]
    fn uncompressed_payload_still_decodes() {
        let old = "3\t7\teu\tKazzak\t9\t1\tgo\t0\t+";
        assert_eq!(decode(&encode(old.as_bytes())).unwrap(), old);
        assert_eq!(parse(old), Err(ParseErr::Version(3)));
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
        let strip = encode(b"3\t3\teu\tKazzak\t9\t1\tmoved\t0\t+");
        let mut big = RgbaImage::from_pixel(strip.width(), strip.height() + 300, image::Rgba([9, 9, 9, 255]));
        image::imageops::replace(&mut big, &strip, 0, 120);
        assert_eq!(decode(&big).unwrap(), "3\t3\teu\tKazzak\t9\t1\tmoved\t0\t+");
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

    /// The curve measured off the diagnostic capture that forced protocol 3: a
    /// colour-managed compositor, worst in the darks, crossing zero around 117.
    fn observed_drift(v: u8) -> u8 {
        let d: i32 = match v {
            0 => 0,
            1..=20 => -5,
            21..=42 => -4,
            43..=66 => -3,
            67..=90 => -2,
            91..=116 => -1,
            117..=140 => 0,
            _ => 1,
        };
        (v as i32 + d).clamp(0, 255) as u8
    }

    #[test]
    fn survives_colour_managed_capture() {
        let img = encode_shifted(PAYLOAD.as_bytes(), observed_drift);
        assert_eq!(decode(&img).unwrap(), PAYLOAD);
    }

    /// The whole point of 17 apart: anything inside the half-step still reads back.
    #[test]
    fn survives_the_full_drift_budget() {
        for d in [-8i32, -5, -1, 1, 5, 8] {
            let img = encode_shifted(PAYLOAD.as_bytes(), |v| (v as i32 + d).clamp(0, 255) as u8);
            assert_eq!(decode(&img).unwrap(), PAYLOAD, "drift {d}");
        }
        // One step further and the level is genuinely ambiguous, so it must not decode.
        let img = encode_shifted(PAYLOAD.as_bytes(), |v| (v as i32 + 9).clamp(0, 255) as u8);
        assert_ne!(decode(&img).as_deref(), Ok(PAYLOAD));
    }

    #[test]
    fn legacy_strip_reports_outdated_addon() {
        let img = encode_v2(b"2\t1\teu\tKazzak\t9\t1\told\t0\t+");
        assert_eq!(decode(&img), Err(DecodeErr::LegacyAddon));
        // A live protocol 3 strip below an old one still wins.
        let new = encode(PAYLOAD.as_bytes());
        let mut both = RgbaImage::from_pixel(new.width(), new.height() + 100, Rgba([9, 9, 9, 255]));
        image::imageops::replace(&mut both, &img, 0, 0);
        image::imageops::replace(&mut both, &new, 0, 100);
        assert_eq!(decode(&both).unwrap(), PAYLOAD);
    }

    /// Golden vector, asserted byte-for-byte in the addon's test_applicants.lua too. If this
    /// line has to change, the wire format changed and the encoder in the other repo changes
    /// with it. Encoded here from the same payload, then read back as levels off the image.
    #[test]
    fn wire_format_golden_vector() {
        let img = encode(b"3\t7\teu\tKazzak\t9\t1\tgo\t0\t+");
        let n = "a1d018450330937096575094b617a7a616b0939093109676f0930092b";
        let got: String = (0..n.len() as u32 / 3)
            .flat_map(|i| nibbles(&img, 0, 0, i).unwrap())
            .map(|v| char::from_digit(v as u32, 16).unwrap())
            .collect();
        assert_eq!(got, n);
    }

    #[test]
    fn missing_magic() {
        let img = RgbaImage::from_pixel(COLS * B, MAX_ROWS * B, Rgba([0, 0, 0, 255]));
        assert_eq!(decode(&img), Err(DecodeErr::NoMagic));
    }

    #[test]
    fn twenty_applicants_fit() {
        let mut p = "5\t99\tus\tIllidan\t1\t2516\tWeekly +10s, chill run\t20\t+".to_string();
        for i in 0..20 {
            p += &format!("\nApplicantname{i}-Somerealmname:D:7:0:0");
        }
        assert!(p.len() <= MAX_LEN);
        // The whole point of protocols 4 and 5: a full list fits one 4px row of the strip.
        let z = deflate(p.as_bytes());
        assert!(z.len() * 2 <= (COLS * 3) as usize, "{}", z.len());
        assert_eq!(decode(&encode(&z)).unwrap(), p);
    }

    #[test]
    fn parse_frame() {
        let f = parse(PAYLOAD).unwrap();
        assert_eq!((f.hb, f.region.as_str(), f.realm.as_str()), (17, "eu", "Ravencrest"));
        assert_eq!((f.session_id, f.activity_id, f.total), (1234, 2516, 3));
        assert_eq!(f.title, "+15 Ara-Kara go");
        let a = &f.applicants;
        assert_eq!(a.len(), 3);
        assert_eq!((a[0].name.as_str(), a[0].realm.as_str(), a[0].group), ("Puggy", "Ravencrest", 41));
        assert_eq!((a[0].best_level, a[0].best_timed), (15, true));
        assert_eq!((a[1].name.as_str(), a[1].realm.as_str(), a[1].role.as_str()), ("Healbot", "Ravencrest", "H"));
        assert_eq!((a[2].name.as_str(), a[2].realm.as_str()), ("Zapzap-Tarren", "Mill"));
        assert!(parse("5\tx").is_err());
        assert_eq!(parse("5\t1\teu\tR\t1\t1\tt\t1\tH\nbad line"), Err(ParseErr::Malformed));
        assert_eq!(parse("4\t1\teu\tR\t1\t1\tt\t1\tH"), Err(ParseErr::Version(4)));
        assert_eq!(parse("6\t1\tx"), Err(ParseErr::Version(6)));
    }
}
