import { invoke } from "@tauri-apps/api/core";
import * as yaml from 'yaml';

async function setPosition(): Promise<void> {
  try {
    await invoke('set_window_position');
  } catch (error) {
    console.error("Error setting window position:", error);
  }
}

async function closeWindow(): Promise<void> {
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

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem("todo.yaml") === null) {
    localStorage.setItem("todo.yaml", `
tasks:
  - task: 
    title: "Task one"
    description: "Task one description"
    completed: 0
  `);
  }
  
  const data = yaml.parse(localStorage.getItem("todo.yaml")!);
  
  const container = document.getElementById('listContainer')!
  let containerInnerHTML : string= "";

  if (container) {
    for (const task of data.tasks) {
      containerInnerHTML += `
        <div class="flex w-full items-center">
          <div class="rounded-full bg-red-400 w-1 h-10"></div>
          <div class="flex flex-row items-center ml-4">
            <input type="checkbox" ${task.completed ? "checked" : ""} class="w-5 h-6 mr-4 rounded">
            <div>
              <h1 class="text-lg font-semibold text-snout-bright">${task.title}</h1>
              <h2 class="text-xs font-extralight text-snout-light">${task.description}</h2>
            </div>
          </div>
          <div class="flex gap-1 ml-auto mr-3">
            <div class="w-1.5 h-1.5 rounded-full bg-snout-bright"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-snout-bright"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-snout-bright"></div>
          </div>
        </div> <br>
      `;
    }

    container.innerHTML = containerInnerHTML;
    console.log(data);
  } else {
    console.error("Container not found");
  }
});

const mainInputBox = document.getElementById("mainInput");
const additionalFields = document.getElementById('additionalFields');
const addTaskButton = document.getElementById('addTask');

mainInputBox?.addEventListener('focus', function() {
  console.log('Input field is in focus');
  if (additionalFields) {
    additionalFields.classList.add('show');
  }
});

function addTask() {
  if (additionalFields) {
    additionalFields.classList.remove('show');
  }
}

addTaskButton?.addEventListener('click', addTask);