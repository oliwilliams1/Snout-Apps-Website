const { invoke } = window.__TAURI__.core;

let greetInputEl;
let greetMsgEl;

async function setPosition(x, y) {
  try {
      await invoke('set_window_position');
      console.log(`Window position set to (${x}, ${y})`);
  } catch (error) {
      console.error("Error setting window position:", error);
  }
}

setPosition(0, 0);