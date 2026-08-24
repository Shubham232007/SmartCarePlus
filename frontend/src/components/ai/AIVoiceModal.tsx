import React, { useState } from 'react';
import { Bot, Mic, MicOff, Send, X, Sparkles, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';

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

  const handleSendPrompt = async (textToSend?: string) => {
    const query = (textToSend || transcript).trim();
    if (!query) return;

    const userMsg = {
      sender: 'user' as const,
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTranscript('');
    setIsProcessing(true);

    try {
      const res = await api.post('/voice/interactions', {
        patientId,
        transcript: query,
      });

      if (res.data.success && res.data.interaction) {
        const aiReply = res.data.interaction.aiResponse;
        const aiMsg = {
          sender: 'ai' as const,
          text: aiReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        speakAIResponse(aiReply);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'AI service currently unavailable.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'AI service currently unavailable. Please contact nursing staff for urgent assistance.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const {
    isListening,
    isSpeaking,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    speakAIResponse,
    stopSpeaking,
  } = useVoiceAssistant((finalTranscript) => {
    handleSendPrompt(finalTranscript);
  });

  if (!isOpen) return null;

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
                SmartCare+ AI Voice Assistant <Sparkles className="w-4 h-4 ml-1 text-amber-300 fill-amber-300" />
              </h3>
              <p className="text-xs text-teal-100">Live Speech Interaction & Clinical Intelligence</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSpeaking();
              stopListening();
              onClose();
            }}
            className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[82%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                  m.sender === 'user'
                    ? 'bg-teal-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                <p>{m.text}</p>
                <span
                  className={`block text-[10px] mt-1.5 ${
                    m.sender === 'user' ? 'text-teal-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {m.time}
                </span>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none flex items-center space-x-2 text-xs text-slate-500 shadow-xs">
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span>Processing OpenAI response...</span>
              </div>
            </div>
          )}

          {isListening && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center space-x-2 animate-pulse">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              <span>Listening to your voice... {interimTranscript ? `"${interimTranscript}"` : 'Speak now'}</span>
            </div>
          )}

          {isSpeaking && (
            <div className="flex justify-between items-center p-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
              <span className="flex items-center">
                <Volume2 className="w-4 h-4 mr-1.5 text-amber-600 animate-pulse" />
                Speaking response...
              </span>
              <button
                onClick={stopSpeaking}
                className="px-2 py-0.5 bg-amber-200/80 hover:bg-amber-300 text-amber-900 rounded-md font-semibold text-[10px]"
              >
                Mute Audio
              </button>
            </div>
          )}

          {voiceError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {voiceError}
            </div>
          )}
        </div>

        {/* Sample Voice Quick Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center space-x-2 overflow-x-auto text-xs">
          <button
            onClick={() => handleSendPrompt('What is my current heart rate?')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-full text-slate-600 shrink-0 font-medium"
          >
            "Heart rate?"
          </button>
          <button
            onClick={() => handleSendPrompt('When is my next medicine due?')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-full text-slate-600 shrink-0 font-medium"
          >
            "Next medicine?"
          </button>
          <button
            onClick={() => handleSendPrompt('I need a nurse.')}
            className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-full text-slate-600 shrink-0 font-medium"
          >
            "Call nurse"
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`p-2.5 rounded-xl transition shrink-0 ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-teal-50 hover:bg-teal-100 text-teal-700'
            }`}
            title={isListening ? 'Stop listening' : 'Start speaking with microphone'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
            placeholder="Type or click mic to speak..."
            className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm border-0 focus:ring-2 focus:ring-teal-500 focus:bg-white transition outline-none"
          />

          <button
            onClick={() => handleSendPrompt()}
            disabled={!transcript.trim() || isProcessing}
            className="p-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition shadow-xs"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
