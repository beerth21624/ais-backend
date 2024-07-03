const AiController = require('../controllers/aiController');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');


function socketIOChatMiddleware(app) {
    const server = http.createServer(app);
    const io = socketIO(server);

    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('chat message', async (msg) => {
            try {
                const result = await AiController.processMessage({ body: { message: msg } }, {
                    json: (data) => {
                        io.emit('chat message', data);
                    }
                });
            } catch (error) {
                console.error('Error processing message:', error);
                io.emit('chat message', { error: 'An error occurred while processing the message' });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return server;
}

module.exports = socketIOChatMiddleware;