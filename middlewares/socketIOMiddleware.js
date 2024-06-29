const socketIO = require('socket.io');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const natural = require('natural');
const http = require('http');
const CharacterSchema = require('../schemas/characterSchema');
const FolderSchema = require('../schemas/folderSchema');
const ImageKnowledgeSchema = require('../schemas/ImageKnowledgeSchema');
const QaKnowledgeSchema = require('../schemas/QaKnowledgeSchema');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

let imageMap = {};

// Find the most similar image description
function findMostSimilarImage(text) {
    let maxSimilarity = 0;
    let mostSimilarKey = '';

    for (const key of Object.keys(imageMap)) {
        const similarity = natural.JaroWinklerDistance(text, key, { ignoreCase: true });
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            mostSimilarKey = key;
        }
    }

    return maxSimilarity > 0.6 ? mostSimilarKey : null;
}

// Handle image knowledge extraction and processing
const handleImageKnowledge = async (folders) => {
    const qaKnowledge = folders.flatMap(folder => folder.qa_knowledge);
    const generalKnowledgeArr = folders.map(folder => folder.general_knowledge);

    const generalText = generateSystemInstructionByGeneralKnowledge(generalKnowledgeArr);
    const generalQa = generateSystemInstructionByQaKnowledge(qaKnowledge);

    return generalText + generalQa;
}

// Convert image knowledge to a map
function convertToImageMap(imageKnowledge) {
    const imageMap = {};
    imageKnowledge.forEach(group => {
        group.forEach(item => {
            if (item.description && item.image_url) {
                imageMap[item.description] = item.image_url;
            }
        });
    });
    return imageMap;
}

// Generate instructions from general knowledge
function generateSystemInstructionByGeneralKnowledge(knowledgeArr) {
    let textInstruction = 'และคุณมีความรู้ที่คุณได้เรียนรู้มา\n';
    textInstruction += knowledgeArr.join('\n');
    return textInstruction;
}

// Generate instructions from Q&A knowledge
function generateSystemInstructionByQaKnowledge(qaKnowledge) {
    let textInstruction = 'และคุณมีความรู้ในคำถามและคำตอบดังนี้\n';
    qaKnowledge.forEach(knowledge => {
        textInstruction += `คำถาม: ${knowledge.question}\n คำตอบ: ${knowledge.answer}\n`;
    });
    return textInstruction;
}

// Middleware function for socket.io
function socketIOMiddleware(app) {
    const server = http.createServer(app);
    const io = socketIO(server, {
        cors: {
            origin: "*", // Consider restricting this for security reasons
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected');
        let chatSession;
        let characterId;

        // Initialize character with knowledge
        const initializeCharacter = async (id) => {
            try {
                characterId = id;
                const character = await CharacterSchema.findById(characterId);
                if (!character) {
                    return socket.emit('error', 'Character not found');
                }

                const folderKnowledge = character.folder_knowledge;
                const folders = await FolderSchema.find({ _id: { $in: folderKnowledge } });
                const imageKnowledge = folders.map(folder => folder.image_knowledge);
                imageMap = convertToImageMap(imageKnowledge);

                const instructionKnowledgeText = await handleImageKnowledge(folders);

                const systemPrompt = character.prompt + instructionKnowledgeText;
                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash",
                    systemInstruction: systemPrompt,
                });

                chatSession = model.startChat({
                    generationConfig,
                    history: [],
                });

                socket.removeAllListeners('message');
                socket.on('message', async (message) => {
                    try {
                        const result = await chatSession.sendMessage(message);
                        let response = result.response.text();

                        // Replace placeholders with actual images
                        const imageRegex = /\[รูปภาพ:([^\]]+)\]/g;
                        response = response.replace(imageRegex, (match, description) => {
                            const mostSimilarKey = findMostSimilarImage(description);
                            return mostSimilarKey ? `![${description}](${imageMap[mostSimilarKey]})` : '';
                        });

                        socket.emit('response', response);
                    } catch (error) {
                        console.error('Error:', error);
                        socket.emit('error', 'An error occurred while processing the message.');
                    }
                });
            } catch (error) {
                console.error('Error fetching character:', error);
                socket.emit('error', 'Internal server error');
            }
        };

        // Handle initialization event
        socket.on('initialize', (id) => {
            initializeCharacter(id);
        });

        // Handle signaling for WebRTC connections
        socket.on('signal', (data) => {
            const { target, signal } = data;
            io.to(target).emit('signal', { source: socket.id, signal });
        });

        // Handle typing indicator
        socket.on('typing', (isTyping) => {
            socket.broadcast.to(characterId).emit('typing', { userId: socket.id, isTyping });
        });

        // Handle user disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected');
            socket.broadcast.to(characterId).emit('typing', { userId: socket.id, isTyping: false });
        });
    });

    return server;
}

module.exports = socketIOMiddleware;
