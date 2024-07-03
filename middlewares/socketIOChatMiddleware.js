const AiController = require('../controllers/aiController');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');


function socketIOChatMiddleware(app) {
    const server = http.createServer(app);
    const io = socketIO(server, {
        cors: { origin: "*" } // Consider restricting this for security reasons
    });


    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('message', async (msg) => {
            try {
                const result = await AiController.processMessage({ body: { message: msg } }, {
                    json: (data) => {
                        io.emit('message', data);
                    }
                });
            } catch (error) {
                console.error('Error processing message:', error);
                io.emit('message', { error: 'An error occurred while processing the message' });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return server;
}

module.exports = socketIOChatMiddleware;