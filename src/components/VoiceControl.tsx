import { useState, useRef, useEffect } from 'react';
import { useGeminiLive, ConnectionStatus } from '../hooks/useGeminiLive';
import { useModeler } from '../contexts/ModelerContext';
import type { Theme } from '../App';

interface VoiceControlProps {
  apiKey: string;
  activeSessionId: string;
  onUserMessage: (sessionId: string, message: string) => void;
  onAssistantMessage: (sessionId: string, message: string) => void;
  onRenameDiagram: (sessionId: string, title: string) => void;
  theme: Theme;
}

export default function VoiceControl({ apiKey, activeSessionId, onUserMessage, onAssistantMessage, onRenameDiagram, theme }: VoiceControlProps) {
  const { modelerRef } = useModeler();
  const [textInput, setTextInput] = useState('');
  const isLight = theme === 'light';

  // Use refs to always have the current session ID and callbacks
  const sessionIdRef = useRef(activeSessionId);
  const onUserMessageRef = useRef(onUserMessage);
  const onAssistantMessageRef = useRef(onAssistantMessage);
  const onRenameDiagramRef = useRef(onRenameDiagram);

  // Keep refs up to date
  useEffect(() => {
    sessionIdRef.current = activeSessionId;
    onUserMessageRef.current = onUserMessage;
    onAssistantMessageRef.current = onAssistantMessage;
    onRenameDiagramRef.current = onRenameDiagram;
  }, [activeSessionId, onUserMessage, onAssistantMessage, onRenameDiagram]);

  const {
    status,
    isListening,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendTextMessage,
  } = useGeminiLive({
    apiKey,
    modelerRef,
    onUserTranscript: (text) => onUserMessageRef.current(sessionIdRef.current, text),
    onAssistantResponse: (text) => onAssistantMessageRef.current(sessionIdRef.current, text),
    onRenameDiagram: (title) => onRenameDiagramRef.current(sessionIdRef.current, title),
  });

  const handleVoiceToggle = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendTextMessage(textInput);
      setTextInput('');
    }
  };

  const getStatusColor = (s: ConnectionStatus) => {
    switch (s) {
      case 'connected': return isLight ? 'bg-green-500' : 'bg-success';
      case 'connecting': return isLight ? 'bg-yellow-500 animate-pulse' : 'bg-warning animate-pulse';
      case 'error': return isLight ? 'bg-red-500' : 'bg-error';
      default: return isLight ? 'bg-gray-400' : 'bg-text-muted';
    }
  };

  const getStatusText = (s: ConnectionStatus) => {
    switch (s) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className={`border-t ${isLight ? 'border-gray-200 bg-white' : 'border-border bg-bg-tertiary'}`}>
      {/* Status Bar */}
      <div className={`px-4 py-2 border-b flex items-center justify-between ${isLight ? 'border-gray-200' : 'border-border'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
          <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-text-muted'}`}>{getStatusText(status)}</span>
        </div>
        {status === 'disconnected' && apiKey && (
          <button
            onClick={connect}
            className={`text-xs transition-colors ${isLight ? 'text-indigo-600 hover:text-indigo-700' : 'text-accent hover:text-accent-hover'}`}
          >
            Connect
          </button>
        )}
        {status === 'connected' && (
          <button
            onClick={disconnect}
            className={`text-xs transition-colors ${isLight ? 'text-gray-500 hover:text-red-600' : 'text-text-muted hover:text-error'}`}
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Voice Control */}
      <div className="p-4 flex flex-col items-center gap-4">
        {/* Mic Button */}
        <button
          onClick={handleVoiceToggle}
          disabled={status !== 'connected' && !apiKey}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-300 ease-out
            ${isListening
              ? isLight
                ? 'bg-indigo-600 shadow-[0_0_40px_rgba(99,102,241,0.4)]'
                : 'bg-accent shadow-[0_0_40px_rgba(99,102,241,0.5)] animate-pulse-glow'
              : isLight
                ? 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 hover:border-indigo-400'
                : 'bg-bg-secondary hover:bg-bg-tertiary border-2 border-border hover:border-accent/50'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {/* Voice Waves (when listening) */}
          {isListening && (
            <div className="absolute inset-0 flex items-center justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-white rounded-full animate-voice-wave"
                  style={{
                    height: '40%',
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Mic Icon (when not listening) */}
          {!isListening && (
            <svg className={`w-8 h-8 ${isLight ? 'text-gray-600' : 'text-text-primary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-text-muted'}`}>
          {isListening ? 'Listening...' : 'Click to speak'}
        </p>

        {/* Text Input Fallback */}
        <form onSubmit={handleTextSubmit} className="w-full">
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type your command..."
              disabled={status !== 'connected'}
              className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-all
                         focus:outline-none focus:ring-1
                         disabled:opacity-50 disabled:cursor-not-allowed
                         ${isLight
                  ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/50'
                  : 'bg-bg-secondary border-border text-text-primary placeholder-text-muted focus:border-accent focus:ring-accent/50'
                }`}
            />
            <button
              type="submit"
              disabled={!textInput.trim() || status !== 'connected'}
              className={`px-4 py-2 rounded-lg
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors
                         ${isLight
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-accent hover:bg-accent-hover text-white'
                }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>

        {!apiKey && (
          <p className={`text-xs text-center ${isLight ? 'text-amber-600' : 'text-warning'}`}>
            Please enter your Gemini API key to start
          </p>
        )}
      </div>
    </div>
  );
}
