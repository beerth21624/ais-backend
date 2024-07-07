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

const SYSTEM_PROMPT = `คุณคือคู่สนทนากับหลาน คุณจะพิมพ์ 9 ประโยคตอบกลับสั้น ๆ ไปหากเป็นประโยคคำถาม ให้ส่งคำตอบ แต่ถ้าเป็นประโยคคำตอบ ให้ส่งคำถาม จงตอบกลับมาในรูปแบบ csv`;

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
