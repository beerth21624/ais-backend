const { GoogleGenerativeAI } = require("@google/generative-ai");
const natural = require('natural');
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

class AiController {
    static async processMessage(req, res) {
        try {
            const { message } = req.body;

            console.log('Received message:', message);

            // Classify the message
            const classification = await AiController.classifyMessage(message);

            console.log('Classification:', classification)

        

            // Fetch the appropriate character based on classification
            const character = await CharacterSchema.findOne({
                name: { $regex: new RegExp(classification, 'i') }
            });

            if (!character) {
                return res.status(404).json({ error: 'Character not found' });
            }

            // Fetch folders and process knowledge
            const folders = await FolderSchema.find({ _id: { $in: character.folder_knowledge } });
            const imageManager = new ImageKnowledgeManager();
            const imageKnowledge = folders.map(folder => folder.image_knowledge);
            imageManager.addImages(imageKnowledge);

            const instructionKnowledgeText = KnowledgeProcessor.generateInstructions(folders);
            let systemPrompt = character.prompt + instructionKnowledgeText;
            if (Object.keys(imageManager.imageMap).length > 0) {
                systemPrompt += 'คุณจะตอบกลับเป็นข้อความปกติก ไม่เอา markdownใดๆ';
            }

            // Generate response
            const model = genAI.getGenerativeModel({
                model: GEMINI_MODEL,
                systemInstruction: systemPrompt,
            });

            const chatSession = model.startChat({ generationConfig: GENERATION_CONFIG, history: [] });
            const result = await chatSession.sendMessage(message);
            let response = result.response.text();

            // // Process image references
            // response = response.replace(/\[รูปภาพ:([^\]]+)\]/g, (match, description) => {
            //     const mostSimilarKey = imageManager.findMostSimilarImage(description);
            //     return mostSimilarKey ? `![${description}](${imageManager.imageMap[mostSimilarKey]})` : '';
            // });

            response = AiController.removeMarkdown(response);


            res.json({ classification, response });
        } catch (error) {
            console.error('Error processing message:', error);
            res.status(500).json({ error: 'An error occurred while processing the message' });
        }
    }


    static async classifyMessage(message) {
        const classifierInstruction = `คุณเป็น AI ที่เชี่ยวชาญในการวิเคราะห์และจำแนกประเภทของข้อความ โดยเฉพาะอย่างยิ่งในการระบุว่าข้อความนั้นเกี่ยวข้องกับประเภทใดใน 4 ประเภทต่อไปนี้:
        Agent Application: ข้อความที่เกี่ยวกับการสอนหรืออธิบายวิธีการใช้งานแอพพลิเคชันต่างๆ
        Agent Protect: ข้อความที่เกี่ยวกับความปลอดภัยทางออนไลน์ การตรวจสอบความน่าเชื่อถือของข้อมูล หรือการป้องกันภัยคุกคามทางไซเบอร์
        Agent News: ข้อความที่เกี่ยวกับการนำเสนอหรือสรุปข่าวสารที่น่าสนใจ
        Agent Travel: ข้อความที่เกี่ยวกับการแนะนำสถานที่ท่องเที่ยว การวางแผนการเดินทาง หรือข้อมูลเกี่ยวกับการท่องเที่ยว
        เมื่อได้รับข้อความใดๆ คุณจะวิเคราะห์เนื้อหาและตอบกลับด้วยชื่อประเภทที่เหมาะสมที่สุดเพียงอย่างเดียว โดยไม่มีข้อความอื่นใดเพิ่มเติม ข้อควรระวัง: หากข้อความนั้นเกี่ยวข้องกับการแพทย์ที่มีความเสี่ยงและอันตราย ฉันจะไม่ให้คำแนะนำใด ๆ และจะไม่ตอบกลับข้อความนั้น ๆ`;

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: classifierInstruction });
        const chatSession = model.startChat({ generationConfig: GENERATION_CONFIG, history: [] });

        const result = await chatSession.sendMessage(message);
        return result.response.text().trim();
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