// Import required modules
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const CryptoJS = require('crypto-js');

// Create an Express app
const app = express();
const server = http.Server(app);

// Configure Socket.IO with CORS settings
const io = new socketIO.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Enable CORS for Express app
app.use(cors());

// Define the port for the server
const PORT = process.env.PORT || 3001;

// Start the server and log the port
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Initialize variables to track user count and active users
let userCount = 0;
let activeUsers = {};
const privateMessages = {};

// Function to generate a unique chat key based on sender and receiver
function getChatKey(sender, receiver) {
    return [sender, receiver].sort().join(':');
}

// Function to encrypt a message using AES
function encryptMessage(data, key) {
    const hashedEncryptionKey = CryptoJS.SHA256(key).toString(CryptoJS.enc.Hex).substring(0, 32);
    const encryptedData = CryptoJS.AES.encrypt(data, hashedEncryptionKey).toString();
    return encryptedData;
}

// Function to decrypt a message using AES
function decryptMessage(encryptedData, key) {
    const hashedEncryptionKey = CryptoJS.SHA256(key).toString(CryptoJS.enc.Hex).substring(0, 32);
    const decryptedText = CryptoJS.AES.decrypt(encryptedData, hashedEncryptionKey).toString(CryptoJS.enc.Utf8);
    return decryptedText;
}

// Handle incoming connections using Socket.IO
io.on('connection', (socket) => {
    // Increment user count and broadcast the update
    userCount++;
    io.emit('userCountUpdate', userCount);

    let userN;

    // Handle 'setUsername' event to set and broadcast the username
    socket.on('setUsername', (username) => {
        userN = username;
        activeUsers[socket.id] = userN;
        io.emit('updateActiveUsers', Object.values(activeUsers));

        // Send private chat history if available
        if (privateMessages[userN]) {
            socket.emit('privateChatHistory', privateMessages[userN]);
        }
    });

    // Handle disconnection, update user count, and remove user from active users
    socket.on('disconnect', () => {
        userCount--;
        io.emit('userCountUpdate', userCount);

        const username = activeUsers[socket.id];
        delete activeUsers[socket.id];

        if (username) {
            io.emit('updateActiveUsers', Object.values(activeUsers));
            delete privateMessages[username];
        }
    });

    // Handle incoming public chat messages
    socket.on('sendMessage', (message) => {
        const sender = activeUsers[socket.id];
        if (sender) {
            // Broadcast the message to all clients
            socket.broadcast.emit('chatMessage', { sender, message });
            // Send the message back to the sender
            socket.emit('chatMessage', { sender, message });
        }
    });

    // Handle incoming private chat messages
    socket.on('sendPrivateMessage', ({ receiver, message }) => {
        const sender = activeUsers[socket.id];
        const receiverSocketId = Object.keys(activeUsers).find(id => activeUsers[id] === receiver);

        if (sender && receiverSocketId) {
            // Generate a unique chat key based on sender and receiver
            const chatKey = getChatKey(sender, receiver);

            // Initialize private messages array if not exists
            if (!privateMessages[chatKey]) {
                privateMessages[chatKey] = [];
            }

            // Add the private message to the array
            privateMessages[chatKey].push({ sender, receiver, message });

            // Encrypt the message
            const encryptedMessage = encryptMessage(message, 'encryption_@key');

            // Send the encrypted message to the sender and receiver
            socket.emit('privateChatMessage', { sender, receiver, message: encryptedMessage });
            io.to(receiverSocketId).emit('privateChatMessage', { sender, receiver, message: encryptedMessage });
        }
    });

    // Handle request for private chat history
    socket.on('getPrivateMessages', (receiver) => {
        const sender = activeUsers[socket.id];
        if (sender) {
            // Generate a unique chat key based on sender and receiver
            const chatKey = getChatKey(sender, receiver);
            // Send the private chat history to the requesting client
            socket.emit('privateChatHistory', privateMessages[chatKey] || []);
        }
    });
});
