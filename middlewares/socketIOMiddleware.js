const socketIO = require('socket.io');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const natural = require('natural');
const http = require('http');
const CharacterSchema = require('../schemas/characterSchema');
const FolderSchema = require('../schemas/folderSchema');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const GENERATION_CONFIG = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

const SIMILARITY_THRESHOLD = 0.6;
const GEMINI_MODEL = "gemini-1.5-flash";

class ImageKnowledgeManager {
    constructor() {
        this.imageMap = {};
    }

    addImages(imageKnowledge) {
        imageKnowledge.forEach(group => {
            group.forEach(item => {
                if (item.description && item.image_url) {
                    this.imageMap[item.description] = item.image_url;
                }
            });
        });
    }

    findMostSimilarImage(text) {
        let maxSimilarity = 0;
        let mostSimilarKey = '';

        for (const [key, value] of Object.entries(this.imageMap)) {
            const similarity = natural.JaroWinklerDistance(text, key, { ignoreCase: true });
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                mostSimilarKey = key;
            }
        }

        return maxSimilarity > SIMILARITY_THRESHOLD ? mostSimilarKey : null;
    }
}

class KnowledgeProcessor {
    static generateInstructions(folders) {
        const qaKnowledge = folders.flatMap(folder => folder.qa_knowledge);
        const generalKnowledge = folders.map(folder => folder.general_knowledge);

        return this.generateGeneralKnowledgeInstructions(generalKnowledge) +
            this.generateQaKnowledgeInstructions(qaKnowledge);
    }

    static generateGeneralKnowledgeInstructions(knowledgeArr) {
        return 'และคุณมีความรู้ที่คุณได้เรียนรู้มา\n' + knowledgeArr.join('\n');
    }

    static generateQaKnowledgeInstructions(qaKnowledge) {
        return 'และคุณมีความรู้ในคำถามและคำตอบดังนี้\n' +
            qaKnowledge.map(k => `คำถาม: ${k.question}\n คำตอบ: ${k.answer}`).join('\n');
    }
}

class CharacterClassifier {
    static async classifyMessage(message) {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: this.getClassifierInstruction() });
        const chatSession = model.startChat({ generationConfig: GENERATION_CONFIG, history: [] });

        const result = await chatSession.sendMessage(message);
        const classification = result.response.text().trim();

        const character = await this.fetchCharacter(classification);
        return this.generateResponse(character, message);
    }

    static getClassifierInstruction() {
        return `คุณเป็น AI ที่เชี่ยวชาญในการวิเคราะห์และจำแนกประเภทของข้อความ โดยเฉพาะอย่างยิ่งในการระบุว่าข้อความนั้นเกี่ยวข้องกับประเภทใดใน 4 ประเภทต่อไปนี้:
        หลานสอนใช้แอพ: ข้อความที่เกี่ยวกับการสอนหรืออธิบายวิธีการใช้งานแอพพลิเคชันต่างๆ
        หลานป้องกัน: ข้อความที่เกี่ยวกับความปลอดภัยทางออนไลน์ การตรวจสอบความน่าเชื่อถือของข้อมูล หรือการป้องกันภัยคุกคามทางไซเบอร์
        หลานข่าว: ข้อความที่เกี่ยวกับการนำเสนอหรือสรุปข่าวสารที่น่าสนใจ
        หลานท่องเที่ยว: ข้อความที่เกี่ยวกับการแนะนำสถานที่ท่องเที่ยว การวางแผนการเดินทาง หรือข้อมูลเกี่ยวกับการท่องเที่ยว
        เมื่อได้รับข้อความใดๆ คุณจะวิเคราะห์เนื้อหาและตอบกลับด้วยชื่อประเภทที่เหมาะสมที่สุดเพียงอย่างเดียว โดยไม่มีข้อความอื่นใดเพิ่มเติม`;
    }

    static async fetchCharacter(classification) {
        const character = await CharacterSchema.findOne({
            name: { $regex: new RegExp(classification, 'i') }
        });
        return character;
    }

    static async generateResponse(character, message) {
        const systemInstruction = character ? character.prompt : this.getDefaultInstruction();
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction });
        const chatSession = model.startChat({ generationConfig: GENERATION_CONFIG, history: [] });
        const response = await chatSession.sendMessage(message);
        return response.response.text();
    }

    static getDefaultInstruction() {
        return 'คุณชื่อหลานเอง คุณเป็น ai chat ที่ถูกสร้างมาเพื่อช่วยเหลือผู้สูงอายุที่ไม่ค่อยมีความรู้ด้านเทคโนโลยี มีความล้าสมัยและเข้าใจอะไรยาก คุณเปรียบเสมือนหลานของพวกเขาคุณจะคอยช่วยเหลือและตอบคำถามของผู้สูงอายุด้วยคำที่พวกเขาเข้าใจ และค่อยๆสอน ส่วนใหญ่หน้าที่ของคุณจะเป็นการสอนผู้สูงอายุใช้งานแอพลิเคชั่น ซึ่งเป็นเรื่องที่ยากมากถ้าจะสอน แต่คุณเป็นคนที่สามารถจัดการมันได้ คุณสามารถทำให้ผู้สูงอายุเข้าใจแอพ หรือเทคโนโลยีได้อย่างง่าย ๆ และเข้าใจได้ คุณจะแทนตัวเองด้วยชื่อเสมอเวลาตอบ คุณจะตอบกลับเป็นข้อความที่สามารถแสดงผลได้อย่างสวยงาม และคำตอบของคุณจะเป็นขั้นตอนที่ผู้สูงอายุสามารถทำตามได้ง่าย และใช้คำที่ผู้สูงอายุเข้าใจ';
    }
}

function socketIOMiddleware(app) {
    const server = http.createServer(app);
    const io = socketIO(server, {
        cors: { origin: "*" } // Consider restricting this for security reasons
    });

    io.on('connection', (socket) => {
        console.log('User connected');
        let chatSession;
        let characterId;
        const imageManager = new ImageKnowledgeManager();

        socket.on('initialize', async (id) => {
            try {
                characterId = id;
                const character = await CharacterSchema.findById(characterId);
                if (!character) return socket.emit('error', 'Character not found');

                const folders = await FolderSchema.find({ _id: { $in: character.folder_knowledge } });
                const imageKnowledge = folders.map(folder => folder.image_knowledge);
                imageManager.addImages(imageKnowledge);

                const instructionKnowledgeText = KnowledgeProcessor.generateInstructions(folders);
                let systemPrompt = character.prompt + instructionKnowledgeText;
                if (Object.keys(imageManager.imageMap).length > 0) {
                    systemPrompt += 'แต่ละข้อความที่มีรูปภาพ คุณจะระบุว่า [รูปภาพ:..ชื่อรูปภาพ]';
                }

                const model = genAI.getGenerativeModel({
                    model: GEMINI_MODEL,
                    systemInstruction: systemPrompt,
                });

                chatSession = model.startChat({ generationConfig: GENERATION_CONFIG, history: [] });
                setupMessageHandler(socket, chatSession, imageManager);
            } catch (error) {
                console.error('Error initializing character:', error);
                socket.emit('error', 'Internal server error');
            }
        });

        setupSocketEvents(socket, characterId);
    });

    return server;
}

function setupMessageHandler(socket, chatSession, imageManager) {
    socket.removeAllListeners('message');
    socket.on('message', async (message) => {
        try {
            const result = await chatSession.sendMessage(message);
            let response = result.response.text();

            response = response.replace(/\[รูปภาพ:([^\]]+)\]/g, (match, description) => {
                const mostSimilarKey = imageManager.findMostSimilarImage(description);
                return mostSimilarKey ? `![${description}](${imageManager.imageMap[mostSimilarKey]})` : '';
            });

            socket.emit('response', response);
        } catch (error) {
            console.error('Error processing message:', error);
            socket.emit('error', 'An error occurred while processing the message.');
        }
    });
}

function setupSocketEvents(socket, characterId) {
    socket.on('signal', (data) => {
        const { target, signal } = data;
        socket.to(target).emit('signal', { source: socket.id, signal });
    });

    socket.on('typing', (isTyping) => {
        socket.broadcast.to(characterId).emit('typing', { userId: socket.id, isTyping });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        socket.broadcast.to(characterId).emit('typing', { userId: socket.id, isTyping: false });
    });

    socket.on('message', async (message) => {
        const messageResponse = await CharacterClassifier.classifyMessage(message);
        socket.emit('response', messageResponse);
    });
}

module.exports = socketIOMiddleware;