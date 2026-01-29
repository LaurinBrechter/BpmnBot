import type { Theme } from '../App';

interface ThemeSelectorProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export default function ThemeSelector({ theme, onChange }: ThemeSelectorProps) {
  const isLight = theme === 'light';

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="theme-select" className={`text-sm ${isLight ? 'text-gray-600' : 'text-text-secondary'}`}>
        Theme:
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => onChange(e.target.value as Theme)}
        className={`px-3 py-1.5 text-sm rounded-lg border cursor-pointer transition-all
                   focus:outline-none focus:ring-1 ${
          isLight
            ? 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500/50'
            : 'bg-bg-tertiary border-border text-text-primary focus:border-accent focus:ring-accent/50'
        }`}
      >
        <option value="light">Light</option>
        <option value="dark">Dark (WIP)</option>
      </select>
    </div>
  );
}
