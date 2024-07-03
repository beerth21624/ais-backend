const { GoogleGenerativeAI } = require("@google/generative-ai");
const natural = require('natural');
const CharacterSchema = require('../schemas/characterSchema');
const FolderSchema = require('../schemas/folderSchema');
const redis = require('redis');
const LRU = require('lru-cache');

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

const redisClient = redis.createClient({
    url: process.env.NODE_ENV === 'production' ? process.env.REDIS_URL_PROD : process.env.REDIS_URL,
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

redisClient.connect().then(() => {
    console.log('Connected to Redis');
}).catch(err => {
    console.error('Error connecting to Redis', err);
});

const characterCache = new LRU({ max: 100, maxAge: 1000 * 60 * 60 }); // 1 hour cache

class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
        this.character = null;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(word, character) {
        let node = this.root;
        for (const char of word.toLowerCase()) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEndOfWord = true;
        node.character = character;
    }

    search(word) {
        let node = this.root;
        for (const char of word.toLowerCase()) {
            if (!node.children[char]) {
                return null;
            }
            node = node.children[char];
        }
        return node.isEndOfWord ? node.character : null;
    }
}

class ImageKnowledgeManager {
    constructor() {
        this.imageMap = new Map();
    }

    addImages(imageKnowledge) {
        imageKnowledge.forEach(group => {
            group.forEach(item => {
                if (item.description && item.image_url) {
                    this.imageMap.set(item.description, item.image_url);
                }
            });
        });
    }

    findMostSimilarImage(text) {
        let maxSimilarity = 0;
        let mostSimilarKey = '';

        for (const [key, value] of this.imageMap) {
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
        const linkKnowledge = folders.map(folder => folder.link_knowledge);

        return (
            this.generateGeneralKnowledgeInstructions(generalKnowledge) +
            this.generateQaKnowledgeInstructions(qaKnowledge) +
            this.generateLinkKnowledgeInstructions(linkKnowledge)
        );
    }

    static generateGeneralKnowledgeInstructions(knowledgeArr) {
        return 'และคุณมีความรู้ที่คุณได้เรียนรู้มา\n' + knowledgeArr.join('\n');
    }

    static generateQaKnowledgeInstructions(qaKnowledge) {
        return (
            'และคุณมีความรู้ในคำถามและคำตอบดังนี้\n' +
            qaKnowledge.map(k => `คำถาม: ${k.question}\n คำตอบ: ${k.answer}`).join('\n')
        );
    }

    static generateLinkKnowledgeInstructions(linkKnowledge) {
        return (
            'และคุณมีความรู้จากที่จะเป็นประโยชน์ในการเรียนรู้เพิ่มเติม\n' +
            linkKnowledge
                .map(k => `เรื่อง: ${k.name === 'Link' ? 'ไม่มีชื่อ' : k.name}\n ลิ้งค์: ${k.link === 'Link' ? 'ไม่มีลิ้งค์' : k.link}`)
                .join('\n') +
            'คุณจะสามารถนำไปใช้ในการตอบคำถามของผู้ใช้ได้'
        );
    }
}

class AiController {
    static async processMessage(req, res) {
        try {
            const { message } = req.body;

            const cachedClassification = await redisClient.get(`classification:${message}`);
            let classification = cachedClassification || await AiController.classifyMessage(message);

            if (!cachedClassification) {
                await redisClient.setEx(`classification:${message}`, 3600, classification);
            }

            const character = await AiController.getCharacter(classification);

            let systemPrompt = '';
            if (character) {
                const cachedSystemPrompt = await redisClient.get(`systemPrompt:${character._id}`);
                if (cachedSystemPrompt) {
                    systemPrompt = cachedSystemPrompt;
                } else {
                    const folders = await FolderSchema.find({ _id: { $in: character.folder_knowledge } });
                    const imageManager = new ImageKnowledgeManager();
                    const imageKnowledge = folders.map(folder => folder.image_knowledge);
                    imageManager.addImages(imageKnowledge);

                    const instructionKnowledgeText = KnowledgeProcessor.generateInstructions(folders);
                    let preSystemPrompt = character.prompt + instructionKnowledgeText;
                    if (imageManager.imageMap.size > 0) {
                        preSystemPrompt += 'คุณจะตอบกลับเป็นข้อความปกติก ไม่เอา markdownใดๆ คุณจะมีนิสัยขอบเป็นห่วงและมักถามกลับเพื่อความแน่ใ0 ข้อความที่ตอบกลับจะถูกนำไปใช้กับ line chatbot โดยตรง';
                    }
                    systemPrompt = preSystemPrompt;
                    await redisClient.setEx(`systemPrompt:${character._id}`, 86400, systemPrompt);
                }
            } else {
                systemPrompt = "คุณคือหลานเอง AI chat ที่ถูกสร้างมาเพื่อช่วยเหลือผู้สูงอายุที่ไม่คุ้นเคยกับเทคโนโลยี คุณจะ:ตอบคำถามด้วยภาษาที่เข้าใจง่าย เสมือนหลานแท้ๆ สอนการใช้แอพพลิเคชั่นและเทคโนโลยีอย่างละเอียดแบ่งคำอธิบายเป็นขั้นตอนที่ทำตามได้ง่ายใช้คำศัพท์ที่ผู้สูงอายุคุ้นเคpแทนตัวเองด้วยชื่อ 'หลานเอง' เสมอตอบกลับด้วยข้อความที่อ่านง่าย สวยงามคุณจะใช้ความอดทนและความเข้าใจในการสื่อสาร พร้อมทั้งให้กำลังใจผู้สูงอายุในการเรียนรู้สิ่งใหม่ๆ";
            }

            const cacheKey = `response:${classification}:${message}`;
            const cachedResponse = await redisClient.get(cacheKey);
            let response;
            if (cachedResponse) {
                response = cachedResponse;
            } else {
                const model = genAI.getGenerativeModel({
                    model: GEMINI_MODEL,
                    systemInstruction: systemPrompt,
                });

                const chatSession = model.startChat({ generationConfig: GENERATION_CONFIG, history: [] });
                const result = await chatSession.sendMessage(message);
                response = result.response.text();

                response = AiController.removeMarkdown(response);
                await redisClient.setEx(cacheKey, 3600, response);
            }

            res.json({ classification, response });
        } catch (error) {
            res.status(200).json({
                classification: 'gemini',
                response: 'ขออภัยค่ะ ข้อความของคุณมีเนื้อหาที่ระบบไม่สามารถประมวลผลได้ กรุณาปรับแก้และส่งใหม่อีกครั้งนะคะ',
            });
            console.error('Error processing message:', error);
        }
    }

    static async processMessageStream(req, res) {
        try {
            const { message } = req.body;

            const classification = await AiController.classifyMessage(message);
            const character = await AiController.getCharacter(classification);

            let systemPrompt = character ? character.prompt : "Default system prompt";

            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            const model = genAI.getGenerativeModel({
                model: GEMINI_MODEL,
                systemInstruction: systemPrompt,
            });

            const chatSession = model.startChat({ generationConfig: GENERATION_CONFIG, history: [] });
            const result = await chatSession.sendMessageStream(message);

            for await (const chunk of result.stream) {
                res.write(`data: ${chunk.text()}\n\n`);
            }

            res.end();
        } catch (error) {
            res.write(`data: Error processing message: ${error.message}\n\n`);
            res.end();
            console.error('Error processing message stream:', error);
        }
    }

    static async buildClassificationTrie() {
        const trie = new Trie();
        const characters = await CharacterSchema.find({ record_status: 'A' });
        characters.forEach(char => {
            const keywords = char.prompt.split(' ');
            keywords.forEach(keyword => trie.insert(keyword, char.name));
        });
        return trie;
    }

    static async classifyMessage(message) {
        const trie = await AiController.buildClassificationTrie();
        const words = message.split(' ');
        for (const word of words) {
            const classification = trie.search(word);
            if (classification) return classification;
        }
        return 'default';
    }

    static async getCharacter(name) {
        if (characterCache.has(name)) {
            return characterCache.get(name);
        }
        const character = await CharacterSchema.findOne({ name });
        if (character) {
            characterCache.set(name, character);
        }
        return character;
    }

    static removeMarkdown(text) {
        text = text.replace(/#{1,6}\s?/g, '');
        text = text.replace(/[*_]{1,3}(.*?)[*_]{1,3}/g, '$1');
        text = text.replace(/`(.+?)`/g, '$1');
        text = text.replace(/```[\s\S]*?```/g, '');
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
        text = text.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, 'รูปภาพ: $1');
        text = text.replace(/^\s*>\s*/gm, '');
        text = text.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '');
        text = text.replace(/^[\s*-+]+/gm, '');
        text = text.trim();

        return text;
    }
}

module.exports = AiController;