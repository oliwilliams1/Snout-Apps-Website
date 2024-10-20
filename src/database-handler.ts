import yaml from 'yaml';
import * as snoutApi from './sync-tasks';

const mainInputBox = document.getElementById("mainInput") as HTMLInputElement;
const secondaryInputBox = document.getElementById("secondaryInput") as HTMLInputElement;
const priorityDropdown = document.getElementById("priorityList") as HTMLSelectElement;
const additionalFields = document.getElementById('additionalFields');
const addTaskButton = document.getElementById('addTask');
const priorityGlance = document.getElementById('priorityGlance');

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
  
  store.add(taskUniqueID);

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
  console.log("Deleted tasks set:", deletedTasksSet);
  
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

  transaction.oncomplete = () => {
    console.log("Task added");
    console.log(task);
    render();
    snoutApi.updateGist(snoutDB);
  };

  transaction.onerror = (event) => {
    console.error("Error adding task:", (event.target as IDBTransaction).error);
  };
}

function deleteTask(taskUniqueID: number) {
  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readwrite");
  const store = transaction.objectStore(snoutDB.storeName);

  store.delete(taskUniqueID);

  transaction.oncomplete = () => {
    render();
    addDeletedTaskID(taskUniqueID);

    snoutApi.updateGist(deletedTasksDB);

    console.log("Task deleted:", taskUniqueID);
    snoutApi.updateGist(snoutDB);
  };

  transaction.onerror = (event: any) => {
    console.error("Error deleting task:", (event.target as IDBTransaction).error);
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
              <input type="checkbox" ${task.completed ? "checked" : ""} class="w-5 h-6 mr-4 rounded">
              <div>
                <h1 class="text-lg font-semibold text-snout-bright">${task.title}</h1>
                ${task.description ? `<h2 class="text-xs font-extralight text-snout-light">${task.description}</h2>` : ""}
              </div>
            </div>
            <div class="flex w-8 h-8 gap-1 ml-auto mr-3 cursor-pointer bg-snout-deep rounded-full justify-center items-center" id="task-options-${task.uniqueId}">
              <div class="hidden absolute mt-20 w-16 rounded-lg" id="task-option-menu-${task.uniqueId}">
                <button class="w-full h-8 rounded-lg bg-snout-deep text-snout-light" id="delete-button-${task.uniqueId}">x</button>
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

        document.getElementById(`delete-button-${task.uniqueId}`)?.addEventListener('click', function() {
          deleteTask(task.uniqueId);
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

  const task: snoutApi.Task = {
    title: mainInputBox.value,
    description: secondaryInputBox.value,
    priority: parseInt(priorityDropdown.value),
    completed: false,
    dateAdded: new Date().toISOString(),
    uniqueId: -1
  };

  addTask(task);

  additionalFields.classList.remove('show');
  mainInputBox.value = "";
  secondaryInputBox.value = "";
  priorityDropdown.value = "-1";
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

async function getSecondaryDB() : Promise<number[]> {
  const transaction = deletedTasksDB.db.transaction(deletedTasksDB.storeName, "readonly");
  const store = transaction.objectStore(deletedTasksDB.storeName);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Failed to fetch deleted tasks."));
  });
}

async function syncDeletedIDs (deletedIDsLocal: number[], deletedIDsOnline: number[]) : Promise<number[]> {
  const deletedIDsLocalSet = new Set(deletedIDsLocal);
  let overallChanges = false;

  console.log(deletedIDsLocalSet);
  // Check for tasks to add to local database
  for (const onlineID of deletedIDsOnline) {
    if (deletedIDsLocalSet.has(onlineID)) {
      console.log(`Adding ${onlineID} to local database`);
      addDeletedTaskID(onlineID);
      overallChanges = true;
    }
  }

  // Check for tasks to delete from online
  let onlineNeedsToSync = false;
  for (const localID of deletedIDsLocal) {
    if (!deletedIDsOnline.includes(localID)) {
      onlineNeedsToSync = true;
      overallChanges = true;
      break;
    }
  }

  if (onlineNeedsToSync) {
    console.log("Syncing deleted tasks online");
    snoutApi.updateGist(deletedTasksDB);
  }

  if (overallChanges) {
    return await getSecondaryDB();
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

  if (overallChanges) {
    console.log("Syncing tasks online");
    await snoutApi.updateGist(snoutDB);
  }
}


async function sync() {
  const gistApiKey = snoutApi.getCookie('snoutGistId');
  if (!gistApiKey) return;

  const deletedTasksData : string | undefined = await snoutApi.fetchGistFile(gistApiKey, deletedTasksDB.gistFilename);
  if (!deletedTasksData) return;

  const taskDataPnline : string | undefined = await snoutApi.fetchGistFile(gistApiKey, snoutDB.gistFilename);
  if (!taskDataPnline) return;

  const deletedIDsOnline : number[] = yaml.parse(deletedTasksData);
  const deletedIDsLocal : number[] = await getSecondaryDB();

  const tasksOnline: snoutApi.Task[] = yaml.parse(taskDataPnline);
  const primaryDB : snoutApi.Task[] = await getPrimaryDB();

  const deletedIDs = await syncDeletedIDs(deletedIDsLocal, deletedIDsOnline);

  await syncTasks(tasksOnline, primaryDB, deletedIDs);

  render();

  console.log("Max unique ID:", maxUniqueID_DB());
}

document.addEventListener('DOMContentLoaded', () => {
  if (false) {
    console.warn("Debug mode: deleting all databases");
    deleteMainDB();
    deleteSecondaryDB();
  }

  initPrimaryDB();
  initSecondaryDB();
  
  mainInputBox.addEventListener('focus', function() {
    if (additionalFields) {
      additionalFields.classList.add('show');
    }
  });

  addTaskButton?.addEventListener('click', addTaskButtonCallback);

  setTimeout(sync, 1000);

  setInterval(sync, 30000);
});