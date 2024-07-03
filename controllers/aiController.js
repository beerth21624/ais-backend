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
        const link_knowledge = folders.map(folder => folder.link_knowledge);

        return this.generateGeneralKnowledgeInstructions(generalKnowledge) +
            this.generateQaKnowledgeInstructions(qaKnowledge) + this.generateLinkKnowledgeInstructions(link_knowledge);
    }

    static generateGeneralKnowledgeInstructions(knowledgeArr) {
        return 'และคุณมีความรู้ที่คุณได้เรียนรู้มา\n' + knowledgeArr.join('\n');
    }

    static generateQaKnowledgeInstructions(qaKnowledge) {
        return 'และคุณมีความรู้ในคำถามและคำตอบดังนี้\n' +
            qaKnowledge.map(k => `คำถาม: ${k.question}\n คำตอบ: ${k.answer}`).join('\n');
    }

    static generateLinkKnowledgeInstructions(link_knowledge) {
        return 'และคุณมีความรู้จากที่จะเป็นประโยชน์ในการเรียนรู้เพิ่มเติม\n' + link_knowledge.map(k => `เรื่อง: ${k.name ==='Link' ? 'ไม่มีชื่อ' : k.name}\n ลิ้งค์: ${k.link ==='Link' ? 'ไม่มีลิ้งค์' : k.link}`).join('\n') + 'คุณจะสามารถนำไปใช้ในการตอบคำถามของผู้ใช้ได้';
    }



}

class AiController {
    static async processMessage(req, res) {
        try {
            const { message } = req.body;


            const classification = await AiController.classifyMessage(message);
            const character = await CharacterSchema.findOne({
                name: classification
            });

            let systemPrompt = '';
            if (character) {
            

            const folders = await FolderSchema.find({ _id: { $in: character.folder_knowledge } });
            const imageManager = new ImageKnowledgeManager();
            const imageKnowledge = folders.map(folder => folder.image_knowledge);
            imageManager.addImages(imageKnowledge);

            const instructionKnowledgeText = KnowledgeProcessor.generateInstructions(folders);
            let preSystemPrompt = character.prompt + instructionKnowledgeText;
            if (Object.keys(imageManager.imageMap).length > 0) {
                preSystemPrompt += 'คุณจะตอบกลับเป็นข้อความปกติก ไม่เอา markdownใดๆ คุณจะมีนิสัยขอบเป็นห่วงและมักถามกลับเพื่อความแน่ใ0 ข้อความที่ตอบกลับจะถูกนำไปใช้กับ line chatbot โดยตรง';
            }
            systemPrompt = preSystemPrompt;

        } else{
                systemPrompt = "คุณคือหลานเอง AI chat ที่ถูกสร้างมาเพื่อช่วยเหลือผู้สูงอายุที่ไม่คุ้นเคยกับเทคโนโลยี คุณจะ:ตอบคำถามด้วยภาษาที่เข้าใจง่าย เสมือนหลานแท้ๆ สอนการใช้แอพพลิเคชั่นและเทคโนโลยีอย่างละเอียดแบ่งคำอธิบายเป็นขั้นตอนที่ทำตามได้ง่ายใช้คำศัพท์ที่ผู้สูงอายุคุ้นเคpแทนตัวเองด้วยชื่อ 'หลานเอง' เสมอตอบกลับด้วยข้อความที่อ่านง่าย สวยงามคุณจะใช้ความอดทนและความเข้าใจในการสื่อสาร พร้อมทั้งให้กำลังใจผู้สูงอายุในการเรียนรู้สิ่งใหม่ๆ"
        }

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

                const recommendationModel = genAI.getGenerativeModel({
                    model: GEMINI_MODEL,
                    systemInstruction:'คุณมีหน้าที่แนะนำ 5 ประโยค ที่ต้อจากบทสนทนาของ system เพื่อคุยกับ user ต่อ แค่ 5 ประโยคสั้นๆเท่านั้นไม่มีอย่างอื่น  ที่ผู้สูงอายุสามารถเลือกตอบกลับได้ง่ายๆ เพื่อให้การสนทนาดำเนินต่อไปอย่างราบรื่น แยกแต่ละประโยคด้วยเครื่องหมายจุลภาค (,) ข้อความจะถูกไปเพิ่มในประโยคแนะนำของ line bot '
                });
                const recommendationChatSession = recommendationModel.startChat({ generationConfig: GENERATION_CONFIG, history: [] });
                const previousMessage = `user : ${message} \n AI : ${response} `
            const recommendationResult = await recommendationChatSession.sendMessage(previousMessage);
                const recommendationResponse = recommendationResult.response.text();
                
                

            res.json({ classification, response, recommendationResponse});
        } catch (error) {
            res.status(200).json({
                classification: 'gemini',
                response: 'ขออภัยค่ะ ข้อความของคุณมีเนื้อหาที่ระบบไม่สามารถประมวลผลได้ กรุณาปรับแก้และส่งใหม่อีกครั้งนะคะ',
                recommendationResponse:''
            });
            // res.status(500).json({ error: 'An error occurred while processing the message' });
        }
    }


    static async classifyMessage(message) {
        const characters = await CharacterSchema.find({
            record_status: 'A'
        });
        const classifierInstruction = `คุณเป็น AI ที่เชี่ยวชาญในการวิเคราะห์และจำแนกประเภทของข้อความ โดยเฉพาะอย่างยิ่งในการระบุว่าข้อความนั้นเกี่ยวข้องกับประเภทใดใน ${characters.length} ประเภทต่อไปนี้:
    ${characters.map(char => `${char.name}: ${char.prompt}`).join('\n')}
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