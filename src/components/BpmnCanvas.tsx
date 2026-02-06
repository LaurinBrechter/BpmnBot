import { useEffect, useRef, useCallback } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { useModeler } from '../contexts/ModelerContext';
import type { Theme } from '../App';
import { INITIAL_DIAGRAM } from '../hooks/useSessionStorage';

interface BpmnCanvasProps {
  theme: Theme;
  sessionId: string;
  initialXml: string;
  onDiagramChange: (xml: string) => void;
}

export default function BpmnCanvas({ theme, sessionId, initialXml, onDiagramChange }: BpmnCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setModeler, modelerRef } = useModeler();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionRef = useRef(sessionId);

  const isLight = theme === 'light';

  // Debounced save function
  const debouncedSave = useCallback(async () => {
    if (!modelerRef.current) return;
    
    try {
      const result = await modelerRef.current.saveXML({ format: true });
      if (result.xml) {
        onDiagramChange(result.xml);
      }
    } catch (err) {
      console.error('Failed to save diagram:', err);
    }
  }, [modelerRef, onDiagramChange]);

  // Initialize modeler
  useEffect(() => {
    if (!containerRef.current) return;

    let isDestroyed = false;
    currentSessionRef.current = sessionId;

    const modeler = new BpmnModeler({
      container: containerRef.current,
    });

    async function initDiagram() {
      try {
        const xmlToLoad = initialXml || INITIAL_DIAGRAM;
        const result = await modeler.importXML(xmlToLoad);
        
        if (isDestroyed) return;
        
        if (result.warnings?.length > 0) {
          console.warn('BPMN import warnings:', result.warnings);
        }
        
        const canvas = modeler.get('canvas') as any;
        canvas.zoom('fit-viewport');
        setModeler(modeler);

        // Listen for changes and auto-save
        const eventBus = modeler.get('eventBus') as any;
        const events = [
          'commandStack.changed',
          'shape.changed',
          'connection.changed',
          'element.changed',
        ];

        events.forEach(event => {
          eventBus.on(event, () => {
            // Only save if this is still the active session
            if (currentSessionRef.current !== sessionId) return;
            
            // Debounce saves
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(debouncedSave, 500);
          });
        });

      } catch (err) {
        if (!isDestroyed) {
          console.error('Failed to load BPMN diagram:', err);
        }
      }
    }

    initDiagram();

    return () => {
      isDestroyed = true;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      modeler.destroy();
      setModeler(null);
    };
  }, [sessionId, initialXml, setModeler, debouncedSave]);

  return (
    <div className="relative w-full h-full">
      {/* Canvas Container */}
      <div ref={containerRef} className={`w-full h-full ${isLight ? '' : 'bpmn-dark-mode'}`} />

      {/* Overlay gradient for visual effect (dark theme only) */}
      {!isLight && (
        <>
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-bg-primary/20 via-transparent to-transparent" />
          {/* Corner decorations */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-accent/30 rounded-tl-lg pointer-events-none" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-accent/30 rounded-tr-lg pointer-events-none" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-accent/30 rounded-bl-lg pointer-events-none" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-accent/30 rounded-br-lg pointer-events-none" />
        </>
      )}
    </div>
  );
}
