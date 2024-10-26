import hljs from 'highlight.js';
import markdownit from 'markdown-it';
const md = markdownit();
const inputField = document.getElementById('entry-box');

const warningModal = document.getElementById('warningModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const updateButton = document.getElementById('updateButton');

let apiKey = null;

function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; Secure; SameSite=Strict";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

let messages = [];

const clearButton = document.getElementById('close-button');
clearButton.addEventListener('click', () => {
    messages = [];
    renderMessages();
})
const sendButton = document.getElementById('send-button');
sendButton.addEventListener('click', onEnterPress);

function renderText(text) {
  let str = md.render(text);
  return str;
}

function renderMessages() {
  const AI_UI = document.getElementById('AI-UI');
  AI_UI.innerHTML = messages.map((message, i) => {
      return `<div class="message ${i % 2 === 0 ? 'user' : 'bot'}">${renderText(message.text)}</div><br>`;
  }).join(''); // Join the array into a single string
  hljs.highlightAll();
}

renderMessages();

function onEnterPress() {
  if (messages.length % 2 != 0) {
      return;
  }
  const userInput = inputField.value;
  messages.push({"text": userInput});
  console.log("Enter key pressed!");
  inputField.value = "";

  // Render messages after adding a new one
  renderMessages();

  fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({
          contents: [{
              parts: [
                  messages
              ]
          }]
      })
  })
  .then(response => response.json())
  .then(data => {
      console.log(data);
      let message = data["candidates"][0]["content"]["parts"][0]["text"]; // Replace new lines with <br>
      console.log(message);
      messages.push({'text': `${message}`});
      
      // Render messages again to include the bot's response
      renderMessages();
  })
  .catch(err => console.log(err));
}

document.addEventListener('DOMContentLoaded', () => {
  if (getCookie('snoutGeminiApiKey') == null) {
    warningModal.classList.remove('hidden');

    document.getElementById('updateButton').addEventListener('click', () => {
      setCookie('snoutGeminiApiKey', apiKeyInput.value, 999999);
      window.location.reload();
    });
  }

  apiKey = getCookie('snoutGeminiApiKey');

  inputField.addEventListener('keydown', (event) => { 
    if (event.key === 'Enter') {
      if (!event.shiftKey) { // Check if Shift is NOT pressed
        event.preventDefault(); // Prevent new line
        if (inputField.value !== "") {
          onEnterPress();
        }
      }
    }
  });
});