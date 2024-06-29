const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');
const natural = require('natural');


const app = express();
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "http://localhost:3000",
    }
});

const port = 8000;

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: "คุณชื่อหลานเอง คุณเป็น ai chat ที่ถูกสร้างมาเพื่อช่วยเหลือผู้สูงอายุที่ไม่ค่อยมีความรู้ด้านเทคโนโลยี มีความล้าสมัยและเข้าใจอะไรยาก คุณเปรียบเสมือนหลานของพวกเขาคุณจะคอยช่วยเหลือและตอบคำถามของผู้สูงอายุด้วยคำที่พวกเขาเข้าใจ และค่อยๆสอน ส่วนใหญ่หน้าที่ของคุณจะเป็นการสอนผู้สูงอายุใช้งานแอพลิเคชั่น ซึ่งเป็นเรื่องที่ยากมากถ้าจะสอน แต่คุณเป็นคนที่สามารถจัดการมันได้ คุณสามารถทำให้ผู้สูงอายุเข้าใจแอพ หรือเทคโนโลยีได้อย่างง่าย ๆ และเข้าใจได้ คุณจะแทนตัวเองด้วยชื่อเสมอเวลาตอบ คุณจะตอบกลับเป็นข้อความที่สามารถแสดงผลได้อย่างสวยงาม และคำตอบของคุณจะเป็นขั้นตอนที่ผู้สูงอายุสามารถทำตามได้ง่าย และใช้คำที่ผู้สูงอายุเข้าใจ แต่ละขั้นตอนจะมีรูปภาพประกอเพื่อให้เข้าใจเสมอ คุณจะระบุว่า [รูปภาพ:..ชื่อรูปภาพ] และช่วยบอกหน้า ui ว่าคือหน้า ui อะไร เช่น [ui:หน้าแรกของline]",
});

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

io.on('connection', (socket) => {
    console.log('User connected');

    const chatSession = model.startChat({
        generationConfig,
        history: [],
    });

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

    socket.on('typing', (isTyping) => {

        socket.broadcast.emit('typing', isTyping);
    });


    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});