// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{Manager, Window};
use device_query::{DeviceQuery, DeviceState};

#[tauri::command]
fn set_window_position(window: Window) {
    let size = window.inner_size().unwrap();
    let half_width: i32 = (size.width / 2).try_into().unwrap();

    let device_state = DeviceState::new();
    let mouse_position = device_state.get_mouse().coords;
    window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(
        mouse_position.0 - half_width,
        mouse_position.1 - 25,
    ))).unwrap();
}

#[tauri::command]
fn close_window(window: Window) {
    window.close().unwrap();
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_window_position, close_window])
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            main_window.set_title("My Tauri App")?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}