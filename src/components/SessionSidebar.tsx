import { useState, useRef, useEffect } from 'react';
import type { Theme } from '../App';
import type { Session } from '../hooks/useSessionStorage';

interface SessionSidebarProps {
  theme: Theme;
  sessions: Session[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, name: string) => void;
  onRestoreVersion: (sessionId: string, versionId: string) => void;
  onDeleteVersion: (sessionId: string, versionId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function SessionSidebar({
  theme,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  onRestoreVersion,
  onDeleteVersion,
  isCollapsed,
  onToggleCollapse,
}: SessionSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLight = theme === 'light';

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartEdit = (session: Session) => {
    setEditingId(session.id);
    setEditName(session.name);
    setMenuOpenId(null);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onRenameSession(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatVersionTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const toggleVersions = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
  };

  // Collapsed state - show only toggle button
  if (isCollapsed) {
    return (
      <div className={`w-12 flex flex-col items-center py-4 border-r transition-all duration-200 ${isLight
        ? 'bg-gray-50 border-gray-200'
        : 'bg-bg-secondary border-border'
        }`}>
        <button
          onClick={onToggleCollapse}
          className={`p-2 rounded-lg transition-colors ${isLight
            ? 'hover:bg-gray-200 text-gray-600'
            : 'hover:bg-bg-tertiary text-text-secondary'
            }`}
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={onCreateSession}
            className={`p-2 rounded-lg transition-colors ${isLight
              ? 'hover:bg-gray-200 text-gray-600'
              : 'hover:bg-bg-tertiary text-text-secondary'
              }`}
            title="New diagram"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Mini session indicators */}
        <div className="mt-4 flex flex-col gap-1 w-full px-2">
          {sessions.slice(0, 5).map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`w-full h-1.5 rounded-full transition-colors ${session.id === activeSessionId
                ? 'bg-accent'
                : isLight
                  ? 'bg-gray-300 hover:bg-gray-400'
                  : 'bg-border hover:bg-text-muted'
                }`}
              title={session.name}
            />
          ))}
          {sessions.length > 5 && (
            <span className={`text-xs text-center ${isLight ? 'text-gray-400' : 'text-text-muted'}`}>
              +{sessions.length - 5}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-64 flex flex-col border-r transition-all duration-200 ${isLight
      ? 'bg-gray-50 border-gray-200'
      : 'bg-bg-secondary border-border'
      }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isLight ? 'border-gray-200' : 'border-border'
        }`}>
        <h2 className={`text-sm font-semibold ${isLight ? 'text-gray-700' : 'text-text-secondary'}`}>
          Diagrams
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreateSession}
            className={`p-1.5 rounded-md transition-colors ${isLight
              ? 'hover:bg-gray-200 text-gray-600'
              : 'hover:bg-bg-tertiary text-text-secondary'
              }`}
            title="New diagram"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-md transition-colors ${isLight
              ? 'hover:bg-gray-200 text-gray-600'
              : 'hover:bg-bg-tertiary text-text-secondary'
              }`}
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.map((session) => (
          <div key={session.id} className="mx-2 mb-1">
            {/* Session Item */}
            <div
              className={`group relative rounded-lg transition-colors ${session.id === activeSessionId
                ? isLight
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'bg-accent/10 border border-accent/30'
                : isLight
                  ? 'hover:bg-gray-100 border border-transparent'
                  : 'hover:bg-bg-tertiary border border-transparent'
                }`}
            >
              {editingId === session.id ? (
                <div className="px-3 py-2">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    className={`w-full px-2 py-1 text-sm rounded border outline-none ${isLight
                      ? 'bg-white border-indigo-300 focus:border-indigo-500'
                      : 'bg-bg-primary border-accent focus:border-accent-hover'
                      }`}
                  />
                </div>
              ) : (
                <div className="flex items-start justify-between px-3 py-2">
                  <button
                    onClick={() => onSelectSession(session.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className={`text-sm font-medium truncate ${session.id === activeSessionId
                      ? isLight
                        ? 'text-indigo-700'
                        : 'text-accent-hover'
                      : isLight
                        ? 'text-gray-700'
                        : 'text-text-primary'
                      }`}>
                      {session.name}
                    </p>
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-gray-400' : 'text-text-muted'
                      }`}>
                      {formatDate(session.updatedAt)}
                    </p>
                  </button>

                  {/* Version toggle + Menu button */}
                  <div className="flex items-center gap-1">
                    {/* Version toggle button */}
                    {session.versions.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVersions(session.id);
                        }}
                        className={`p-1 rounded text-xs transition-colors ${isLight
                          ? 'hover:bg-gray-200 text-gray-500'
                          : 'hover:bg-bg-primary text-text-muted'
                          }`}
                        title={`${session.versions.length} version${session.versions.length !== 1 ? 's' : ''}`}
                      >
                        <div className="flex items-center gap-0.5">
                          <svg
                            className={`w-3 h-3 transition-transform ${expandedSessionId === session.id ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span>{session.versions.length}</span>
                        </div>
                      </button>
                    )}

                    {/* Menu button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === session.id ? null : session.id);
                        }}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isLight
                          ? 'hover:bg-gray-200 text-gray-500'
                          : 'hover:bg-bg-primary text-text-muted'
                          }`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="6" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="18" r="1.5" />
                        </svg>
                      </button>

                      {/* Dropdown menu */}
                      {menuOpenId === session.id && (
                        <div
                          ref={menuRef}
                          className={`absolute right-0 top-full mt-1 w-32 py-1 rounded-lg shadow-lg z-50 ${isLight
                            ? 'bg-white border border-gray-200'
                            : 'bg-bg-tertiary border border-border'
                            }`}
                        >
                          <button
                            onClick={() => handleStartEdit(session)}
                            className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 ${isLight
                              ? 'hover:bg-gray-100 text-gray-700'
                              : 'hover:bg-bg-secondary text-text-primary'
                              }`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Rename
                          </button>
                          <button
                            onClick={() => {
                              onDeleteSession(session.id);
                              setMenuOpenId(null);
                            }}
                            className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 ${isLight
                              ? 'hover:bg-red-50 text-red-600'
                              : 'hover:bg-red-900/20 text-red-400'
                              }`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Version History (expanded) */}
            {expandedSessionId === session.id && session.versions.length > 0 && (
              <div className={`ml-3 mt-1 pl-3 border-l-2 ${isLight ? 'border-gray-200' : 'border-border'
                }`}>
                {session.versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={`group/version flex items-center justify-between py-1.5 px-2 rounded transition-colors ${isLight
                      ? 'hover:bg-gray-100'
                      : 'hover:bg-bg-tertiary'
                      }`}
                  >
                    <button
                      onClick={() => {
                        onRestoreVersion(session.id, version.id);
                        onSelectSession(session.id);
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className={`text-xs font-medium ${isLight ? 'text-gray-600' : 'text-text-secondary'
                        }`}>
                        {version.label || `v${session.versions.length - index}`}
                      </p>
                      <p className={`text-[10px] ${isLight ? 'text-gray-400' : 'text-text-muted'
                        }`}>
                        {formatVersionTime(version.timestamp)}
                      </p>
                    </button>

                    {/* Delete version button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteVersion(session.id, version.id);
                      }}
                      className={`p-1 rounded opacity-0 group-hover/version:opacity-100 transition-opacity ${isLight
                        ? 'hover:bg-red-100 text-red-500'
                        : 'hover:bg-red-900/20 text-red-400'
                        }`}
                      title="Delete version"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer with session count */}
      <div className={`px-4 py-2 text-xs border-t ${isLight
        ? 'border-gray-200 text-gray-400'
        : 'border-border text-text-muted'
        }`}>
        {sessions.length} diagram{sessions.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
