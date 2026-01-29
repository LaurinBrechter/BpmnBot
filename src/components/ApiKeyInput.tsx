import { useState } from 'react';
import type { Theme } from '../App';

interface ApiKeyInputProps {
  value: string;
  onChange: (key: string) => void;
  theme: Theme;
}

export default function ApiKeyInput({ value, onChange, theme }: ApiKeyInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(!value);

  const isLight = theme === 'light';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
  };

  if (!isEditing && value) {
    return (
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
          isLight 
            ? 'bg-gray-100 border-gray-200' 
            : 'bg-bg-tertiary border-border'
        }`}>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-text-secondary'}`}>API Key Set</span>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className={`px-3 py-1.5 text-sm transition-colors ${
            isLight 
              ? 'text-gray-500 hover:text-gray-700' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative">
        <input
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter Gemini API Key"
          className={`w-64 px-3 py-1.5 pr-10 text-sm rounded-lg border transition-all
                     focus:outline-none focus:ring-1 ${
            isLight
              ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500/50'
              : 'bg-bg-tertiary border-border text-text-primary placeholder-text-muted focus:border-accent focus:ring-accent/50'
          }`}
        />
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 transition-colors ${
            isLight ? 'text-gray-400 hover:text-gray-600' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {isVisible ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      <button
        type="submit"
        disabled={!value}
        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed ${
          isLight
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
            : 'bg-accent hover:bg-accent-hover text-white'
        }`}
      >
        Save
      </button>
    </form>
  );
}
