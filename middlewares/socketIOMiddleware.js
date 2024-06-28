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

const imageMap = {
    'เปิดแอปไลน์': 'https://res.cloudinary.com/ds75c8pcd/image/upload/v1719402602/CloudinaryDemo/y03nnm57marrf9fh5tnu.jpg',
    'กดที่ปุ่มเพิ่มเพื่อน': 'https://i.ibb.co/LdW1r5v/IMG-9409.png',
    'เพิ่มจาก ID': 'https://i.ibb.co/PgrVskB/IMG-9411.png',
};

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


const handleImageKnowledge=async(folders)=> {
    const qaKnowledge = folders.map(folder => folder.qa_knowledge);
    let tempArr=[]
    for (const qa of qaKnowledge) {
        tempArr.push(...qa)
    }
    const generalKnowledgeArr = folders.map(folder => folder.general_knowledge);
   const generalText =  generateSystemInstructionByGeneralKnowledge(generalKnowledgeArr);
   const generalQa =  generateSystemInstructionByQaKnowledge(tempArr);
    const imageKnowledge = folders.map(folder => folder.image_knowledge);

const sumText=generalText+generalQa;
    return sumText
}


function generateSystemInstructionByGeneralKnowledge(knowledgeArr) {
    let textInstruction='และคุณมีความรู้ที่คุณได้เรียนรู้มา\n';
    textInstruction = textInstruction + knowledgeArr.map(knowledge => knowledge).join('\n');
    return textInstruction;
}

function generateSystemInstructionByQaKnowledge(qaKnowledge) {
    let textInstruction='และคุณมีความรู้ในคำถามและคำตอบดังนี้\n';
    for (const knowledge of qaKnowledge) {
        textInstruction += `คำถาม: ${knowledge.question}\n คำตอบ: ${knowledge.answer}\n`;
    }
    return textInstruction;
}

function socketIOMiddleware(app) {
    const server = http.createServer(app);
    const io = socketIO(server, {
        cors: {
            origin: "*",
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected');
        let chatSession;

        const initializeCharacter = async (characterId) => {
            try {
                const character = await CharacterSchema.findById(characterId);
                const folderKnowledge = character.folder_knowledge;
                const folders = await FolderSchema.find({ _id: { $in: folderKnowledge } });
                const instructionKnowledgeText = await handleImageKnowledge(folders);
                if (!character) {
                    return socket.emit('error', 'CharacterSchema not found');
                }

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

                        const imageRegex = /\[รูปภาพ:([^\]]+)\]/g;
                        response = response.replace(imageRegex, (match, description) => {
                            const mostSimilarKey = findMostSimilarImage(description);
                            if (mostSimilarKey) {
                                return `![${description}](${imageMap[mostSimilarKey]})`;
                            } else {
                                return '';
                            }
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

        socket.on('initialize', (characterId) => {
            initializeCharacter(characterId);
        });

        socket.on('typing', (isTyping) => {
            socket.broadcast.emit('typing', isTyping);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return server;
}

module.exports = socketIOMiddleware;
