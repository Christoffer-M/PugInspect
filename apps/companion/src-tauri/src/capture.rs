//! Captures the WoW window a few times a second, decodes the pixel strip and
//! pushes changes to the webview as `sync` events.
use crate::pixel::{self, Frame};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering::Relaxed};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use xcap::Window;

const RESCAN: Duration = Duration::from_secs(2);
const LOST_AFTER: Duration = Duration::from_secs(5);

/// Set by the `retry_sync` command to force an immediate window re-scan.
pub struct Rescan(pub AtomicBool);

#[derive(Serialize, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SyncEvent {
    Status { status: &'static str },
    Data(Frame),
}

pub fn spawn(app: AppHandle) {
    app.manage(Rescan(AtomicBool::new(false)));
    thread::spawn(move || run(app));
}

fn find_wow() -> Option<Window> {
    Window::all().ok()?.into_iter().find(|w| w.title().is_ok_and(|t| t == "World of Warcraft"))
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
        if let Some(frame) = img.and_then(|i| pixel::decode(&i).ok()).and_then(|p| pixel::parse(&p)) {
            if hb != Some(frame.hb) {
                hb = Some(frame.hb);
                fresh = Instant::now();
                set_status(&mut status, &mut last, "ok");
            }
            if last.as_ref().is_none_or(|l| Frame { hb: l.hb, ..frame.clone() } != *l) {
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
        let f = pixel::parse("1\t7\tEU\tRavencrest\t12\t2516\tGo go\t1\nPuggy-Draenor:MAGE:D:640:2500").unwrap();
        let d = serde_json::to_string(&SyncEvent::Data(f)).unwrap();
        println!("{d}");
        assert_eq!(d, r#"{"kind":"data","hb":7,"region":"EU","realm":"Ravencrest","sessionId":12,"activityId":2516,"title":"Go go","total":1,"applicants":[{"name":"Puggy","realm":"Draenor","class":"MAGE","role":"D","ilvl":640,"rio":2500}]}"#);
    }
}
