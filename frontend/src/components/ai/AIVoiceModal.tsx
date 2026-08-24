import React, { useState } from 'react';
import { Bot, Mic, Send, X, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { VoiceInteraction } from '../../types';

interface AIVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
}

export const AIVoiceModal: React.FC<AIVoiceModalProps> = ({ isOpen, onClose, patientId }) => {
  const [transcript, setTranscript] = useState<string>('');
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string; time: string }[]>([
    {
      sender: 'ai',
      text: 'Hello! I am SmartCare+ AI Bedside Assistant. How may I assist you with your vitals, medications, or nursing calls today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSendPrompt = async (textToSend?: string) => {
    const query = textToSend || transcript;
    if (!query.trim()) return;

    const userMsg = { sender: 'user' as const, text: query, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    setTranscript('');
    setIsProcessing(true);

    try {
      const res = await api.post('/voice/interactions', {
        patientId,
        transcript: query,
      });

      if (res.data.success && res.data.interaction) {
        const aiMsg = {
          sender: 'ai' as const,
          text: res.data.interaction.aiResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'ai', text: 'AI service currently unavailable.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'AI service currently unavailable.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full h-[580px] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md">
              <Bot className="w-6 h-6 text-teal-200" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center">
                SmartCare+ AI Assistant <Sparkles className="w-4 h-4 ml-1 text-amber-300 fill-amber-300" />
              </h3>
              <p className="text-xs text-teal-100">Voice & Natural Language Intelligence</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[82%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  m.sender === 'user' ? 'bg-teal-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                <p>{m.text}</p>
                <span className={`block text-[10px] mt-1.5 ${m.sender === 'user' ? 'text-teal-200 text-right' : 'text-slate-400'}`}>{m.time}</span>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none flex items-center space-x-2 text-xs text-slate-500">
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span>Processing AI response...</span>
              </div>
            </div>
          )}
        </div>

        {/* Sample Voice Quick Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center space-x-2 overflow-x-auto text-xs">
          <button onClick={() => handleSendPrompt('What is my current heart rate?')} className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-full text-slate-600 shrink-0">
            "Heart rate?"
          </button>
          <button onClick={() => handleSendPrompt('When is my next medicine due?')} className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-full text-slate-600 shrink-0">
            "Next medicine?"
          </button>
          <button onClick={() => handleSendPrompt('Request nurse call to room')} className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-full text-slate-600 shrink-0">
            "Call nurse"
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
          <button
            onClick={() => handleSendPrompt('SmartCare, check my current vitals')}
            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition shrink-0"
            title="Simulate INMP441 Microphone Voice Stream"
          >
            <Mic className="w-5 h-5 animate-pulse" />
          </button>

          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
            placeholder="Type or simulate voice command..."
            className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm border-0 focus:ring-2 focus:ring-teal-500 focus:bg-white transition outline-none"
          />

          <button
            onClick={() => handleSendPrompt()}
            disabled={!transcript.trim() || isProcessing}
            className="p-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
