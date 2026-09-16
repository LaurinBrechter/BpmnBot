import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../App';
import { randomUuid } from '../randomUuid';
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

export type DiagramType = 'bpmn' | 'excalidraw';

export interface ExcalidrawData {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

export const EMPTY_EXCALIDRAW_DATA: ExcalidrawData = {
  elements: [],
  appState: {},
  files: {},
};

export interface DiagramVersion {
  id: string;
  bpmnXml?: string;
  excalidrawData?: ExcalidrawData;
  timestamp: string;
  label?: string;
}

export interface Session {
  id: string;
  type: DiagramType;
  name: string;
  bpmnXml: string;
  excalidrawData?: ExcalidrawData;
  messages: ChatMessage[];
  versions: DiagramVersion[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'bpmn-sessions';
const ACTIVE_SESSION_KEY = 'bpmn-active-session';

export const INITIAL_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Diagram Studio" exporterVersion="1.0.0">
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

function createNewSession(
  type: DiagramType,
  name?: string,
  initialBpmnXml?: string,
  initialExcalidrawData?: ExcalidrawData
): Session {
  const now = new Date().toISOString();
  const defaultPrefix = type === 'excalidraw' ? 'Excalidraw Board' : 'BPMN Diagram';
  return {
    id: randomUuid(),
    type,
    name: name || `${defaultPrefix} ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    bpmnXml: type === 'bpmn' ? (initialBpmnXml ?? INITIAL_DIAGRAM) : '',
    excalidrawData: type === 'excalidraw' ? (initialExcalidrawData ?? EMPTY_EXCALIDRAW_DATA) : undefined,
    messages: [],
    versions: [],
    createdAt: now,
    updatedAt: now,
  };
}

// Backfills the `type` field for sessions saved before multi-diagram-type support existed.
function normalizeSession(s: Session): Session {
  return {
    ...s,
    type: s.type ?? 'bpmn',
    versions: s.versions || [],
  };
}

function normalizeSessionsFromBackup(sessions: Session[]): Session[] {
  return sessions.map(s => ({
    ...normalizeSession(s),
    messages: (s.messages || []).map(m => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp : new Date((m as unknown as { timestamp: string }).timestamp),
    })),
  }));
}

function loadSessions(): Session[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const sessions = JSON.parse(stored) as Session[];
      // Convert date strings back for messages and ensure versions array + type exist
      return sessions.map(s => ({
        ...normalizeSession(s),
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
      const initial = createNewSession('bpmn', 'My First Diagram');
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
    const initial = createNewSession('bpmn', 'My First Diagram');
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

  const createSession = useCallback((type: DiagramType, name?: string) => {
    const newSession = createNewSession(type, name);
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession;
  }, []);

  const createSessionFromBpmn = useCallback((bpmnXml: string, name?: string) => {
    const newSession = createNewSession('bpmn', name, bpmnXml);
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession;
  }, []);

  const restoreBackup = useCallback((backup: { sessions: Session[]; activeSessionId: string }) => {
    const normalized = normalizeSessionsFromBackup(backup.sessions);
    const fallback = createNewSession('bpmn', 'My First Diagram');
    const list = normalized.length > 0 ? normalized : [fallback];
    const validId =
      backup.activeSessionId && list.some(s => s.id === backup.activeSessionId)
        ? backup.activeSessionId
        : list[0].id;
    setSessions(list);
    setActiveSessionId(validId);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      // Ensure at least one session exists
      if (filtered.length === 0) {
        const newSession = createNewSession('bpmn', 'My First Diagram');
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

  const updateSessionBpmn = useCallback((id: string, bpmnXml: string) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, bpmnXml, updatedAt: new Date().toISOString() }
          : s
      )
    );
  }, []);

  const updateSessionExcalidraw = useCallback((id: string, excalidrawData: ExcalidrawData) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, excalidrawData, updatedAt: new Date().toISOString() }
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

        const lastVersion = s.versions.length > 0 ? s.versions[0] : null;

        if (s.type === 'bpmn') {
          // Skip if the diagram hasn't changed from the last version
          if (lastVersion?.bpmnXml && lastVersion.bpmnXml === s.bpmnXml) {
            return s;
          }
        } else {
          if (
            lastVersion?.excalidrawData &&
            JSON.stringify(lastVersion.excalidrawData) === JSON.stringify(s.excalidrawData)
          ) {
            return s;
          }
        }

        const newVersion: DiagramVersion = {
          id: randomUuid(),
          bpmnXml: s.type === 'bpmn' ? s.bpmnXml : undefined,
          excalidrawData: s.type === 'excalidraw' ? s.excalidrawData : undefined,
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
          bpmnXml: s.type === 'bpmn' ? (version.bpmnXml ?? s.bpmnXml) : s.bpmnXml,
          excalidrawData: s.type === 'excalidraw' ? (version.excalidrawData ?? s.excalidrawData) : s.excalidrawData,
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
    createSessionFromBpmn,
    restoreBackup,
    deleteSession,
    renameSession,
    updateSessionBpmn,
    updateSessionExcalidraw,
    updateSessionMessages,
    createVersion,
    restoreVersion,
    deleteVersion,
    switchSession,
  };
}
