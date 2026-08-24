import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Bot, Sparkles, Send, Mic } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { VoiceInteraction } from '../types';

export const PatientAIPage: React.FC = () => {
  const [interactions, setInteractions] = useState<VoiceInteraction[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fetchInteractions = async () => {
    try {
      const res = await api.get('/voice/interactions');
      if (res.data.success) setInteractions(res.data.interactions);
    } catch (err) {
      console.error('Failed to load AI interaction history:', err);
    }
  };

  useEffect(() => {
    fetchInteractions();
  }, []);

  const handleSendPrompt = async (textToSend?: string) => {
    const query = textToSend || prompt;
    if (!query.trim()) return;

    setPrompt('');
    setIsProcessing(true);

    try {
      await api.post('/voice/interactions', { transcript: query });
      fetchInteractions();
    } catch (err) {
      console.error('Failed to send AI voice prompt:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            <Bot className="w-5 h-5 text-teal-600 mr-2" /> AI Bedside Assistant Interactions
          </h1>
          <p className="text-xs text-slate-500">History of voice interactions between SmartCare+ AI and your bedside module</p>
        </div>
      </div>

      {/* Interactive Quick Prompts */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center">
          <Sparkles className="w-4 h-4 text-amber-500 mr-2" /> Ask SmartCare+ AI Assistant
        </h2>

        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={() => handleSendPrompt('What is my current heart rate?')} className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 font-semibold rounded-xl text-slate-700 transition">
            "What is my current heart rate?"
          </button>
          <button onClick={() => handleSendPrompt('Is my oxygen level normal?')} className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 font-semibold rounded-xl text-slate-700 transition">
            "Is my oxygen level normal?"
          </button>
          <button onClick={() => handleSendPrompt('When is my next medicine?')} className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 font-semibold rounded-xl text-slate-700 transition">
            "When is my next medicine?"
          </button>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
            placeholder="Type your healthcare question or request..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:bg-white transition outline-none"
          />

          <button
            onClick={() => handleSendPrompt()}
            disabled={!prompt.trim() || isProcessing}
            className="px-5 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center"
          >
            <Send className="w-4 h-4 mr-1" /> Send
          </button>
        </div>
      </div>

      {/* Interaction History List */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800">Voice Conversation Logs ({interactions.length})</h2>

        <div className="space-y-4">
          {interactions.map((v) => (
            <div key={v.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span className="font-bold text-slate-600">INMP441 Microphone Transcript</span>
                <span>{new Date(v.timestamp).toLocaleString()}</span>
              </div>
              <p className="font-semibold text-slate-900 bg-white p-3 rounded-xl border border-slate-200">"{v.transcript}"</p>
              <div className="pt-1">
                <span className="font-bold text-teal-700 text-[11px] flex items-center mb-1">
                  <Bot className="w-3.5 h-3.5 mr-1" /> SmartCare+ AI Voice Response:
                </span>
                <p className="text-slate-800 bg-teal-50/80 p-3 rounded-xl border border-teal-100 font-medium">"{v.aiResponse}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
};
