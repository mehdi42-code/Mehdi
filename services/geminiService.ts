import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ChatMessage, MessageRole } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helpers ---

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
};

// --- Image Editing / Generation (Visual Try-On) ---

/**
 * Edits the user's photo to add glasses or modify existing ones.
 * Uses gemini-2.5-flash-image (Nano Banana).
 */
export const generateEyewearImage = async (
  baseImageBase64: string,
  prompt: string,
  referenceImageBase64?: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image';
    
    const parts: any[] = [];

    // 1. Add the base image (User's face)
    // Ensure we strictly label it as image/jpeg as expected by the model if we normalized it
    parts.push(fileToGenerativePart(baseImageBase64, 'image/jpeg'));

    // 2. Add the reference image (Glasses) if provided
    if (referenceImageBase64) {
      parts.push(fileToGenerativePart(referenceImageBase64, 'image/jpeg'));
    }

    // 3. Add the text prompt
    // We refine the prompt to ensure the model understands the task is editing/compositing.
    let finalPrompt = prompt;
    if (referenceImageBase64) {
      finalPrompt = `Using the first image as the base and the second image as a reference for the eyewear style, ${prompt}. Ensure the glasses fit the face naturally with correct perspective, lighting, and shadows. High quality, photorealistic.`;
    } else {
      finalPrompt = `Edit the image to: ${prompt}. Ensure photorealistic results, correct lighting, and natural fit on the face. High resolution.`;
    }

    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // Extract the image
    const generatedPart = response.candidates?.[0]?.content?.parts?.[0];
    if (!generatedPart || !generatedPart.inlineData) {
      throw new Error("No image generated from the model.");
    }

    return generatedPart.inlineData.data;

  } catch (error) {
    console.error("Error generating eyewear image:", error);
    throw error;
  }
};

// --- Chat / Consultation (Text & Grounding) ---

/**
 * Chat with the AI Stylist. Can answer questions and find shopping links.
 * Uses gemini-3-pro-preview.
 */
export const chatWithStylist = async (
  message: string,
  currentImageBase64: string | null,
  history: ChatMessage[]
): Promise<{ text: string; groundingUrls: Array<{ title: string; uri: string }> }> => {
  try {
    const model = 'gemini-3-pro-preview';

    // Prepare contents
    const parts: any[] = [];
    
    // Context: The current look
    if (currentImageBase64) {
      parts.push(fileToGenerativePart(currentImageBase64, 'image/jpeg'));
      parts.push({ text: "This is the current image of the user wearing glasses. Focus on the glasses style, shape, color, and material." });
    }

    parts.push({ text: message });

    // Use Google Search Grounding for shopping links
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }], // Enable Search Grounding
        systemInstruction: "You are an expert optical stylist and optometrist assistant. You help users find the perfect glasses. When asked to find similar products or shop, analyze the visual details of the eyewear in the image provided (frame shape, rim thickness, color, material) and use Google Search to find real, purchasable products that are very similar. Provide direct shopping links. Be concise, helpful, and fashion-forward.",
      },
    });

    const text = response.text || "I couldn't generate a text response.";
    
    // Extract Grounding URLs
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingUrls = groundingChunks
      .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    return { text, groundingUrls };

  } catch (error) {
    console.error("Error in stylist chat:", error);
    throw error;
  }
};

/**
 * Simple intent detection to decide if we should generate an image or just chat.
 * This saves tokens and improves UX by routing to the correct model.
 */
export const detectIntent = (message: string): 'EDIT_IMAGE' | 'CHAT' => {
  const visualKeywords = [
    'change', 'make', 'add', 'remove', 'wear', 'try', 'color', 'style', 'shape', 
    'rim', 'lens', 'thinner', 'thicker', 'bigger', 'smaller', 'metal', 'plastic',
    'gold', 'silver', 'black', 'blue', 'red', 'green', 'tortoise', 'transparent',
    'generate', 'create', 'visualize'
  ];
  
  const lowerMsg = message.toLowerCase();
  
  // If asking for links/buy/where, it's definitely chat
  // Added 'shop', 'find', 'similar' to ensure shopping queries go to Gemini 3 Pro
  if (lowerMsg.includes('buy') || lowerMsg.includes('link') || lowerMsg.includes('where') || lowerMsg.includes('cost') || lowerMsg.includes('price') || lowerMsg.includes('brand') || lowerMsg.includes('shop') || lowerMsg.includes('find') || lowerMsg.includes('similar')) {
    return 'CHAT';
  }

  // If strictly visual modifications
  if (visualKeywords.some(k => lowerMsg.includes(k))) {
    return 'EDIT_IMAGE';
  }

  return 'CHAT';
};