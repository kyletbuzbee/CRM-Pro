import { GoogleGenAI } from "@google/genai";
import { Prospect } from "../types";

// Uses Vite standard for environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export async function getAIAdvisorInsights(prospects: Prospect[]) {
  const model = "gemini-2.0-flash"; // Updated to a stable model name if needed
  const prompt = `
    As a senior sales analyst for K-L Recycling (Tyler, TX), 
    analyze this prospect list: ${JSON.stringify(prospects.slice(0, 15))}
    Provide:
    1. Opportunities (Industry clusters)
    2. Warnings (Stale leads)
    3. Recommendations for next 7 days.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating insights.";
  }
}

export async function discoverNewProspects(area: string, currentCids: string[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Find metal fabrication, roofing, and manufacturing companies in ${area} Tyler, TX. 
      Identify locations that might need roll-off scrap containers. 
      Exclude these known IDs: ${currentCids.join(', ')}`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text;
    const links = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { text, links };
  } catch (error) {
    console.error("Discovery Error:", error);
    return { text: "Discovery tool currently unavailable.", links: [] };
  }
}

export async function processCommand(command: string, prospects: Prospect[]) {
  const prompt = `
    You are the K-L Recycling CRM Assistant. 
    Command: "${command}"
    Data Context: ${JSON.stringify(prospects)}
    
    Based on the command, explain what the user should do or find. 
    Be concise and professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "I couldn't process that command. Try something like 'Who is my highest priority in 75702?'";
  }
}