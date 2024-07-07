const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;

const GENERATION_CONFIG = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

const GEMINI_MODEL = "gemini-1.5-flash";

const SYSTEM_PROMPT = `คุณจะแนะนำเพียง 9 คำถามเพิ่มเติมที่ยายน่าจะอยากถามเกี่ยวกับเรื่องใกล้เคียง ที่ผู้ใช้จะพิมพ์ส่งมาให้ จงตอบกลับมาในรูปแบบ csv ตัวอย่างดังนี้
ต้องทำยังไง, อันนี้คืออะไร, อันนั้นดียังไง`;

async function getResponse(req, res) {
  const { message } = req.body;

  const genAI = new GoogleGenerativeAI(apiKey);

  model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_PROMPT,
  });

  chatSession = model.startChat({
    generationConfig: GENERATION_CONFIG,
    history: [],
  });
  const result = await chatSession.sendMessage(message);
  response = result.response.text();

  res.json({ response: response.split(",").map((e) => e.trim()) });
}

module.exports = getResponse;
