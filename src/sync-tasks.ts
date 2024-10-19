import yaml from 'yaml';

export interface Task {
  title: string;
  description: string;
  priority: number;
  completed: boolean;
}

export interface snoutDbData {
  dbName: string;
  storeName: string;
  db: IDBDatabase;
}

export function exportTasksToYAML(snoutDB: snoutDbData) {
  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readonly");
  const store = transaction.objectStore(snoutDB.storeName);
  const request = store.getAll();

  request.onsuccess = () => {
    const tasks: Task[] = request.result;
    const yamlString = yaml.stringify(tasks);
    console.log(yamlString);
  };

  request.onerror = (event) => {
    console.error("Error fetching tasks:", (event.target as IDBRequest).error);
  };
}