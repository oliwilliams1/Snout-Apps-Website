// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{Manager, Window};
use device_query::{DeviceQuery, DeviceState};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[tauri::command]
fn set_window_position(window: Window) {
    let device_state = DeviceState::new();
    let mouse_position = device_state.get_mouse().coords;
    window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(mouse_position.0, mouse_position.1))).unwrap();
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, set_window_position])
        .setup(|app| {
            let main_window = app.get_window("main").unwrap();
            main_window.set_title("My Tauri App")?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}