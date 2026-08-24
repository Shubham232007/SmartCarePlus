import { useState, useEffect, useRef, useCallback } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface UseVoiceAssistantReturn {
  state: VoiceState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  speakAIResponse: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  resetError: () => void;
}

// Check for SpeechRecognition support across browsers (Chrome, Edge, Safari)
const getSpeechRecognition = (): (new () => any) | null => {
  if (typeof window === 'undefined') return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
};

export const useVoiceAssistant = (
  onSpeechResult?: (finalTranscript: string) => void
): UseVoiceAssistantReturn => {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const onResultCallbackRef = useRef(onSpeechResult);
  onResultCallbackRef.current = onSpeechResult;

  const isSupported = typeof window !== 'undefined' && (
    getSpeechRecognition() !== null || 'speechSynthesis' in window
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setState((prev) => (prev === 'speaking' ? 'idle' : prev));
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore if already stopped
      }
    }
    setState((prev) => (prev === 'listening' ? 'idle' : prev));
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    stopSpeaking();

    const SpeechRecognitionClass = getSpeechRecognition();

    if (!SpeechRecognitionClass) {
      setError('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      setState('error');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setState('listening');
        setTranscript('');
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (finalStr.trim()) {
          setTranscript(finalStr.trim());
          setInterimTranscript('');
          if (onResultCallbackRef.current) {
            onResultCallbackRef.current(finalStr.trim());
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access is required for voice interaction. Please allow microphone permissions.');
        } else if (event.error === 'no-speech') {
          setError("I couldn't hear your question. Please try again.");
        } else if (event.error !== 'aborted') {
          setError(`Voice input error: ${event.error}`);
        }
        setState('error');
      };

      recognition.onend = () => {
        setState((prev) => (prev === 'listening' ? 'idle' : prev));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start SpeechRecognition:', err);
      setError('Failed to activate microphone. Please try again.');
      setState('error');
    }
  }, [stopSpeaking]);

  const speakAIResponse = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!synthRef.current || !text) {
          resolve();
          return;
        }

        // Cancel any active speech
        synthRef.current.cancel();

        const cleanText = text.replace(/[*_#`]/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';

        // Select a natural voice if available
        const voices = synthRef.current.getVoices();
        const naturalVoice = voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
        );
        if (naturalVoice) {
          utterance.voice = naturalVoice;
        }

        utterance.onstart = () => {
          setState('speaking');
        };

        utterance.onend = () => {
          setState('idle');
          resolve();
        };

        utterance.onerror = (err) => {
          console.warn('SpeechSynthesis error:', err);
          setState('idle');
          resolve();
        };

        synthRef.current.speak(utterance);
      });
    },
    []
  );

  const resetError = useCallback(() => {
    setError(null);
    setState('idle');
  }, []);

  return {
    state,
    transcript,
    interimTranscript,
    error,
    isSupported,
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
    startListening,
    stopListening,
    speakAIResponse,
    stopSpeaking,
    resetError,
  };
};
