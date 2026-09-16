mod capture;
mod pixel;

use std::sync::atomic::Ordering::Relaxed;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_autostart::MacosLauncher;

fn show(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[tauri::command]
fn retry_sync(rescan: tauri::State<capture::Rescan>) {
    rescan.0.store(true, Relaxed);
}

#[tauri::command]
fn quit(app: AppHandle) {
    app.exit(0);
}

/// Writes a cropped capture of the strip region to the desktop and says what decoded there.
#[tauri::command]
fn diagnose(app: AppHandle) -> Result<String, String> {
    capture::diagnose(&app)
}

/// Opt-in alternative to handing the URL to the default browser, which spawns a fresh
/// tab per click: one reusable window we navigate ourselves. The label is fixed, so the
/// second click reuses the window the first one built.
#[tauri::command]
fn open_in_app(app: AppHandle, url: String) -> Result<(), String> {
    let url = viewer_url(&url)?;
    if let Some(w) = app.get_webview_window("viewer") {
        w.navigate(url).map_err(|e| e.to_string())?;
        let _ = w.unminimize();
        let _ = w.set_focus();
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, "viewer", WebviewUrl::External(url))
        .title("PugInspect")
        .inner_size(1100.0, 820.0)
        .min_inner_size(700.0, 500.0)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// The viewer window gets no capabilities (the default one is scoped to "main"), but it is
/// still our frame around someone else's page - only ever point it at our own site.
fn viewer_url(url: &str) -> Result<Url, String> {
    let url: Url = url.parse().map_err(|_| "not a url".to_string())?;
    if url.scheme() != "https" || url.host_str() != Some("puginspect.com") {
        return Err("refusing to open a non-PugInspect url".into());
    }
    Ok(url)
}

/// Current status + frame, for a webview that mounted after the events were emitted.
#[tauri::command]
fn sync_snapshot(latest: tauri::State<capture::Latest>) -> capture::Snapshot {
    latest.0.lock().unwrap().clone()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be the first plugin: a second launch hands off to the running instance and exits.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show(app)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![retry_sync, sync_snapshot, quit, diagnose, open_in_app])
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&Menu::with_items(app, &[&show_item, &quit_item])?)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "show" => show(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                        show(tray.app_handle());
                    }
                })
                .build(app)?;
            capture::spawn(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::viewer_url;

    #[test]
    fn viewer_url_only_accepts_our_own_site() {
        assert!(viewer_url("https://puginspect.com/eu/draenor/puggy").is_ok());
        for bad in [
            "http://puginspect.com/eu/draenor/puggy",   // plaintext
            "https://puginspect.com.evil.io/eu",        // suffix, not our host
            "https://evil.io/#https://puginspect.com",  // our host only in the fragment
            "file:///C:/Windows/System32",
            "javascript:alert(1)",
            "not a url",
        ] {
            assert!(viewer_url(bad).is_err(), "{bad} should be refused");
        }
    }
}
