//! Decoder for the pixel strip the addon paints in the top-left of the WoW window.
//!
//! Each 4x4 block carries three nibbles, one per channel, painted at `level * STEP`.
//! Protocol 2 packed a whole byte into each channel, which needs the captured colour to
//! survive the compositor bit-exact -- it does not: a machine with display colour
//! management (or any driver colour pass) hands the capture values a few counts off,
//! worst in the darks, which broke both the magic block and every payload byte. Sixteen
//! levels 17 apart survive a drift of +/-8, so the same block reads back the same nibble.
//!
//! Protocol 5 carries only what the app cannot look up (score comes from puginspect.com), and
//! deflates the applicant block. At 12 bits per 4x4 block every byte saved is screen area: a
//! full 20-applicant list is two 4px rows of strip instead of three.
//!
//! The header LINE is left as plain text and only the block after it is compressed, then
//! printable-encoded so the whole payload stays ASCII. That is what lets an app too old to
//! understand the body still read the protocol number off the front and update itself, rather
//! than reporting the addon as silent -- `parse` checks the version before it touches the body,
//! so a payload from another protocol is never decoded, only identified.
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
    /// Blizzard's classID (1-13), 0 when the game did not report one.
    pub class_id: u32,
    /// Equipped item level as the GAME reports it -- live, where the API's is a cached
    /// snapshot. 0 when the applicant's info had not loaded in time; the app falls back
    /// to the lookup then.
    pub ilvl: u32,
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

/// LibDeflate's `EncodeForPrint` alphabet: base64 over characters that survive a WoW edit box.
const ALPHABET: &[u8; 64] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()";

/// Undo `LibDeflate:EncodeForPrint` then `CompressDeflate`. The inflate limit is well above a
/// full strip's worth of text: anything on screen can end up here, and a deflate bomb is 1 KB
/// on the wire.
fn decode_block(s: &str) -> Option<String> {
    let mut bytes = Vec::with_capacity(s.len() * 3 / 4 + 3);
    for chunk in s.as_bytes().chunks(4) {
        // 4 characters carry 3 bytes; a trailing 2 or 3 encode 1 or 2, as LibDeflate writes them.
        let mut acc = 0u32;
        for (i, c) in chunk.iter().enumerate() {
            acc |= (ALPHABET.iter().position(|a| a == c)? as u32) << (6 * i);
        }
        bytes.extend(&acc.to_le_bytes()[..chunk.len() - 1]);
    }
    let out = miniz_oxide::inflate::decompress_to_vec_with_limit(&bytes, 16 * 1024).ok()?;
    String::from_utf8(out).ok()
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
    String::from_utf8(bytes).map_err(|_| DecodeErr::Utf8)
}

/// Header: "5\t<hb>\t<region>\t<myRealm>\t<sessionId>\t<activityId>\t<title>\t<nTotal>\t<diff>"
/// Body:   printable-encoded deflate of "<Name-Realm>:<T|H|D|>:<classId>:<ilvl>:<applicantId>:
///         <bestKeyLevel>:<0|1 timed>" lines. Absent when there are no applicants.
pub fn parse(payload: &str) -> Result<Frame, ParseErr> {
    let (head, body) = payload.split_once('\n').unwrap_or((payload, ""));
    let h: Vec<&str> = head.split('\t').collect();
    let version: u32 = h.first().and_then(|v| v.parse().ok()).ok_or(ParseErr::Malformed)?;
    // Before the body, deliberately: another protocol's block means nothing to us, but its
    // header still names the version, which is how the app knows which side is behind.
    if version != PROTOCOL {
        return Err(ParseErr::Version(version));
    }
    if h.len() != 9 {
        return Err(ParseErr::Malformed);
    }
    let lines = if body.is_empty() {
        String::new()
    } else {
        decode_block(body).ok_or(ParseErr::Malformed)?
    };
    parse_body(&h, lines.split('\n').filter(|l| !l.is_empty())).ok_or(ParseErr::Malformed)
}

fn parse_body<'a>(h: &[&str], lines: impl Iterator<Item = &'a str>) -> Option<Frame> {
    let realm = h[3].to_string();
    let applicants = lines
        .map(|l| {
            let f: Vec<&str> = l.split(':').collect();
            if f.len() != 7 {
                return None;
            }
            let (name, r) = f[0].rsplit_once('-').unwrap_or((f[0], &realm));
            Some(Applicant {
                name: name.into(),
                realm: r.into(),
                role: f[1].into(),
                class_id: f[2].parse().ok()?,
                ilvl: f[3].parse().ok()?,
                group: f[4].parse().ok()?,
                best_level: f[5].parse().ok()?,
                best_timed: f[6] == "1",
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
/// Mirrors PugInspectPixel.Send: header line as-is, applicant block deflated and
/// printable-encoded. `decode_block` is written against exactly this.
pub(crate) fn wire(payload: &str) -> String {
    let Some((head, body)) = payload.split_once('\n') else { return payload.into() };
    let z = miniz_oxide::deflate::compress_to_vec(body.as_bytes(), 6);
    let mut out = String::from(head);
    out.push('\n');
    for c in z.chunks(3) {
        let mut acc = 0u32;
        for (i, b) in c.iter().enumerate() {
            acc |= (*b as u32) << (8 * i);
        }
        for i in 0..c.len() + 1 {
            out.push(ALPHABET[(acc >> (6 * i)) as usize & 63] as char);
        }
    }
    out
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

    const PAYLOAD: &str = "5\t17\teu\tRavencrest\t1234\t2516\t+15 Ara-Kara go\t3\t+\n\
        Puggy-Ravencrest:T:1:635:41:15:1\n\
        Healbot:H:5:628:41:0:0\n\
        Zapzap-Tarren-Mill:D:8:641:42:11:0";

    #[test]
    fn crc_check_value() {
        assert_eq!(crc8(b"123456789"), 0xF4);
    }

    #[test]
    fn round_trip() {
        let strip = decode(&encode(wire(PAYLOAD).as_bytes())).unwrap();
        assert_eq!(strip, wire(PAYLOAD));
        assert_eq!(parse(&strip).unwrap().applicants.len(), 3);
    }

    /// A listing with nobody in it has no body at all, so there is nothing to decode.
    #[test]
    fn empty_applicant_list() {
        let head = "5\t3\teu\tKazzak\t9\t1\tquiet\t0\t+";
        let f = parse(&decode(&encode(wire(head).as_bytes())).unwrap()).unwrap();
        assert!(f.applicants.is_empty());
    }

    /// A real strip as the addon paints it, straight out of LibDeflate in the other repo:
    /// plain header line, then `EncodeForPrint(CompressDeflate(body))`. The golden vector for
    /// the encoding half of the contract -- if LibDeflate and this decoder ever stop agreeing,
    /// this is where it shows.
    #[test]
    fn decodes_a_real_addon_strip() {
        let painted = "5\t7\teu\tKazzak\t1700000000\t1234\tM+ 12 key go\t3\tH\n\
            Z)IsjZ8Yt3qsSOIsnpFZmNCSYdRm3ktSWsRm0aRac5YP8117eRQQeZ2QqSYqGsyauja8";
        assert!(painted.is_ascii(), "the strip must stay readable to any app version");
        let f = parse(&decode(&encode(painted.as_bytes())).unwrap()).unwrap();
        assert_eq!(f.title, "M+ 12 key go");
        let a = &f.applicants;
        assert_eq!(a.len(), 2);
        assert_eq!((a[0].name.as_str(), a[0].realm.as_str(), a[0].role.as_str()), ("Ordinn", "TarrenMill", "H"));
        assert_eq!((a[0].class_id, a[0].ilvl, a[0].group), (7, 489, 10));
        assert_eq!((a[1].name.as_str(), a[1].realm.as_str(), a[1].class_id, a[1].ilvl), ("Bo", "Kazzak", 1, 480));
    }

    /// A protocol 3 addon paints plain text end to end, body included. Nothing here can read
    /// its applicants, but the version has to survive so the app can say which side is behind --
    /// which is why `parse` never touches a body from a protocol it does not speak.
    #[test]
    fn other_protocol_is_identified_not_decoded() {
        let old = "3\t7\teu\tKazzak\t9\t1\tgo\t1\t+\nPuggy-Kazzak:MAGE:D:640:2500:9:0:0";
        assert_eq!(decode(&encode(old.as_bytes())).unwrap(), old);
        assert_eq!(parse(old), Err(ParseErr::Version(3)));
        // And the same in the other direction: a future protocol names itself too.
        assert_eq!(parse("9\t7\tsomething we have never seen"), Err(ParseErr::Version(9)));
    }

    #[test]
    fn corrupted_block_fails_crc() {
        // The whole block, not one pixel: scanning every candidate offset means a
        // single bad pixel is recovered from by sampling a different row.
        let mut img = encode(wire(PAYLOAD).as_bytes());
        for y in 0..B {
            for x in 2 * B..3 * B {
                img.put_pixel(x, y, Rgba([9, 9, 9, 255]));
            }
        }
        assert_eq!(decode(&img), Err(DecodeErr::Crc));
    }

    #[test]
    fn single_bad_pixel_is_recovered() {
        let mut img = encode(wire(PAYLOAD).as_bytes());
        img.put_pixel(2 * B + B / 2, B / 2, Rgba([9, 9, 9, 255]));
        assert_eq!(decode(&img).unwrap(), wire(PAYLOAD));
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
        let strip = encode(wire(PAYLOAD).as_bytes());
        for (dx, dy) in [(1, 32), (8, 31), (MAX_INSET, 0)] {
            let mut win = RgbaImage::from_pixel(strip.width() + dx, strip.height() + dy, Rgba([9, 9, 9, 255]));
            image::imageops::replace(&mut win, &strip, dx as i64, dy as i64);
            assert_eq!(decode(&win).unwrap(), wire(PAYLOAD), "inset ({dx}, {dy})");
        }
        // Past the inset budget it is not found, as before.
        let mut far = RgbaImage::from_pixel(strip.width() + 64, strip.height(), Rgba([9, 9, 9, 255]));
        image::imageops::replace(&mut far, &strip, (MAX_INSET + B) as i64, 0);
        assert_eq!(decode(&far), Err(DecodeErr::NoMagic));
    }

    #[test]
    fn false_magic_above_the_strip_is_skipped() {
        // A stray pixel the colour of the magic block, 40 px above the real strip.
        let strip = encode(wire(PAYLOAD).as_bytes());
        let mut img = RgbaImage::from_pixel(strip.width(), strip.height() + 200, Rgba([9, 9, 9, 255]));
        image::imageops::replace(&mut img, &strip, 0, 100);
        img.put_pixel(B / 2, 60, Rgba([MAGIC[0], MAGIC[1], MAGIC[2], 255]));
        assert_eq!(decode(&img).unwrap(), wire(PAYLOAD));
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
        let img = encode_shifted(wire(PAYLOAD).as_bytes(), observed_drift);
        assert_eq!(decode(&img).unwrap(), wire(PAYLOAD));
    }

    /// The whole point of 17 apart: anything inside the half-step still reads back.
    #[test]
    fn survives_the_full_drift_budget() {
        for d in [-8i32, -5, -1, 1, 5, 8] {
            let img = encode_shifted(wire(PAYLOAD).as_bytes(), |v| (v as i32 + d).clamp(0, 255) as u8);
            assert_eq!(decode(&img).unwrap(), wire(PAYLOAD), "drift {d}");
        }
        // One step further and the level is genuinely ambiguous, so it must not decode.
        let img = encode_shifted(wire(PAYLOAD).as_bytes(), |v| (v as i32 + 9).clamp(0, 255) as u8);
        assert_ne!(decode(&img).as_deref(), Ok(wire(PAYLOAD).as_str()));
    }

    #[test]
    fn legacy_strip_reports_outdated_addon() {
        let img = encode_v2(b"2\t1\teu\tKazzak\t9\t1\told\t0\t+");
        assert_eq!(decode(&img), Err(DecodeErr::LegacyAddon));
        // A live protocol 3 strip below an old one still wins.
        let new = encode(wire(PAYLOAD).as_bytes());
        let mut both = RgbaImage::from_pixel(new.width(), new.height() + 100, Rgba([9, 9, 9, 255]));
        image::imageops::replace(&mut both, &img, 0, 0);
        image::imageops::replace(&mut both, &new, 0, 100);
        assert_eq!(decode(&both).unwrap(), wire(PAYLOAD));
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
    fn a_full_applicant_list_fits() {
        let mut p = "5\t99\tus\tIllidan\t1\t2516\tWeekly +10s, chill run\t20\t+".to_string();
        for i in 0..20 {
            p += &format!("\nApplicantname{i}-Somerealmname:D:6:64{}:41:15:1", i % 10);
        }
        let w = wire(&p);
        // Two 4px rows of strip, where protocol 3 painted three.
        assert!(w.len() <= 2 * (COLS * 3 / 2) as usize, "{} bytes", w.len());
        let f = parse(&decode(&encode(w.as_bytes())).unwrap()).unwrap();
        assert_eq!(f.applicants.len(), 20);
        assert_eq!((f.applicants[3].class_id, f.applicants[3].ilvl), (6, 643));
    }

    /// The addon trims to MAX_BYTES of UNCOMPRESSED payload (1000). Encoding expands
    /// incompressible input by 4/3, so prove the worst case still fits the grid -- otherwise
    /// raising that constant silently truncates the strip instead of failing a test.
    #[test]
    fn the_addons_budget_cannot_overflow_the_grid() {
        let incompressible: String = (0..1000).map(|i| (b'a' + (i * 7 % 26) as u8) as char).collect();
        let painted = wire(&format!("5\t1\teu\tR\t1\t1\tt\t1\t+\n{incompressible}"));
        assert!(painted.len() <= MAX_LEN, "{} bytes vs {MAX_LEN}", painted.len());
    }

    #[test]
    fn parse_frame() {
        let f = parse(&wire(PAYLOAD)).unwrap();
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
