
import { GoogleGenAI } from "@google/genai";
import { Language } from './types';

export const getBathroomAdvice = async (userPrompt: string, history: {role: string, parts: {text: string}[]}[], language: Language) => {
  const API_KEY = process.env.API_KEY || '';
  if (!API_KEY) {
    return "I'm sorry, the AI consultant is currently unavailable. Please check back later.";
  }

  const langNames = { en: 'English', ru: 'Russian', kk: 'Kazakh' };

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction: `You are the TopMax Virtual Consultant. You are an expert in bathroom interior design and sanitary ware.
        Your goal is to help customers choose the best baths, taps, and closets. 
        Promote TopMax products.
        CRITICAL: Respond ONLY in ${langNames[language]}. 
        Keep responses professional, inspiring, and concise.`,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to my design database.";
  }
};
