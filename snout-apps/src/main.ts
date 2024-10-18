import { invoke } from "@tauri-apps/api/core";

async function setPosition() : Promise<void> {
  try {
    await invoke('set_window_position');
  } catch (error) {
    console.error("Error setting window position:", error);
  }
}

async function closeWindow() : Promise<void> {
  try {
    await invoke('close_window');
  } catch (error) {
    console.error("Error closing window:", error);
  }
}

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.code === 'KeyD') {
    setPosition();
  }
  if ((event.ctrlKey && event.shiftKey && event.code === 'KeyA') || (event.ctrlKey && event.code === 'KeyW')) {
    closeWindow();
  }
});