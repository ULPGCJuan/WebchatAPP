// Connect to the server using socket.io
const socket = io.connect("http://localhost:3001", { forceNew: true });

// When the window loads, display a modal
window.onload = function () {
    var modal = document.getElementById('myModal');
    modal.style.display = 'flex';
};

// Function to save the entered username
function saveUsername() {
    // Get the username from the input field
    var username = document.getElementById('username').value;

    // Check if the username is empty or contains spaces
    if (!username.trim() || username.includes(' ')) {
        // Notify the user that the username is invalid
        alert('Please enter a valid username without spaces.');
        return;
    }

    // Check if the username is already in use on the client side
    if (checkUsernameAvailability(username)) {
        // Notify the user that the username is already in use
        alert(`Username "${username}" is already in use. Please choose a different username.`);
        return;
    }

    // Display a welcome message with the username
    document.getElementById('welcomeMessage').innerHTML = 'Welcome, ' + username;

    // Hide the modal
    var modal = document.getElementById('myModal');
    modal.style.display = 'none';

    // Emit a 'setUsername' event to the server
    socket.emit('setUsername', username);
}

// Function to check if the username is already in use on the client side
function checkUsernameAvailability(username) {
    // Get the list of existing usernames from the user-list2 element
    const userList = document.getElementById('user-list2');
    // Trim each username in the list and check if it includes the input username
    const existingUsernames = Array.from(userList.children).map(item => item.innerText.trim());
    return existingUsernames.includes(username.trim());
}

// Function to encrypt a message using AES
function encryptMessage(data, key) {
    // Hash the encryption key and get the first 32 characters
    const hashedEncryptionKey = CryptoJS.SHA256(key).toString(CryptoJS.enc.Hex).substring(0, 32);
    // Encrypt the data using AES
    const encryptedData = CryptoJS.AES.encrypt(data, hashedEncryptionKey).toString();
    return encryptedData;
}

// Function to decrypt a message using AES
function decryptMessage(encryptedData, key) {
    // Hash the encryption key and get the first 32 characters
    const hashedEncryptionKey = CryptoJS.SHA256(key).toString(CryptoJS.enc.Hex).substring(0, 32);
    // Decrypt the data using AES
    const decryptedText = CryptoJS.AES.decrypt(encryptedData, hashedEncryptionKey).toString(CryptoJS.enc.Utf8);
    return decryptedText;
}

// Update user count when the server emits 'userCountUpdate'
socket.on('userCountUpdate', (count) => {
    document.getElementById('user-count').innerText = count;
});

// Handle incoming chat messages from the server
socket.on('chatMessage', (data) => {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    const decryptedMessage = decryptMessage(data.message, 'encryption_@key');
    const messageText = data.sender + ': ' + decryptedMessage;

    // Break long messages into chunks for better display
    for (let i = 0; i < messageText.length; i += 214) {
        const chunk = messageText.substring(i, i + 214);
        const chunkElement = document.createElement('div');
        chunkElement.innerText = chunk;
        messageElement.appendChild(chunkElement);
    }
    chatMessages.appendChild(messageElement);
});

// Function to send a message to the server
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value;
    const EncryptedMessage = encryptMessage(message, 'encryption_@key');
    if (message.trim() !== '') {
        socket.emit('sendMessage', EncryptedMessage);
        messageInput.value = '';
    }
}

// Function to create a list item for a username
function createListItem(username) {
    const listItem = document.createElement('li');
    listItem.innerText = username;
    listItem.onclick = () => openPrivateChat(username);
    return listItem;
}

// Variable to track the current private chat user
let currentPrivateChat = null;

// Function to open a private chat with a user
function openPrivateChat(username) {
    // Get the current user
    const currentUser = document.getElementById('welcomeMessage').innerText.split(', ')[1];

    // Check if trying to open a chat with oneself
    if (username !== currentUser) {
        // Set the current private chat user
        currentPrivateChat = username;
        // Emit 'getPrivateMessages' event to the server
        socket.emit('getPrivateMessages', username);

        // Setup the private chat UI
        const privateChatMessages = document.getElementById('privateChatMessages');
        privateChatMessages.innerHTML = '';

        const chatHeader = document.createElement('div');
        chatHeader.innerText = `Chat with ${username}`;
        privateChatMessages.appendChild(chatHeader);

        const privateMessageInput = document.createElement('input');
        privateMessageInput.type = 'text';
        privateMessageInput.placeholder = `Type your message to ${username}...`;

        const privateSendButton = document.createElement('button');
        privateSendButton.innerText = 'Send';

        privateSendButton.onclick = () => sendPrivateMessage(username, privateMessageInput.value);
        
        privateChatMessages.appendChild(privateMessageInput);
        privateChatMessages.appendChild(privateSendButton);

        // Listen for incoming private chat messages
        socket.on('privateChatMessage', (data) => {
            const currentUser = document.getElementById('welcomeMessage').innerText.split(', ')[1];
            const privateChatMessages = document.getElementById('privateChatMessages');
        
            // Display private chat messages for the current chat
            if ((data.sender == currentUser && data.receiver == username) || (data.sender == username && data.receiver == currentUser)) {
                const messageElement = document.createElement('div');
                const decryptedMessage = decryptMessage(data.message, 'encryption_@key');
                messageElement.innerText = `${data.sender}: ${decryptedMessage}`;
                privateChatMessages.appendChild(messageElement);
            }
        });

    } else {
        alert(`'You cannot open a chat with yourself.`);
    }
}

// Function to send a private message to another user
function sendPrivateMessage(receiver, message) {
    socket.emit('sendPrivateMessage', { receiver, message });

    // Clear the private message input field
    const privateMessageInput = document.querySelector('#privateChatMessages input[type="text"]');
    if (privateMessageInput) {
        privateMessageInput.value = '';
    }
}

// Handle incoming private chat history from the server
socket.on('privateChatHistory', (messages) => {
    const privateChatMessages = document.getElementById('privateChatMessages');
    // Display the private chat history
    messages.forEach(data => {
        const messageElement = document.createElement('div');
        messageElement.innerText = `${data.sender}: ${data.message}`;
        privateChatMessages.appendChild(messageElement);
    });
});

// Update the list of active users when the server emits 'updateActiveUsers'
socket.on('updateActiveUsers', (users) => {
    const userList = document.getElementById('user-list2');
    userList.innerHTML = '';

    // Create list items for each active user
    users.forEach((username) => {
        const listItem = createListItem(username);
        userList.appendChild(listItem);
    });
});
