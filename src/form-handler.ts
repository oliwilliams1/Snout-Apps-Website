const mainInputBox = document.getElementById("mainInput") as HTMLInputElement;
const secondaryInputBox = document.getElementById("secondaryInput") as HTMLInputElement;
const priorityDropdown = document.getElementById("priorityList") as HTMLSelectElement;
const additionalFields = document.getElementById('additionalFields');
const addTaskButton = document.getElementById('addTask');
const priorityGlance = document.getElementById('priorityGlance');

interface Task {
  title: string;
  description: string;
  priority: number;
  completed: boolean;
}

const dbName = "TodoDB";
const storeName = "tasks";
let db: IDBDatabase;

function render() {
  renderTasks();
  renderPriorityGlance();
}

function initDB() {
  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = (event) => {
    db = (event.target as IDBOpenDBRequest).result;
    db.createObjectStore(storeName, { keyPath: "title" });
  };

  request.onsuccess = (event) => {
    db = (event.target as IDBOpenDBRequest).result;
    render();
  };

  request.onerror = (event) => {
    console.error("Database error:", (event.target as IDBOpenDBRequest).error);
  };
}

function addTask(task: Task) {
  const transaction = db.transaction([storeName], "readwrite");
  const store = transaction.objectStore(storeName);
  
  store.put(task);
  
  transaction.oncomplete = () => {
    console.log("Task added");
    render();
  };

  transaction.onerror = (event) => {
    console.error("Error adding task:", (event.target as IDBTransaction).error);
  };
}

function deleteTask(taskName: string) {
  const transaction = db.transaction([storeName], "readwrite");
  const store = transaction.objectStore(storeName);

  store.delete(taskName);

  transaction.oncomplete = () => {
    render();
  };

  transaction.onerror = (event) => {
    console.error("Error deleting task:", (event.target as IDBTransaction).error);
  };
}

function renderPriorityGlance() {
  if (priorityGlance === null) return;

  const transaction = db.transaction([storeName], "readonly");
  const store = transaction.objectStore(storeName);
  const request = store.getAll();

  request.onsuccess = () => {
    const tasks: Task[] = request.result;
    let lowPriorityCount = 0;
    let mediumPriorityCount = 0;
    let highPriorityCount = 0;

    for (const task of tasks) {
      switch (task.priority) {
        case 1:
          highPriorityCount++;
          break;
        case 2:
          mediumPriorityCount++;
          break;
        case 3:
          lowPriorityCount++;
          break;
      }
    }

    priorityGlance.innerHTML = `
    <div class="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
      <p class="text-snout-base">${lowPriorityCount}</p>
    </div>
    <div class="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
      <p class="text-snout-base">${mediumPriorityCount}</p>
    </div>
    <div class="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center">
      <p class="text-snout-base">${highPriorityCount}</p>
    </div>`;
  };
}

function renderTasks() {
  const transaction = db.transaction([storeName], "readonly");
  const store = transaction.objectStore(storeName);
  const request = store.getAll();

  request.onsuccess = () => {
    const tasks: Task[] = request.result;
    tasks.sort((a, b) => a.priority - b.priority);

    const priorityTaskContainer = document.getElementById('priorityTaskContainer');
    const nonPriorityTaskContainer = document.getElementById('nonPriorityTaskContainer');
    let priorityTaskContainerInnerHTML = "";
    let nonPriorityTaskContainerInnerHTML = "";

    if (priorityTaskContainer && nonPriorityTaskContainer) {
      for (const task of tasks) {
        let priorityColour = "colour-no-priority";
        switch (task.priority) {
          case 1:
            priorityColour = "colour-high-priority";
            break;
          case 2:
            priorityColour = "colour-medium-priority";
            break;
          case 3:
            priorityColour = "colour-low-priority";
            break;
        }

        const html = `
          <div class="flex w-full items-center">
            <div class="rounded-full ${priorityColour} w-1 h-10"></div>
            <div class="flex flex-row items-center ml-4">
              <input type="checkbox" ${task.completed ? "checked" : ""} class="w-5 h-6 mr-4 rounded">
              <div>
                <h1 class="text-lg font-semibold text-snout-bright">${task.title}</h1>
                ${task.description ? `<h2 class="text-xs font-extralight text-snout-light">${task.description}</h2>` : ""}
              </div>
            </div>
            <button id="delete-button-${task.title}">x</button>
            <div class="flex gap-1 ml-auto mr-3">
              <div class="w-1.5 h-1.5 rounded-full bg-snout-bright"></div>
              <div class="w-1.5 h-1.5 rounded-full bg-snout-bright"></div>
              <div class="w-1.5 h-1.5 rounded-full bg-snout-bright"></div>
            </div>
          </div><br>
        `;

        if (task.priority !== 4) {
          priorityTaskContainerInnerHTML += html;
        } else {
          nonPriorityTaskContainerInnerHTML += html;
        }
      }

      priorityTaskContainer.innerHTML = priorityTaskContainerInnerHTML;
      nonPriorityTaskContainer.innerHTML = nonPriorityTaskContainerInnerHTML;

      for (const task of tasks) {
        document.getElementById(`delete-button-${task.title}`)?.addEventListener('click', function() {
          deleteTask(task.title);
        });
      }
    }
  };
}

mainInputBox?.addEventListener('focus', function() {
  if (additionalFields) {
    additionalFields.classList.add('show');
  }
});

function addTaskButtonCallback() {
  if (!additionalFields) {
    return;
  }

  if (mainInputBox.value.trim() === '' || priorityDropdown.value === "-1") {
    return;
  }

  const task: Task = {
    title: mainInputBox.value,
    description: secondaryInputBox.value,
    priority: parseInt(priorityDropdown.value),
    completed: false
  };

  addTask(task);
  additionalFields.classList.remove('show');
  mainInputBox.value = '';
  secondaryInputBox.value = '';
  priorityDropdown.value = "-1";
}

document.addEventListener('DOMContentLoaded', initDB);
addTaskButton?.addEventListener('click', addTaskButtonCallback);