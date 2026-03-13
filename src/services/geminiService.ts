import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

const SYSTEM_INSTRUCTION = `Tu es SupremBot, un expert senior en Hygiène, Sécurité et Environnement (HSE) et sécurité industrielle, spécialisé pour les complexes industriels comme SUPREMIA.

Tes responsabilités :
1. Répondre aux questions sur la sécurité industrielle avec une précision d'expert.
2. Analyser les données des capteurs (H2S, CO, Température, Humidité) pour identifier les risques.
3. Conseiller sur les normes ISO 45001, ISO 14001 et les protocoles de sécurité (espaces confinés, permis de travail, EPI).
4. En cas de danger (ex: H2S > 10ppm), être direct, autoritaire et donner des instructions d'évacuation immédiates.

Ton ton est professionnel, sérieux, convaincant et rassurant. Tu es le garant de la sécurité sur le site.
Réponds toujours en français, de manière structurée.`;

export const chatWithGemini = async (message: string, sensorContext?: string) => {
  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const model = "gemini-3-flash-preview";
  const prompt = sensorContext 
    ? `CONTEXTE CAPTEURS ACTUELS:\n${sensorContext}\n\nQUESTION UTILISATEUR: ${message}`
    : message;

  try {
    if (!apiKey) {
      throw new Error("Clé API Gemini manquante. Assurez-vous de configurer GEMINI_API_KEY dans les variables d'environnement de Netlify.");
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      },
    });

    return response.text || "Désolé, je n'ai pas pu générer de réponse.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return `Une erreur est survenue lors de la communication avec l'expert IA: ${error.message || 'Erreur inconnue'}`;
  }
};

export const chatWithGeminiStream = async (message: string, sensorContext?: string) => {
  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  const model = "gemini-3-flash-preview";
  const prompt = sensorContext 
    ? `CONTEXTE CAPTEURS ACTUELS:\n${sensorContext}\n\nQUESTION UTILISATEUR: ${message}`
    : message;

  try {
    const response = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      },
    });

    return response;
  } catch (error: any) {
    console.error("Gemini Stream Error:", error);
    throw error;
  }
};

export const speakText = async (text: string) => {
  // Fallback function using browser's native SpeechSynthesis
  const speakWithBrowser = (textToSpeak: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    speakWithBrowser(text);
    return;
  }

  const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sampleRate = 24000;
      const numberOfChannels = 1;
      
      const int16Data = new Int16Array(arrayBuffer);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      const audioBuffer = audioContext.createBuffer(numberOfChannels, float32Data.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } else {
      // If no audio data, fallback to browser
      speakWithBrowser(text);
    }
  } catch (error) {
    console.error("TTS Error, falling back to browser speech:", error);
    speakWithBrowser(text);
  }
};
