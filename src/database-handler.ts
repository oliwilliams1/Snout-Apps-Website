import Calendar from "color-calendar";
import "color-calendar/dist/css/theme-basic.css";
import yaml from 'yaml';
import * as snoutApi from './sync-tasks';

const mainInputBox = document.getElementById("mainInput") as HTMLInputElement;
const secondaryInputBox = document.getElementById("secondaryInput") as HTMLInputElement;
const priorityDropdown = document.getElementById("priorityList") as HTMLSelectElement;
const additionalFields = document.getElementById('additionalFields');
const addTaskButton = document.getElementById('addTask');
const priorityGlance = document.getElementById('priorityGlance');
const syncBar = document.getElementById('syncBar');
const syncButton = document.getElementById('syncButton');
const calendarSelectModal = document.getElementById('calendarSelectModal');
const selectDateButton = document.getElementById('selectDateButton');
const calandarModalSelectDateButton = document.getElementById('calandarModalSelectDateButton');

let taskUpdating : boolean = false;
let taskUpdatingId : number = -1;
let selectedDate : Date | null = null;
let readyToSync : boolean = true;

const snoutDB: snoutApi.SnoutDbData = {
  dbName: "TodoDB",
  storeName: "tasks",
  db: {} as IDBDatabase,
  gistFilename: 'todo.yaml'
};

const deletedTasksDB: snoutApi.SnoutDbData = {
  dbName: "DeletedTodoDB",
  storeName: "deletedTasks",
  db: {} as IDBDatabase,
  gistFilename: 'todo-deleted.yaml'
}

function render() {
  renderTasks();
  renderPriorityGlance();
}

function initPrimaryDB() {
  const request = indexedDB.open(snoutDB.dbName, 1);

  request.onupgradeneeded = (event) => {
    snoutDB.db = (event.target as IDBOpenDBRequest).result;
    snoutDB.db.createObjectStore(snoutDB.storeName, { keyPath: "uniqueId" });
  };

  request.onsuccess = (event) => {
    snoutDB.db = (event.target as IDBOpenDBRequest).result;
    render()
  };

  request.onerror = (event) => {
    console.error("Database error:", (event.target as IDBOpenDBRequest).error);
  };
}

function initSecondaryDB() {
  const request = indexedDB.open(deletedTasksDB.dbName, 1);

  request.onupgradeneeded = (event) => {
    deletedTasksDB.db = (event.target as IDBOpenDBRequest).result;
    deletedTasksDB.db.createObjectStore(deletedTasksDB.storeName, { keyPath: "id" });
  };

  request.onsuccess = (event) => {
    deletedTasksDB.db = (event.target as IDBOpenDBRequest).result;
  };

  request.onerror = (event) => {
    console.error("Database error:", (event.target as IDBOpenDBRequest).error);
  };
}

function addDeletedTaskID(taskUniqueID: number) {
  const transaction = deletedTasksDB.db.transaction([deletedTasksDB.storeName], "readwrite");
  const store = transaction.objectStore(deletedTasksDB.storeName);
  
  store.put({ id: taskUniqueID });

  transaction.oncomplete = () => {
    console.log("Deleted task ID added:", taskUniqueID);
  };

  transaction.onerror = (event) => {
    console.error("Error adding deleted task ID:", (event.target as IDBTransaction).error);
  };
}

function maxSet(set: Set<number>) : number {
  if (set.size  === 0) {
    return 0;
  }
  return Math.max(...set);
}

async function maxUniqueID_DB() : Promise<number> {
  const data : snoutApi.Task[] = await getPrimaryDB();
  let max : number = 0;

  for (const task of data) {
    if (task.uniqueId > max) {
      max = task.uniqueId;
    }
  }

  return max;
}

async function addTask(task: snoutApi.Task) {
  const transactionDeleted = deletedTasksDB.db.transaction([deletedTasksDB.storeName], "readonly");
  const storeDeleted = transactionDeleted.objectStore(deletedTasksDB.storeName);

  const deletedTasksLocal: number[] = await new Promise((resolve, reject) => {
    const request = storeDeleted.getAll();
    request.onsuccess = () => resolve(request.result.map(task => task.id));
    request.onerror = () => reject(new Error("Failed to fetch local tasks."));
  });

  const deletedTasksSet = new Set(deletedTasksLocal);
  
  const maxUniqueIdDeletedDB = maxSet(deletedTasksSet);
  const maxUniqueIdLocalDB = await maxUniqueID_DB();

  let p_uniqueId = 0;

  if (maxUniqueIdDeletedDB > maxUniqueIdLocalDB) {
    p_uniqueId = maxUniqueIdDeletedDB + 1;
  } else {
    p_uniqueId = maxUniqueIdLocalDB + 1;
  }

  task.uniqueId = p_uniqueId;
  
  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readwrite");
  const store = transaction.objectStore(snoutDB.storeName);

  store.put(task);

  transaction.oncomplete = async () => {
    console.log("Task added\n", "Task: ", task);
    render();
    readyToSync = false;
    await snoutApi.updateGist(snoutDB);
    delay(1000).then(() => readyToSync = true);
  };

  transaction.onerror = (event) => {
    console.error("Error adding task:", (event.target as IDBTransaction).error);
  };
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deleteTask(taskUniqueID: number) {
  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readwrite");
  const store = transaction.objectStore(snoutDB.storeName);

  store.delete(taskUniqueID);

  render();
  transaction.oncomplete = async () => {
    addDeletedTaskID(taskUniqueID);
    
    await snoutApi.updateGist(deletedTasksDB);

    await delay(1000);

    await snoutApi.updateGist(snoutDB);
  };

  transaction.onerror = (event: any) => {
    console.error("Error deleting task:", (event.target as IDBTransaction).error);
  };
}

async function updateTask(updatedTask: snoutApi.Task) {
  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readwrite");
  const store = transaction.objectStore(snoutDB.storeName);
  
  const existingTaskRequest = store.get(updatedTask.uniqueId);

  existingTaskRequest.onsuccess = async (event) => {
    const target = event.target as IDBRequest;
    const existingTask = target.result;

      if (!existingTask) {
          console.error("Task not found for update:", updatedTask.uniqueId);
          return;
      }
      
      const dateOfLocalDB = new Date(existingTask.dateAdded);
      const dateOfUpdatedTask = new Date(updatedTask.dateAdded);

      const newTask = dateOfLocalDB.getTime() < dateOfUpdatedTask.getTime() ? updatedTask : existingTask;

      const updateRequest = store.put(newTask);

      updateRequest.onsuccess = async () => {
          console.log("Task updated\n", "Updated Task: ", newTask);
          render();
          readyToSync = false;
          await snoutApi.updateGist(snoutDB);
          await delay(1000);
          readyToSync = true;
      };

      updateRequest.onerror = (event) => {
          console.error("Error updating task:", (event.target as IDBRequest).error);
      };
  };

  existingTaskRequest.onerror = (event) => {
      console.error("Error fetching existing task:", (event.target as IDBRequest).error);
  };
}

function renderPriorityGlance() {
  if (priorityGlance === null) return;

  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readonly");
  const store = transaction.objectStore(snoutDB.storeName);
  const request = store.getAll();

  request.onsuccess = () => {
    const tasks: snoutApi.Task[] = request.result;
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
  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readonly");
  const store = transaction.objectStore(snoutDB.storeName);
  const request = store.getAll();

  request.onsuccess = () => {
    const tasks: snoutApi.Task[] = request.result;
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
              <input type="checkbox" ${task.completed ? "checked" : ""} class="w-5 h-6 mr-4 rounded" id="task-checkbox-${task.uniqueId}">
              <div>
                <h1 class="text-lg font-semibold text-snout-bright">${task.completed ? "<s>" + task.title + "</s>" : task.title}</h1>
                ${task.description ? `<h2 class="text-xs font-extralight text-snout-bright">${task.completed ? "<s>" + task.description + "</s>" : task.description}</h2>` : ""}
              </div>
            </div>
            <div class="flex w-8 h-8 gap-1 ml-auto mr-3 cursor-pointer bg-snout-deep rounded-full justify-center items-center" id="task-options-${task.uniqueId}">
              <div class="hidden absolute mt-24 w-16 rounded-lg bg-snout-deep shadow-lg" id="task-option-menu-${task.uniqueId}">
                <button class="w-full h-8 rounded-lg text-snout-light hover:bg-blue-600 transition duration-200" id="edit-button-${task.uniqueId}">Edit</button>
                <button class="w-full h-8 rounded-lg text-snout-light hover:bg-red-600 transition duration-200" id="delete-button-${task.uniqueId}">&times;</button>
              </div>
              <div class="w-[5px] h-[5px] rounded-full bg-snout-bright"></div>
              <div class="w-[5px] h-[5px] rounded-full bg-snout-bright"></div>
              <div class="w-[5px] h-[5px] rounded-full bg-snout-bright"></div>
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
        document.getElementById(`task-options-${task.uniqueId}`)?.addEventListener('click', function() {
          document.getElementById(`task-option-menu-${task.uniqueId}`)?.classList.toggle('hidden');
        })

        document.getElementById(`edit-button-${task.uniqueId}`)?.addEventListener('click', function() {
          console.log("Editing task: ", task.uniqueId);
          updateTaskButtonCallback(task);
        })

        document.getElementById(`delete-button-${task.uniqueId}`)?.addEventListener('click', function() {
          deleteTask(task.uniqueId);
        });

        const checkbox = document.getElementById(`task-checkbox-${task.uniqueId}`) as HTMLInputElement | null;
        checkbox?.addEventListener('change', function() {
          if (checkbox) {
            task.completed = checkbox.checked;
            task.dateAdded = new Date().toISOString();
            updateTask(task);
          }
      });
      }
    }
  };
}

function addTaskButtonCallback() {
  if (!additionalFields) {
    console.log("Additional fields element not found");
    return;
  }

  if (mainInputBox.value.trim() === '' || priorityDropdown.value === "-1") {
    console.log("Fields are empty");
    return;
  }

  const date = new Date().toISOString();

  const task: snoutApi.Task = {
    title: mainInputBox.value,
    description: secondaryInputBox.value,
    priority: parseInt(priorityDropdown.value),
    completed: false,
    dateDueBool: (selectedDate != null),
    dateDue: (selectedDate != null) ? selectedDate.toISOString() : date,
    dateAdded: date,
    uniqueId: -1
  };

  if (taskUpdating === true) {
    task.uniqueId = taskUpdatingId;
    updateTask(task);
    console.log("Task updated: ", task);
    taskUpdating = false;
  } else {
    addTask(task);
    console.log("Task added: ", task);
  }

  additionalFields.classList.remove('show');
  mainInputBox.value = "";
  secondaryInputBox.value = "";
  priorityDropdown.value = "-1";
}

function updateTaskButtonCallback(task : snoutApi.Task) {
  if (!additionalFields) {
    console.log("Additional fields element not found");
    return;
  }

  taskUpdating = true;
  taskUpdatingId = task.uniqueId;

  additionalFields.classList.add('show');

  mainInputBox.value = task.title;
  secondaryInputBox.value = task.description;
  priorityDropdown.value = task.priority.toString();
}

function selectDateButtonCallback() {
  calendarSelectModal?.classList.remove('hidden');
}

function setSelectedDateCallback(calendarInstance : Calendar) {
  const p_selectedDate = calendarInstance?.getSelectedDate();
  if (p_selectedDate) {
    console.log("Date selected: ", p_selectedDate);
    selectedDate = p_selectedDate;
    if (selectDateButton) {
      selectDateButton.innerHTML = "Selected Date: " + selectedDate.toISOString().split('T')[0];
    }
    calendarSelectModal?.classList.add('hidden');
  }
}

function deleteMainDB() {
  const request = indexedDB.deleteDatabase(snoutDB.dbName);

  request.onsuccess = () => {
    console.log(`Database ${snoutDB.dbName} deleted successfully.`);
    snoutDB.db = {} as IDBDatabase;
    render();
  };

  request.onerror = (event) => {
    console.error("Error deleting database:", (event.target as IDBRequest).error);
  };

  request.onblocked = () => {
    console.warn("Database deletion blocked. Close all open connections and try again.");
  };
}

function deleteSecondaryDB() {
  const request = indexedDB.deleteDatabase(deletedTasksDB.dbName);

  request.onsuccess = () => {
    console.log(`Database ${deletedTasksDB.dbName} deleted successfully.`);
    deletedTasksDB.db = {} as IDBDatabase;
    render();
  };

  request.onerror = (event) => {
    console.error("Error deleting database:", (event.target as IDBRequest).error);
  }
  request.onblocked = () => {
    console.warn("Database deletion blocked. Close all open connections and try again.");
  }
}

async function getPrimaryDB() : Promise<snoutApi.Task[]> {
  const transaction = snoutDB.db.transaction(snoutDB.storeName, "readonly");
  const store = transaction.objectStore(snoutDB.storeName);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Failed to fetch tasks."));
  });
}

async function getSecondaryDB() {
  const transaction = deletedTasksDB.db.transaction(deletedTasksDB.storeName, "readonly");
  const store = transaction.objectStore(deletedTasksDB.storeName);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Failed to fetch deleted tasks."));
  });
}

async function syncDeletedIDs (deletedIDsLocal: number[], deletedIDsOnline: number[]) : Promise<number[]> {
  let needsUpdate = false;

  for (const onlineID of deletedIDsOnline) {
    if (!deletedIDsLocal.includes(onlineID)) {
      deleteTask(onlineID);
    }
  }

  for (const localID of deletedIDsLocal) {
    if (!deletedIDsOnline.includes(localID)) {
      needsUpdate = true;
    }
  }

  if (needsUpdate) {
    await snoutApi.updateGist(deletedTasksDB);

    const secondaryDB : any = await getSecondaryDB();
    let deletedIDsLocalArray : number[] = [];

    for (const deletedID of secondaryDB) {
      deletedIDsLocalArray.push(deletedID.id);
    }
    return deletedIDsLocalArray;
  } else {
    return deletedIDsLocal;
  }
}

async function syncTasks(tasksOnline: snoutApi.Task[], tasksLocal: snoutApi.Task[], deletedIDs: number[]) {
  const deletedIDsSet = new Set(deletedIDs);
  let overallChanges = false;

  // Check for tasks to delete from local database
  for (const localTask of tasksLocal) {
    if (deletedIDsSet.has(localTask.uniqueId)) {
      console.log(`Deleting task with ID ${localTask.uniqueId} from local storage`);
      await deleteTask(localTask.uniqueId); // Implement this function to handle deletion
      overallChanges = true;
    }
  }

  // Check for tasks to add from online to local database
  const localTasksIDsSet = new Set(tasksLocal.map(task => task.uniqueId));
  for (const onlineTask of tasksOnline) {
    if (!localTasksIDsSet.has(onlineTask.uniqueId)) {
      console.log(`Adding task with ID ${onlineTask.uniqueId} to local storage`);
      await addTask(onlineTask);
      overallChanges = true;
    }
  }

  for (const localTask of tasksLocal) {
    const onlineTask = tasksOnline.find(task => task.uniqueId === localTask.uniqueId);
    if (onlineTask && JSON.stringify(localTask) !== JSON.stringify(onlineTask)) {
      console.log(`Updating task with ID ${localTask.uniqueId} in database`);
      await updateTask(onlineTask);
      overallChanges = true;
    }
  }

  if (overallChanges) {
    console.log("Syncing tasks online");
    await snoutApi.updateGist(snoutDB);
  }
}

async function sync() {
  syncBar?.classList.remove('hidden');
  readyToSync = false;

  const gistApiKey = snoutApi.getCookie('snoutGistId');
  if (!gistApiKey) return;

  const deletedTasksData : string | undefined = await snoutApi.fetchGistFile(gistApiKey, deletedTasksDB.gistFilename);
  if (!deletedTasksData) return;

  const taskDataOnline : string | undefined = await snoutApi.fetchGistFile(gistApiKey, snoutDB.gistFilename);
  if (!taskDataOnline) return;

  const deletedIDsOnline = yaml.parse(deletedTasksData);
  const deletedIDsLocal : any = await getSecondaryDB();

  let deletedIDsOnlineArray : number[] = [];

  for (const deletedID of deletedIDsOnline) {
    deletedIDsOnlineArray.push(deletedID.id);
  }

  let deletedIDsLocalArray : number[] = [];

  for (const deletedID of deletedIDsLocal) {
    deletedIDsLocalArray.push(deletedID.id);
  }

  const tasksOnline: snoutApi.Task[] = yaml.parse(taskDataOnline);
  const primaryDB : snoutApi.Task[] = await getPrimaryDB();

  const deletedIDs = await syncDeletedIDs(deletedIDsLocalArray, deletedIDsOnlineArray);

  await syncTasks(tasksOnline, primaryDB, deletedIDs);

  await render();

  delay(1000).then(() => {
    readyToSync = true;
    syncBar?.classList.add('hidden');
  });
}

async function clearGistData() {
  if (!snoutApi.gistId) {
    console.warn("Error clearning gist data: Gist ID not found.");
    return;
  }
  await snoutApi.updateGistContent(snoutApi.gistId, deletedTasksDB.gistFilename, '[]');
  await delay(1000);
  await snoutApi.updateGistContent(snoutApi.gistId, snoutDB.gistFilename, '[]');
}

document.addEventListener('DOMContentLoaded', () => {
  if (false) {
    console.warn("Debug mode: deleting all databases");
    deleteMainDB();
    deleteSecondaryDB();
    console.log("Application quitted, all databases deleted");
    return;
  }

  if (false) {
    console.warn("Debug mode: deleting all databases");
    clearGistData();
    console.log("Application quitted, all databases cleared");
    return;
  }

  initPrimaryDB();
  initSecondaryDB();
  
  mainInputBox.addEventListener('focus', function() {
    if (additionalFields) {
      additionalFields.classList.add('show');
    }
  });

  const calendarInstance = new Calendar();

  syncButton?.addEventListener('click', sync);

  addTaskButton?.addEventListener('click', addTaskButtonCallback);

  selectDateButton?.addEventListener('click', selectDateButtonCallback);

  calandarModalSelectDateButton?.addEventListener('click', () => {setSelectedDateCallback(calendarInstance)});
  // setTimeout(sync, 1000);

  setInterval(() => {
    if (readyToSync) sync(); else console.log("Sync is not ready yet, waiting for next iteration...");
  }, 60000);
});