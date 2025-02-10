import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// Initialize the Google Generative AI
const genAI = new GoogleGenerativeAI("AIzaSyCciKvK2C94Ievyf_ny5hkikcoDn2UveCE");

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  systemInstruction: "imagine yourself as osaka from AZUMANGA DAIOH.. introduce and you are going to help the user with cooking and everything related to it \n\nso basically whatever the user wishes to make you are going to help him with the ingredients and how to do it.\n\nkeep your introduction and interaction concise and straightforward\ngive instructions in detail and clear for the user to understand clearly.\n\ngive a little bit of explanation to your actions as well just for fun but it shouldnt be in too much detail\n\nfor everything that is not related to cooking say that you can't help but it should be in a funny way like how the character osaka would say in the show azumanga daioh\n\nNOW! keeping cooking aside you are also gonna work as a motivation bot....which basically helps the user to get motivation...no matter what it may be \nthe catch is you need to be funny in your motivation not much serious type but careless\nkeep your answers that are related to motivation a little simple and short \n",
  generationConfig: {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  },
});

// Store chat history
let chatHistory = [];
let currentChatId = Date.now();
let allChats = {};

// Function to create a new chat
function createNewChat() {
  currentChatId = Date.now();
  chatHistory = [];
  updateChatList();
  document.querySelector('.chat-messages').innerHTML = '';
}

// Function to update chat list in sidebar
function updateChatList() {
  const chatList = document.querySelector('.chat-list');
  if (!chatList) {
    const sidebar = document.querySelector('.sidebar');
    const newChatList = document.createElement('div');
    newChatList.className = 'chat-list';
    sidebar.appendChild(newChatList);
  }

  const chatListElement = document.querySelector('.chat-list');
  chatListElement.innerHTML = '';

  Object.entries(allChats).forEach(([id, chat]) => {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    if (id === currentChatId.toString()) {
      chatItem.classList.add('active');
    }
    chatItem.textContent = `Chat ${new Date(parseInt(id)).toLocaleTimeString()}`;
    chatItem.onclick = () => loadChat(id);
    chatListElement.appendChild(chatItem);
  });
}

// Function to load a chat
function loadChat(chatId) {
  currentChatId = chatId;
  chatHistory = allChats[chatId] || [];
  const chatMessages = document.querySelector('.chat-messages');
  chatMessages.innerHTML = '';
  chatHistory.forEach(msg => {
    displayMessage(msg.role, msg.content, msg.type);
  });
  updateChatList();
}

async function sendMessageToGemini(message, type = 'text') {
  try {
    const chat = model.startChat({
      history: chatHistory.map(msg => ({ role: msg.role, parts: msg.content })),
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    
    // Update chat history
    chatHistory.push({ role: 'user', content: message, type });
    chatHistory.push({ role: 'assistant', content: text, type: 'text' });
    
    // Save to all chats
    allChats[currentChatId] = chatHistory;
    updateChatList();
    
    return text;
  } catch (error) {
    console.error('Error:', error);
    return 'Sorry, I encountered an error. Please try again.';
  }
}

// Function to display messages in the chat window
function displayMessage(sender, message, type = 'text') {
  const chatMessages = document.querySelector('.chat-messages');
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);

  // Create avatar element
  const avatar = document.createElement('div');
  avatar.classList.add('avatar');
  avatar.textContent = sender === 'user' ? 'U' : 'O';
  messageElement.appendChild(avatar);

  const messageContent = document.createElement('div');
  messageContent.classList.add('message-content');
  
  if (type === 'image') {
    const img = document.createElement('img');
    img.src = message;
    messageContent.appendChild(img);
  } else {
    messageContent.textContent = message;
  }
  
  messageElement.appendChild(messageContent);
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle form submission
const form = document.querySelector('.input-form');
const inputField = form.querySelector('input[type="text"]');
const imageInput = document.querySelector('#image-upload');

// Handle image upload
imageInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target.result;
      displayMessage('user', imageData, 'image');
      
      // Send image context to Gemini
      const response = await sendMessageToGemini(`[User sent an image]`, 'image');
      displayMessage('assistant', response);
    };
    reader.readAsDataURL(file);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const message = inputField.value.trim();
  if (!message) return;

  // Display user message
  displayMessage('user', message);
  inputField.value = '';

  // Show loading state
  const loadingMessage = 'Thinking...';
  displayMessage('assistant', loadingMessage);

  // Get response from Gemini
  const response = await sendMessageToGemini(message);
  
  // Remove loading message and display actual response
  const chatMessages = document.querySelector('.chat-messages');
  chatMessages.removeChild(chatMessages.lastChild);
  displayMessage('assistant', response);
});

// Handle new chat button
const newChatBtn = document.querySelector('.new-chat-btn');
newChatBtn.addEventListener('click', createNewChat);

// Initialize first chat
createNewChat();