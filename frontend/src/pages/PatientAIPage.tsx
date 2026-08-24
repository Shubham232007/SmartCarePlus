import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import {
  Bot,
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertCircle,
  Clock,
  Radio,
  CheckCircle2,
  BellRing,
} from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { VoiceInteraction } from '../types';
import { useVoiceAssistant, VoiceState } from '../hooks/useVoiceAssistant';

export const PatientAIPage: React.FC = () => {
  const [interactions, setInteractions] = useState<VoiceInteraction[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [nurseAlertBadge, setNurseAlertBadge] = useState<string | null>(null);

  const fetchInteractions = async () => {
    try {
      const res = await api.get('/voice/interactions');
      if (res.data.success) {
        setInteractions(res.data.interactions);
      }
    } catch (err) {
      console.error('Failed to load AI interaction history:', err);
    }
  };

  useEffect(() => {
    fetchInteractions();
  }, []);

  const handleSendPrompt = async (textToSend?: string) => {
    const query = (textToSend || prompt).trim();
    if (!query) return;

    setPrompt('');
    setIsProcessing(true);
    setNurseAlertBadge(null);

    try {
      const res = await api.post('/voice/interactions', { transcript: query });
      if (res.data.success && res.data.interaction) {
        const newInteraction: VoiceInteraction = res.data.interaction;
        setInteractions((prev) => [newInteraction, ...prev.filter((i) => i.id !== newInteraction.id)]);

        if (res.data.nurseCallTriggered) {
          setNurseAlertBadge('Nurse Call Alert has been dispatched to the nursing station!');
        }

        // Speak response aloud through speakers
        if (newInteraction.aiResponse) {
          setActiveSpeechId(newInteraction.id);
          await speakAIResponse(newInteraction.aiResponse);
          setActiveSpeechId(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to send AI voice prompt:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Connect voice hook
  const {
    state: voiceState,
    interimTranscript,
    error: voiceError,
    isListening,
    isSpeaking,
    isSupported,
    startListening,
    stopListening,
    speakAIResponse,
    stopSpeaking,
    resetError,
  } = useVoiceAssistant((finalTranscript) => {
    // Automatically submit once user finishes speaking
    handleSendPrompt(finalTranscript);
  });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      resetError();
      startListening();
    }
  };

  const handlePlayVoice = async (interaction: VoiceInteraction) => {
    if (isSpeaking && activeSpeechId === interaction.id) {
      stopSpeaking();
      setActiveSpeechId(null);
    } else {
      stopSpeaking();
      setActiveSpeechId(interaction.id);
      await speakAIResponse(interaction.aiResponse);
      setActiveSpeechId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center">
            <span className="p-2.5 bg-teal-50 text-teal-600 rounded-2xl mr-3 border border-teal-100 shadow-xs">
              <Bot className="w-6 h-6" />
            </span>
            SmartCare+ AI Voice Assistant
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time bedside conversational AI powered by OpenAI GPT-4o-mini & live patient telemetry
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <Radio className="w-3.5 h-3.5 mr-1.5 text-teal-500 animate-pulse" />
            Live Bedside Audio
          </span>
        </div>
      </div>

      {/* Voice Assistant Interactive Hub */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto">
          {/* Main Microphone Button */}
          <div className="relative flex items-center justify-center pt-2">
            {/* Animated Pulsing Rings when Listening */}
            {isListening && (
              <>
                <span className="absolute w-36 h-36 bg-teal-400/20 rounded-full animate-ping" />
                <span className="absolute w-48 h-48 bg-teal-400/10 rounded-full animate-pulse" />
              </>
            )}

            {isSpeaking && (
              <span className="absolute w-36 h-36 bg-amber-400/20 rounded-full animate-pulse" />
            )}

            <button
              onClick={handleMicClick}
              disabled={isProcessing}
              title={isListening ? 'Click to stop listening' : 'Click to start speaking'}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${
                isListening
                  ? 'bg-gradient-to-tr from-rose-500 to-red-600 text-white ring-4 ring-rose-400/50'
                  : isSpeaking
                  ? 'bg-gradient-to-tr from-amber-500 to-yellow-600 text-white ring-4 ring-amber-400/50'
                  : isProcessing
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 hover:from-teal-400 hover:to-emerald-300 ring-4 ring-teal-500/30'
              }`}
            >
              {isListening ? (
                <MicOff className="w-10 h-10 animate-bounce" />
              ) : isSpeaking ? (
                <Volume2 className="w-10 h-10 animate-pulse" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>
          </div>

          {/* Status Text & State Badge */}
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/15">
              {isListening ? (
                <>
                  <span className="w-2 h-2 bg-rose-400 rounded-full animate-ping" />
                  <span className="text-rose-300">🎙️ Listening... Speak your question now</span>
                </>
              ) : isProcessing ? (
                <>
                  <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" />
                  <span className="text-teal-200">🤔 Processing with OpenAI GPT-4o-mini...</span>
                </>
              ) : isSpeaking ? (
                <>
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-amber-200">🔊 Speaking AI Response...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <span className="text-slate-300">Tap the mic to talk with SmartCare+</span>
                </>
              )}
            </div>

            {/* Interim Transcript Live Display */}
            {interimTranscript && (
              <p className="text-sm font-medium text-teal-200 italic bg-black/30 px-4 py-2 rounded-2xl backdrop-blur-sm border border-teal-500/20 max-w-lg mx-auto">
                "{interimTranscript}"
              </p>
            )}

            {/* Speaking Stop Button */}
            {isSpeaking && (
              <div>
                <button
                  onClick={stopSpeaking}
                  className="inline-flex items-center px-4 py-1.5 bg-white/15 hover:bg-white/25 rounded-full text-xs font-semibold text-white transition mt-2"
                >
                  <VolumeX className="w-3.5 h-3.5 mr-1.5" /> Stop Speaking Audio
                </button>
              </div>
            )}

            {/* Voice Error Display */}
            {voiceError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-xs text-rose-200 flex items-center justify-between max-w-md mx-auto">
                <span className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-rose-400 shrink-0" />
                  {voiceError}
                </span>
                <button onClick={resetError} className="underline text-[11px] ml-2 text-rose-300 hover:text-white">
                  Dismiss
                </button>
              </div>
            )}

            {/* Nurse Alert Confirmation */}
            {nurseAlertBadge && (
              <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-xs text-amber-200 flex items-center justify-center space-x-2 max-w-md mx-auto">
                <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
                <span className="font-semibold">{nurseAlertBadge}</span>
              </div>
            )}

            {!isSupported && (
              <p className="text-[11px] text-amber-300/80">
                ⚠️ Browser voice recognition unavailable. Type your question below or use Google Chrome / Microsoft Edge.
              </p>
            )}
          </div>

          {/* Quick Voice Chips */}
          <div className="w-full pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Sample Voice Questions
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {[
                'What is my current heart rate?',
                'Is my oxygen level normal?',
                'What is my temperature?',
                'When is my next medicine?',
                'I need a nurse.',
              ].map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendPrompt(query)}
                  disabled={isProcessing}
                  className="px-3.5 py-2 bg-white/10 hover:bg-teal-500/20 hover:border-teal-400/40 border border-white/10 rounded-2xl text-slate-200 hover:text-white transition font-medium text-xs backdrop-blur-xs disabled:opacity-50"
                >
                  "{query}"
                </button>
              ))}
            </div>
          </div>

          {/* Fallback Text Input Bar */}
          <div className="w-full pt-2">
            <div className="flex items-center space-x-2 bg-white/10 p-1.5 rounded-2xl border border-white/15 backdrop-blur-md">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                placeholder="Or type your medical question here..."
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 outline-none"
              />
              <button
                onClick={() => handleSendPrompt()}
                disabled={!prompt.trim() || isProcessing}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl transition inline-flex items-center shadow-md"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation History */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Bedside Voice Interaction Logs</h2>
            <p className="text-xs text-slate-500">
              Complete transcript history recorded by bedside microphone and OpenAI Assistant
            </p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
            {interactions.length} Interactions
          </span>
        </div>

        {interactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs space-y-2">
            <Bot className="w-8 h-8 mx-auto text-slate-300" />
            <p>No voice interactions yet. Tap the microphone above to start your first conversation.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {interactions.map((v) => (
              <div
                key={v.id}
                className="p-5 bg-slate-50 hover:bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3 transition"
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-bold text-slate-600 flex items-center">
                    <Mic className="w-3.5 h-3.5 mr-1 text-teal-600" /> Patient Voice Input
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(v.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* User Spoken Prompt */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold">
                  "{v.transcript}"
                </div>

                {/* AI Spoken Response */}
                <div className="bg-teal-50/70 p-4 rounded-xl border border-teal-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-800 text-xs flex items-center">
                      <Bot className="w-3.5 h-3.5 mr-1.5 text-teal-600" /> SmartCare+ AI Voice Response
                    </span>

                    <button
                      onClick={() => handlePlayVoice(v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center transition shadow-2xs ${
                        isSpeaking && activeSpeechId === v.id
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      {isSpeaking && activeSpeechId === v.id ? (
                        <>
                          <VolumeX className="w-3 h-3 mr-1" /> Stop Audio
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 mr-1" /> Hear Response
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-slate-800 text-xs leading-relaxed font-medium">"{v.aiResponse}"</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DisclaimerFooter />
    </div>
  );
};
