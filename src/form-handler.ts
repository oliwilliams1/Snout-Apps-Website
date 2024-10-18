import * as yaml from 'yaml';

const mainInputBox = document.getElementById("mainInput") as HTMLInputElement;
const secondaryInputBox = document.getElementById("secondaryInput") as HTMLInputElement;
const priorityDropdown = document.getElementById("priorityList") as HTMLSelectElement;
const additionalFields = document.getElementById('additionalFields');
const addTaskButton = document.getElementById('addTask');

interface Task {
  title: string;
  description: string;
  priority: number;
}

function renderTasks() {
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
}

mainInputBox?.addEventListener('focus', function() {
  if (additionalFields) {
    additionalFields.classList.add('show');
  }
});

async function addTask(task : Task) : Promise<void> {
  const data = yaml.parse(localStorage.getItem("todo.yaml")!);
  data.tasks.push(task);
  localStorage.setItem("todo.yaml", yaml.stringify(data));
  renderTasks();
}

function addTaskButtonCallback() {
  if (!additionalFields) {
    return;
  }

  if (mainInputBox.value.trim() === '' || secondaryInputBox.value.trim() === '' || priorityDropdown.value === "-1") {
    return;
  }

  const task : Task = {
    title: mainInputBox.value,
    description: secondaryInputBox.value,
    priority: parseInt(priorityDropdown.value)
  }

  addTask(task);

  additionalFields.classList.remove('show');
  mainInputBox.value = '';
  secondaryInputBox.value = '';
  priorityDropdown.value = "-1";
}

document.addEventListener('DOMContentLoaded', renderTasks);
addTaskButton?.addEventListener('click', addTaskButtonCallback);