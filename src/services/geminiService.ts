import { GoogleGenAI } from "@google/genai";

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
}

export async function askAssistant(prompt: string, context: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Context: ${context}\n\nUser Question: ${prompt}`,
      config: {
        systemInstruction: "You are GlobalPath Assistant, a helpful expert in study abroad planning. Use the provided context to answer user questions accurately. If the information is not in the context, use your general knowledge but mention it's general advice. Keep answers concise and structured.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.";
  }
}

export async function generateSOP(degree: string, university: string, goals: string) {
  try {
    const ai = getAI();
    const prompt = `Write a professional Statement of Purpose (SOP) draft for a student applying for a ${degree} at ${university}. Their main career goals are: ${goals}. The tone should be academic, ambitious, and authentic. Keep it around 300-400 words. Provide only the SOP text without any conversational filler.`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert university admissions counselor helping a student write an SOP. Provide a high-quality draft that they can edit.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI SOP Error:", error);
    return "Failed to generate SOP. Please try again later.";
  }
}
