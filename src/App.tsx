import { useState, useEffect } from 'react';
import { ModelerProvider } from './contexts/ModelerContext';
import BpmnCanvas from './components/BpmnCanvas';
import VoiceControl from './components/VoiceControl';
import ChatTranscript from './components/ChatTranscript';
import ApiKeyInput from './components/ApiKeyInput';
import ThemeSelector from './components/ThemeSelector';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type Theme = 'light' | 'dark';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini-api-key') || '';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('bpmn-theme') as Theme) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('bpmn-theme', theme);
    // Apply theme class to document
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini-api-key', key);
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const isLight = theme === 'light';

  return (
    <ModelerProvider>
      <div className={`flex flex-col h-screen ${isLight ? 'bg-gray-100' : 'bg-bg-primary'}`}>
        {/* Header */}
        <header className={`flex items-center justify-between px-6 py-4 border-b ${
          isLight 
            ? 'bg-white border-gray-200' 
            : 'bg-bg-secondary border-border'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`text-2xl ${isLight ? 'text-indigo-600' : 'text-accent drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]'}`}>
              ◈
            </span>
            <h1 className={`text-xl font-semibold tracking-tight ${isLight ? 'text-gray-900' : 'text-text-primary'}`}>
              BPMN Voice Bot
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSelector theme={theme} onChange={setTheme} />
            <ApiKeyInput value={apiKey} onChange={handleApiKeyChange} theme={theme} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 overflow-hidden">
          {/* Canvas Section */}
          <div className={`flex-1 relative overflow-hidden ${isLight ? 'bg-white' : ''}`}>
            <BpmnCanvas theme={theme} />
          </div>

          {/* Sidebar */}
          <aside className={`w-[400px] flex flex-col border-l ${
            isLight 
              ? 'bg-gray-50 border-gray-200' 
              : 'bg-bg-secondary border-border'
          }`}>
            <ChatTranscript messages={messages} theme={theme} />
            <VoiceControl
              apiKey={apiKey}
              onUserMessage={(msg) => addMessage('user', msg)}
              onAssistantMessage={(msg) => addMessage('assistant', msg)}
              theme={theme}
            />
          </aside>
        </main>
      </div>
    </ModelerProvider>
  );
}

export default App;
