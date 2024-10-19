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

function initDB() {
  const request = indexedDB.open(snoutDB.dbName, 1);

  request.onupgradeneeded = (event) => {
    snoutDB.db = (event.target as IDBOpenDBRequest).result;
    snoutDB.db.createObjectStore(snoutDB.storeName, { keyPath: "uniqueId" });
  };

  request.onsuccess = (event) => {
    snoutDB.db = (event.target as IDBOpenDBRequest).result;
    render();
  };

  request.onerror = (event) => {
    console.error("Database error:", (event.target as IDBOpenDBRequest).error);
  };
}

function initDeletedTasksDB() {
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

function addDeletedTask(taskUniqueID: number) {
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

function addTask(task: snoutApi.Task) {
  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readwrite");
  const store = transaction.objectStore(snoutDB.storeName);
  
  // Use store.put(task) without a key parameter
  store.put(task);
  
  transaction.oncomplete = () => {
    console.log("Task added");
  };

  transaction.onerror = (event: any) => {
    console.error("Error adding task:", (event.target as IDBTransaction).error);
  };
}

function deleteTask(taskUniqueID: number) {
  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readwrite");
  const store = transaction.objectStore(snoutDB.storeName);

  store.delete(taskUniqueID);

  transaction.oncomplete = () => {
    render();
    addDeletedTask(taskUniqueID);

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

  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readonly");
  const store = transaction.objectStore(snoutDB.storeName);
  const request = store.getAll();

  request.onsuccess = () => {
    const tasks: snoutApi.Task[] = request.result;
    let p_uniqueId = 0;

    for (const task of tasks) {
      if (task.uniqueId > p_uniqueId) {
        p_uniqueId = task.uniqueId;
      }
    }

    p_uniqueId += 1;

    const task: snoutApi.Task = {
      title: mainInputBox.value,
      description: secondaryInputBox.value,
      priority: parseInt(priorityDropdown.value),
      completed: false,
      dateAdded: new Date().toISOString(),
      uniqueId: p_uniqueId
    };

    addTask(task);
    render();
    snoutApi.updateGist(snoutDB);

    additionalFields.classList.remove('show');
    mainInputBox.value = '';
    secondaryInputBox.value = '';
    priorityDropdown.value = "-1";
  };

  request.onerror = (event) => {
    console.error("Error fetching tasks:", (event.target as IDBRequest).error);
  };
}

async function syncDB() {
  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readonly");
  const store = transaction.objectStore(snoutDB.storeName);
  
  const tasksLocal: snoutApi.Task[] = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Failed to fetch local tasks."));
  });

  const latestDateLocal: Date | null = tasksLocal.reduce<Date | null>((latest, task) => {
    const taskDate = new Date(task.dateAdded);
    return !latest || taskDate > latest ? taskDate : latest;
  }, null);

  const gistApiKey = snoutApi.getCookie('snoutGistId');
  if (!gistApiKey) return;

  const data: string | undefined = await snoutApi.fetchGistFile(gistApiKey, snoutDB.gistFilename);
  if (!data) return;

  const tasksOnline: snoutApi.Task[] = yaml.parse(data);
  
  const latestDateOnline: Date | null = tasksOnline.reduce<Date | null>((latest, task) => {
    const taskDate = new Date(task.dateAdded);
    return !latest || taskDate > latest ? taskDate : latest;
  }, null);

  const deletedTasksData: string | undefined = await snoutApi.fetchGistFile(gistApiKey, deletedTasksDB.gistFilename);
  if (!deletedTasksData) return;

  const deletedTasksOnline = yaml.parse(deletedTasksData);
  const deletedTasksSet = new Set(deletedTasksOnline);

  let deletedListUpdated = false;
  for (const deletedTaskId of deletedTasksData) {
    if (!deletedTasksSet.has(Number(deletedTaskId))) {
      deletedTasksSet.add(Number(deletedTaskId));
      deletedListUpdated = true;
    }
  }

  if (deletedListUpdated) {
    await snoutApi.updateGist(deletedTasksDB);
  }

  if (!latestDateLocal && !latestDateOnline) {
    render();
    return;
  }

  if (!latestDateLocal && latestDateOnline) {
    for (const task of tasksOnline) {
      await addTask(task); // Ensure error handling here as well
    }
    render();
    return;
  }

  if (latestDateLocal && !latestDateOnline) {
    await snoutApi.updateGist(snoutDB);
    return;
  }

  for (const task of tasksOnline) {
    const localTask = tasksLocal.find(taskLocal => taskLocal.uniqueId === task.uniqueId);

    if (localTask) {
      if (deletedTasksSet.has(task.uniqueId)) {
        try {
          await deleteTask(task.uniqueId);
        } catch (error) {
          console.error(`Failed to delete task ${task.uniqueId}:`, error);
        }
      } else {
        if (JSON.stringify(localTask) !== JSON.stringify(task)) {
          try {
            await addTask(task);
          } catch (error) {
            console.error(`Failed to add/update task ${task.uniqueId}:`, error);
          }
        }
      }
    }
  }

  let onlineNeedToUpdate = false;
  // Sync local tasks that are not online
  for (const localTask of tasksLocal) {
    if (!tasksOnline.find(task => task.uniqueId === localTask.uniqueId)) {
      onlineNeedToUpdate = true;
      break;
    }
  }

  if (onlineNeedToUpdate) {
    snoutApi.updateGist(snoutDB)
  }

  render();
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

addTaskButton?.addEventListener('click', addTaskButtonCallback);
document.addEventListener('DOMContentLoaded', async () => {
  // For debug purposes
  if (false) {
    deleteMainDB();
    deleteSecondaryDB();
  }

  initDB();
  initDeletedTasksDB();

  // Init timout because DB takes time to load
  setTimeout(syncDB, 1000);

  // Sync DB once 20 secs
  setInterval(syncDB, 20000);
});