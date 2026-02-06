import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../App';

export interface DiagramVersion {
  id: string;
  bpmnXml: string;
  timestamp: string;
  label?: string;
}

export interface Session {
  id: string;
  name: string;
  bpmnXml: string;
  messages: ChatMessage[];
  versions: DiagramVersion[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'bpmn-sessions';
const ACTIVE_SESSION_KEY = 'bpmn-active-session';

export const INITIAL_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="BPMN Voice Bot" exporterVersion="1.0.0">
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1" name="Start" />
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="182" y="182" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="188" y="225" width="24" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;

function createNewSession(name?: string): Session {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: name || `Diagram ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    bpmnXml: INITIAL_DIAGRAM,
    messages: [],
    versions: [],
    createdAt: now,
    updatedAt: now,
  };
}

function loadSessions(): Session[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const sessions = JSON.parse(stored) as Session[];
      // Convert date strings back for messages and ensure versions array exists
      return sessions.map(s => ({
        ...s,
        versions: s.versions || [],
        messages: s.messages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      }));
    }
  } catch (e) {
    console.error('Failed to load sessions:', e);
  }
  return [];
}

function saveSessions(sessions: Session[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions:', e);
  }
}

function loadActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

function saveActiveSessionId(id: string) {
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

export function useSessionStorage() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const loaded = loadSessions();
    if (loaded.length === 0) {
      const initial = createNewSession('My First Diagram');
      saveSessions([initial]);
      saveActiveSessionId(initial.id);
      return [initial];
    }
    return loaded;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const storedId = loadActiveSessionId();
    const loaded = loadSessions();
    if (storedId && loaded.some(s => s.id === storedId)) {
      return storedId;
    }
    // Fallback to first session
    if (loaded.length > 0) {
      saveActiveSessionId(loaded[0].id);
      return loaded[0].id;
    }
    // Create new if none exist
    const initial = createNewSession('My First Diagram');
    saveSessions([initial]);
    saveActiveSessionId(initial.id);
    return initial.id;
  });

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Persist sessions whenever they change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Persist active session ID
  useEffect(() => {
    saveActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  const createSession = useCallback((name?: string) => {
    const newSession = createNewSession(name);
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession;
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      // Ensure at least one session exists
      if (filtered.length === 0) {
        const newSession = createNewSession('My First Diagram');
        setActiveSessionId(newSession.id);
        return [newSession];
      }
      // If deleting active session, switch to first available
      if (id === activeSessionId) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeSessionId]);

  const renameSession = useCallback((id: string, name: string) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, name, updatedAt: new Date().toISOString() }
          : s
      )
    );
  }, []);

  const updateSessionDiagram = useCallback((id: string, bpmnXml: string) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, bpmnXml, updatedAt: new Date().toISOString() }
          : s
      )
    );
  }, []);

  const updateSessionMessages = useCallback((id: string, messages: ChatMessage[]) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, messages, updatedAt: new Date().toISOString() }
          : s
      )
    );
  }, []);

  // Create a new version snapshot of the current diagram (only if changed)
  const createVersion = useCallback((sessionId: string, label?: string) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id !== sessionId) return s;
        
        // Check if the diagram has actually changed
        const lastVersionXml = s.versions.length > 0 ? s.versions[0].bpmnXml : null;
        
        // Skip if the diagram hasn't changed from the last version
        if (lastVersionXml && lastVersionXml === s.bpmnXml) {
          return s;
        }
        
        const newVersion: DiagramVersion = {
          id: crypto.randomUUID(),
          bpmnXml: s.bpmnXml,
          timestamp: new Date().toISOString(),
          label,
        };
        
        return {
          ...s,
          versions: [newVersion, ...s.versions],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  // Restore a specific version
  const restoreVersion = useCallback((sessionId: string, versionId: string) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id !== sessionId) return s;
        
        const version = s.versions.find(v => v.id === versionId);
        if (!version) return s;
        
        return {
          ...s,
          bpmnXml: version.bpmnXml,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  // Delete a version
  const deleteVersion = useCallback((sessionId: string, versionId: string) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id !== sessionId) return s;
        
        return {
          ...s,
          versions: s.versions.filter(v => v.id !== versionId),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const switchSession = useCallback((id: string) => {
    if (sessions.some(s => s.id === id)) {
      setActiveSessionId(id);
    }
  }, [sessions]);

  return {
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
  };
}
