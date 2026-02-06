import { useState, useEffect, useCallback } from 'react';
import { ModelerProvider } from './contexts/ModelerContext';
import BpmnCanvas from './components/BpmnCanvas';
import VoiceControl from './components/VoiceControl';
import ChatTranscript from './components/ChatTranscript';
import ApiKeyInput from './components/ApiKeyInput';
import ThemeSelector from './components/ThemeSelector';
import SessionSidebar from './components/SessionSidebar';
import { useSessionStorage } from './hooks/useSessionStorage';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type Theme = 'light' | 'dark';

function App() {
  const {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    deleteSession,
    renameSession,
    updateSessionDiagram,
    updateSessionMessages,
    createVersion,
    restoreVersion,
    deleteVersion,
    switchSession,
  } = useSessionStorage();

  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini-api-key') || '';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('bpmn-theme') as Theme) || 'light';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  // Counter to force BpmnCanvas remount when version is restored
  const [canvasKey, setCanvasKey] = useState(0);

  useEffect(() => {
    localStorage.setItem('bpmn-theme', theme);
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Update document title when active session name changes
  useEffect(() => {
    document.title = activeSession?.name
      ? `${activeSession.name} - BPMN Voice Bot`
      : 'BPMN Voice Bot';
  }, [activeSession?.name]);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini-api-key', key);
  };

  const addMessage = useCallback((sessionId: string, role: 'user' | 'assistant', content: string) => {
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    };

    // Find the session to get current messages
    const session = sessions.find(s => s.id === sessionId);
    const updatedMessages = [...(session?.messages || []), newMessage];
    updateSessionMessages(sessionId, updatedMessages);
  }, [sessions, updateSessionMessages]);

  const handleDiagramChange = useCallback((xml: string) => {
    updateSessionDiagram(activeSessionId, xml);
  }, [activeSessionId, updateSessionDiagram]);

  const handleRestoreVersion = useCallback((sessionId: string, versionId: string) => {
    restoreVersion(sessionId, versionId);
    // Force canvas remount to load the restored version
    setCanvasKey(k => k + 1);
  }, [restoreVersion]);

  const handleCreateVersion = useCallback((sessionId: string) => {
    createVersion(sessionId);
  }, [createVersion]);

  const isLight = theme === 'light';

  return (
    <ModelerProvider>
      <div className={`flex flex-col h-screen ${isLight ? 'bg-gray-100' : 'bg-bg-primary'}`}>
        {/* Header */}
        <header className={`flex items-center justify-between px-6 py-4 border-b ${isLight
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
            {/* Current session indicator */}
            {activeSession && (
              <>
                <span className={`text-sm px-2 py-0.5 rounded-md ${isLight
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-bg-tertiary text-text-muted'
                  }`}>
                  {activeSession.name}
                </span>
                <button
                  onClick={() => handleCreateVersion(activeSessionId)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors ${isLight
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    : 'bg-accent/20 text-accent hover:bg-accent/30'
                    }`}
                  title="Create a snapshot of the current diagram"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Snapshot
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <ThemeSelector theme={theme} onChange={setTheme} />
            <ApiKeyInput value={apiKey} onChange={handleApiKeyChange} theme={theme} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1 overflow-hidden">
          {/* Session Sidebar */}
          <SessionSidebar
            theme={theme}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={switchSession}
            onCreateSession={() => createSession()}
            onDeleteSession={deleteSession}
            onRenameSession={renameSession}
            onRestoreVersion={handleRestoreVersion}
            onDeleteVersion={deleteVersion}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
          />

          {/* Canvas Section */}
          <div className={`flex-1 relative overflow-hidden ${isLight ? 'bg-white' : ''}`}>
            {activeSession && (
              <BpmnCanvas
                key={`${activeSessionId}-${canvasKey}`}
                theme={theme}
                sessionId={activeSessionId}
                initialXml={activeSession.bpmnXml}
                onDiagramChange={handleDiagramChange}
              />
            )}
          </div>

          {/* Chat Sidebar */}
          <aside className={`w-[400px] flex flex-col border-l ${isLight
            ? 'bg-gray-50 border-gray-200'
            : 'bg-bg-secondary border-border'
            }`}>
            <ChatTranscript
              messages={activeSession?.messages || []}
              theme={theme}
            />
            <VoiceControl
              apiKey={apiKey}
              activeSessionId={activeSessionId}
              onUserMessage={(sessionId, msg) => addMessage(sessionId, 'user', msg)}
              onAssistantMessage={(sessionId, msg) => addMessage(sessionId, 'assistant', msg)}
              onRenameDiagram={(sessionId, title) => renameSession(sessionId, title)}
              theme={theme}
            />
          </aside>
        </main>
      </div>
    </ModelerProvider>
  );
}

export default App;
