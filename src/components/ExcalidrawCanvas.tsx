import { useRef, useCallback, useMemo } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { Theme } from '../App';
import type { ExcalidrawData } from '../hooks/useSessionStorage';

interface ExcalidrawCanvasProps {
  theme: Theme;
  sessionId: string;
  initialData: ExcalidrawData;
  onDiagramChange: (data: ExcalidrawData) => void;
}

export default function ExcalidrawCanvas({ theme, initialData, onDiagramChange }: ExcalidrawCanvasProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `appState.collaborators` is a Map and doesn't survive the JSON round-trip through
  // localStorage (becomes a plain object), which crashes Excalidraw's internals on mount.
  // It's only relevant for live multiplayer, which this app doesn't use, so always inject
  // a fresh Map on load and never persist whatever comes back from Excalidraw.
  const safeInitialData = useMemo(
    () => ({
      ...initialData,
      appState: { ...initialData.appState, collaborators: new Map() },
    }),
    [initialData]
  );

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        const { collaborators: _collaborators, ...appStateToSave } = appState;
        onDiagramChange({ elements, appState: appStateToSave, files });
      }, 500);
    },
    [onDiagramChange]
  );

  return (
    <div className="relative w-full h-full">
      <Excalidraw
        initialData={safeInitialData}
        onChange={handleChange}
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
    </div>
  );
}
