import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Bot, User, X, Volume2, VolumeX } from 'lucide-react';
import { chatWithGeminiStream, speakText } from '../services/geminiService';
import { GenerateContentResponse } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export default function Chatbot({ sensorContext }: { sensorContext: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "Bonjour, je suis SupremBot, votre expert HSE SUPREMIA. Comment puis-je vous aider aujourd'hui ?", timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'fr-FR';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
          // Auto-send if it's a voice command? Let's just set the input for now or auto-send.
          // Auto-sending is better for "talk to bot" experience.
          handleVoiceSend(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const handleVoiceSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', text: text, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const stream = await chatWithGeminiStream(text, sensorContext);
      let fullResponse = "";
      let firstSentenceSpoken = false;

      setMessages(prev => [...prev, { role: 'bot', text: "", timestamp: new Date() }]);

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        const chunkText = c.text || "";
        fullResponse += chunkText;

        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'bot') {
            return [...prev.slice(0, -1), { ...last, text: fullResponse }];
          }
          return prev;
        });

        // Trigger TTS for the first chunk as soon as it's ready for faster perceived response
        if (isVoiceEnabled && !firstSentenceSpoken && (fullResponse.includes('.') || fullResponse.includes('!') || fullResponse.includes('?') || fullResponse.split(' ').length > 3)) {
          const sentences = fullResponse.split(/[.!?]/);
          const firstPart = sentences[0] + (fullResponse.match(/[.!?]/)?.[0] || "");
          if (firstPart.trim().length > 0) { 
            speakText(firstPart);
            firstSentenceSpoken = true;
          }
        }
      }

      // If the response was too short to trigger the first sentence logic, or if voice is enabled,
      // we might want to speak the rest. But for simplicity and to avoid overlapping, 
      // let's just speak the full response if it hasn't started yet.
      if (isVoiceEnabled && !firstSentenceSpoken) {
        await speakText(fullResponse);
      } else if (isVoiceEnabled && firstSentenceSpoken) {
        // Speak the rest of the response
        const rest = fullResponse.substring(fullResponse.indexOf(fullResponse.split(/[.!?]/)[0]) + fullResponse.split(/[.!?]/)[0].length + 1);
        if (rest.trim().length > 0) {
          await speakText(rest);
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      setMessages(prev => [...prev, { role: 'bot', text: "Désolé, une erreur est survenue.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const stream = await chatWithGeminiStream(userMsg, sensorContext);
      let fullResponse = "";
      let firstSentenceSpoken = false;

      setMessages(prev => [...prev, { role: 'bot', text: "", timestamp: new Date() }]);

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        const chunkText = c.text || "";
        fullResponse += chunkText;

        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'bot') {
            return [...prev.slice(0, -1), { ...last, text: fullResponse }];
          }
          return prev;
        });

        // Trigger TTS for the first chunk as soon as it's ready
        if (isVoiceEnabled && !firstSentenceSpoken && (fullResponse.includes('.') || fullResponse.includes('!') || fullResponse.includes('?') || fullResponse.split(' ').length > 3)) {
          const sentences = fullResponse.split(/[.!?]/);
          const firstPart = sentences[0] + (fullResponse.match(/[.!?]/)?.[0] || "");
          if (firstPart.trim().length > 0) {
            speakText(firstPart);
            firstSentenceSpoken = true;
          }
        }
      }

      if (isVoiceEnabled && !firstSentenceSpoken) {
        await speakText(fullResponse);
      } else if (isVoiceEnabled && firstSentenceSpoken) {
        const sentences = fullResponse.split(/[.!?]/);
        const rest = sentences.slice(1).join(". ");
        if (rest.trim().length > 0) {
          await speakText(rest);
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      setMessages(prev => [...prev, { role: 'bot', text: "Désolé, une erreur est survenue.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="glass w-96 h-[500px] mb-4 flex flex-col overflow-hidden shadow-2xl border-slate-700"
          >
            {/* Header */}
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ocp-green flex items-center justify-center">
                  <Bot size={24} className="text-black" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">SupremBot AI</h3>
                  <p className="text-[10px] text-ocp-green flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ocp-green animate-pulse" />
                    Expert HSE SUPREMIA Connecté
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                >
                  {isVoiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "bg-ocp-green text-black font-bold rounded-tr-none" 
                      : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-700">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex gap-2">
              <button 
                onClick={toggleListening}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  isListening ? "bg-rose-500 text-white animate-pulse" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                )}
                title="Parler au bot"
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isListening ? "Je vous écoute..." : "Posez votre question sécurité..."}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-ocp-green transition-colors"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || isListening}
                className="bg-ocp-green hover:opacity-80 disabled:opacity-50 text-black p-2 rounded-xl transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-ocp-green rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all animate-float border-4 border-slate-900"
      >
        <Bot size={32} className="text-black" />
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-ocp-green border-2 border-slate-900 rounded-full" />
        )}
      </button>
    </div>
  );
}
