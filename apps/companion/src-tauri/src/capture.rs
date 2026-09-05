//! Captures the WoW window a few times a second, decodes the pixel strip and
//! pushes changes to the webview as `sync` events.
use crate::pixel::{self, DecodeErr, Frame, ParseErr, PROTOCOL};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering::Relaxed};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use xcap::Window;

const RESCAN: Duration = Duration::from_secs(2);
const LOST_AFTER: Duration = Duration::from_secs(5);

/// Set by the `retry_sync` command to force an immediate window re-scan.
pub struct Rescan(pub AtomicBool);

/// Latest status and frame, so a webview that loads after the first events were
/// emitted can catch up via the `sync_snapshot` command.
#[derive(Serialize, Clone, Default)]
pub struct Snapshot {
    pub status: &'static str,
    pub frame: Option<Frame>,
}
pub struct Latest(pub Mutex<Snapshot>);

#[derive(Serialize, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SyncEvent {
    Status { status: &'static str },
    Data(Frame),
}

pub fn spawn(app: AppHandle) {
    app.manage(Rescan(AtomicBool::new(false)));
    app.manage(Latest(Mutex::new(Snapshot::default())));
    thread::spawn(move || run(app));
}

fn find_wow() -> Option<Window> {
    Window::all().ok()?.into_iter().find(|w| w.title().is_ok_and(|t| t == "World of Warcraft"))
}

/// Saves the region the decoder looks at to the desktop and reports what it found there,
/// so a user whose strip will not decode can send back something we can actually read.
/// Cropped on purpose: the strip region is all we need and it shows almost nothing of the game.
pub fn diagnose(app: &AppHandle) -> Result<String, String> {
    let w = find_wow().ok_or("No window titled \"World of Warcraft\" is open.")?;
    let img = w.capture_image().map_err(|e| format!("Capture failed: {e}"))?;
    let (iw, ih) = (img.width(), img.height());
    let crop = image::imageops::crop_imm(
        &img,
        0,
        0,
        (pixel::COLS * pixel::B + pixel::MAX_INSET).min(iw),
        (pixel::MAX_OFFSET + pixel::MAX_ROWS * pixel::B).min(ih),
    )
    .to_image();
    let found = match pixel::decode(&img) {
        Ok(payload) => format!("strip decoded ({} bytes)", payload.len()),
        Err(e) => format!("{e:?}"),
    };
    let dir = app.path().desktop_dir().map_err(|e| e.to_string())?;
    let path = dir.join("puginspect-diagnostic.png");
    crop.save(&path).map_err(|e| format!("Could not save {}: {e}", path.display()))?;
    Ok(format!("Window {iw}x{ih}, {found}. Saved {}", path.display()))
}

fn run(app: AppHandle) {
    let mut win: Option<Window> = None;
    let mut scanned = Instant::now() - RESCAN;
    let mut status = "";
    let mut last: Option<Frame> = None; // last emitted frame
    let mut hb: Option<u64> = None; // last hb seen, and when
    let mut fresh = Instant::now();

    let set_status = |status: &mut &'static str, last: &mut Option<Frame>, new| {
        if *status != new {
            *status = new;
            *last = None;
            let latest = app.state::<Latest>();
            *latest.0.lock().unwrap() = Snapshot { status: new, frame: None };
            let _ = app.emit("sync", SyncEvent::Status { status: new });
        }
    };

    loop {
        if app.state::<Rescan>().0.swap(false, Relaxed) {
            win = None;
        }
        if win.is_none() && scanned.elapsed() >= RESCAN {
            win = find_wow();
            scanned = Instant::now();
            hb = None;
            fresh = Instant::now();
        }
        let Some(w) = &win else {
            set_status(&mut status, &mut last, "no_window");
            thread::sleep(Duration::from_secs(1));
            continue;
        };
        // ponytail: a minimized window just yields no frames and turns "lost" after 5 s.
        let img = match w.is_minimized() {
            Ok(true) => None,
            _ => match w.capture_image() {
                Ok(img) => Some(img),
                Err(_) => {
                    win = None; // closed mid-capture; re-scan next tick
                    continue;
                }
            },
        };
        // ponytail: no crop — decode bounds-checks its own samples, so cropping is just a copy.
        let frame = match img.map(|i| pixel::decode(&i)) {
            Some(Ok(payload)) => match pixel::parse(&payload) {
                Ok(frame) => Some(frame),
                Err(e) => {
                    // The strip is intact but not in our shape: say which side to update.
                    let s = match e {
                        ParseErr::Version(v) if v < PROTOCOL => "addon_outdated",
                        ParseErr::Version(_) => "app_outdated",
                        ParseErr::Malformed => "incompatible",
                    };
                    set_status(&mut status, &mut last, s);
                    fresh = Instant::now();
                    None
                }
            },
            // A protocol 2 strip does not decode at all, so the version never reaches parse.
            Some(Err(DecodeErr::LegacyAddon)) => {
                set_status(&mut status, &mut last, "addon_outdated");
                fresh = Instant::now();
                None
            }
            _ => None,
        };
        if let Some(frame) = frame {
            if hb != Some(frame.hb) {
                hb = Some(frame.hb);
                fresh = Instant::now();
                set_status(&mut status, &mut last, "ok");
            }
            if last.as_ref().is_none_or(|l| Frame { hb: l.hb, ..frame.clone() } != *l) {
                app.state::<Latest>().0.lock().unwrap().frame = Some(frame.clone());
                let _ = app.emit("sync", SyncEvent::Data(frame.clone()));
                last = Some(frame);
            }
        }
        // ponytail: until a frame arrives the status stays unchanged; "lost" also covers
        // "window found but the addon never painted anything".
        if fresh.elapsed() > LOST_AFTER {
            set_status(&mut status, &mut last, "lost");
        }
        thread::sleep(Duration::from_millis(250));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn event_json_shapes() {
        let s = serde_json::to_string(&SyncEvent::Status { status: "lost" }).unwrap();
        assert_eq!(s, r#"{"kind":"status","status":"lost"}"#);
        let f = pixel::parse(&pixel::wire("5\t7\teu\tRavencrest\t12\t2516\tGo go\t1\tH\nPuggy-Draenor:D:8:640:9:14:1")).unwrap();
        let d = serde_json::to_string(&SyncEvent::Data(f)).unwrap();
        println!("{d}");
        assert_eq!(d, r#"{"kind":"data","hb":7,"region":"eu","realm":"Ravencrest","sessionId":12,"activityId":2516,"title":"Go go","total":1,"difficulty":"H","applicants":[{"name":"Puggy","realm":"Draenor","role":"D","classId":8,"ilvl":640,"group":9,"bestLevel":14,"bestTimed":true}]}"#);
    }
}
