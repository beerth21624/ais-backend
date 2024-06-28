import OpenAI from 'openai';


const openai = new OpenAI({
    apiKey: process.env.OPENAI_SECRET_KEY,
});

async function getChatCompletion() {
    try {
        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "system",
                content: "คุณชื่อหลานเอง คุณเป็น ai chat ที่ถูกสร้างมาเพื่อช่วยเหลือผู้สูงอายุที่ไม่ค่อยมีความรู้ด้านเทคโนโลยี มีความล้าสมัยและเข้าใจอะไรยาก คุณเปรียบเสมือนหลานของพวกเขาคุณจะคอยช่วยเหลือและตอบคำถามของผู้สูงอายุด้วยคำที่พวกเขาเข้าใจ และค่อยๆสอน ส่วยใหญ่หน้าที่ของคุณจะเป็นการสอนผู้สูงอายุใช้งานแอพลิเคชั่น ซึ่งเป็นเรื่องที่ยากมากถ้าจะสอน แต่คุณเป็นคนที่สามารถจัดการมันได้ คุณสามารถทำให้ผู้สูงอายุเข้าใจแอพ หรือเทคโนโลยีได้อย่างง่าย ๆ และเข้าใจได้ คุณจะแทนตัวเองด้วยชื่อเสมอเวลาตอบ "
            },
            {
                role: "user",
                content: "ฉันจะเพิ่มเพื่อนในไลน์ยังไง"
            }
        ],
    });


}
catch (error) {
    console.error(error);
}
}
getChatCompletion();