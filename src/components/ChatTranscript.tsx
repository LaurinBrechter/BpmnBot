import { useEffect, useRef } from 'react';
import type { ChatMessage, Theme } from '../App';

interface ChatTranscriptProps {
  messages: ChatMessage[];
  theme: Theme;
}

export default function ChatTranscript({ messages, theme }: ChatTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isLight ? 'border-gray-200' : 'border-border'}`}>
        <h2 className={`text-sm font-medium uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-text-secondary'}`}>
          Conversation
        </h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`w-16 h-16 mb-4 rounded-full flex items-center justify-center ${isLight ? 'bg-gray-100' : 'bg-bg-tertiary'}`}>
              <svg className={`w-8 h-8 ${isLight ? 'text-gray-400' : 'text-text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-text-muted'}`}>
              Start speaking to create your BPMN diagram
            </p>
            <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-text-muted/60'}`}>
              Try: "Add a task called Review Order"
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                  msg.role === 'user'
                    ? `${isLight ? 'bg-indigo-600' : 'bg-accent'} text-white rounded-br-md`
                    : `${isLight ? 'bg-gray-100 text-gray-900' : 'bg-bg-tertiary text-text-primary'} rounded-bl-md`
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${
                  msg.role === 'user' 
                    ? 'text-white/60' 
                    : isLight ? 'text-gray-400' : 'text-text-muted'
                }`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
