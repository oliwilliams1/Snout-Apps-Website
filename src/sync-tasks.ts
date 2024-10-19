import { Octokit } from "@octokit/core";
import yaml from 'yaml';

const warningModal = document.getElementById('warningModal');
const gistIdInput = document.getElementById('gistIdInput') as HTMLInputElement;
const tokenInput = document.getElementById('tokenInput') as HTMLInputElement;
const updateButton = document.getElementById('updateButton');

function setCookie(name: string, value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; Secure; SameSite=Strict";
}

export function getCookie(name: string) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

let octokit: Octokit | null = null;
let gistId: string | null = null;

export async function fetchGistFile(gistId: string, fileName: string) {
  if (!octokit) return;

  try {
    const response = await octokit.request('GET /gists/{gist_id}', {
      gist_id: gistId,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const files = response.data.files;

    if (files && files[fileName]) {
      const file = files[fileName];
      return file.content;
    } else {
      console.log(`File "${fileName}" not found in the gist.`);
    }
  } catch (error) {
    console.error('Error fetching the gist:', error);
  }
}

async function updateGistContent(gistId: string, fileName: string, newContent: string): Promise<void> {
  if (!octokit) return;

  try {
    const response = await octokit.request('PATCH /gists/{gist_id}', {
      gist_id: gistId,
      files: {
        [fileName]: {
          content: newContent
        }
      },
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    console.log(`Gist updated successfully. Gist URL: ${response.data.html_url}`);
  } catch (error) {
    console.error('Error updating the gist:', error);
  }
}

export interface Task {
  title: string;
  description: string;
  priority: number;
  completed: boolean;
  dateAdded: string;
  uniqueId: number;
}

export interface SnoutDbData {
  dbName: string;
  storeName: string;
  db: IDBDatabase;
  gistFilename: string;
}

export function updateGist(snoutDB: SnoutDbData) {
  const transaction = snoutDB.db.transaction([snoutDB.storeName], "readonly");
  const store = transaction.objectStore(snoutDB.storeName);
  const request = store.getAll();

  request.onsuccess = () => {
    const tasks: Task[] = request.result;
    const yamlString = yaml.stringify(tasks);
    if (!gistId) return;
    updateGistContent(gistId, snoutDB.gistFilename, yamlString);
  };

  request.onerror = (event) => {
    console.error("Error fetching tasks:", (event.target as IDBRequest).error);
  };
}

function deleteAllCookies() {
  const cookies = document.cookie.split(";");

  for (let cookie of cookies) {
      const cookieName = cookie.split("=")[0].trim();
      // Set the cookie's expiration date to the past
      document.cookie = cookieName + "=; Max-Age=-99999999; path=/; Secure; SameSite=Strict";
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (false) deleteAllCookies(); // For testing purposes

  const api_key = getCookie('snoutGithubToken');
  const p_gistId = getCookie('snoutGistId');
  
  if (!api_key || !p_gistId) {
    warningModal?.classList.remove('hidden');
    warningModal?.classList.add('flex');
    console.log("No API key found in cookies, asking user now");

    updateButton?.addEventListener('click', () => {
      console.log("Setting API key in cookies");
      const snoutGistId = gistIdInput.value;
      const snoutGithubToken = tokenInput.value;
      setCookie('snoutGithubToken', snoutGithubToken, 330);
      setCookie('snoutGistId', snoutGistId, 999999);
      document.location.reload();
    });
  } else {
    octokit = new Octokit({ auth: api_key });
    gistId = p_gistId;
  }
});