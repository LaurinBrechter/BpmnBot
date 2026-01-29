import { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';
import type BpmnModeler from 'bpmn-js/lib/Modeler';

interface ModelerContextType {
  modeler: BpmnModeler | null;
  setModeler: (modeler: BpmnModeler | null) => void;
  modelerRef: React.MutableRefObject<BpmnModeler | null>;
}

const ModelerContext = createContext<ModelerContextType | null>(null);

export function ModelerProvider({ children }: { children: ReactNode }) {
  const [modeler, setModelerState] = useState<BpmnModeler | null>(null);
  const modelerRef = useRef<BpmnModeler | null>(null);

  const setModeler = useCallback((newModeler: BpmnModeler | null) => {
    modelerRef.current = newModeler;
    setModelerState(newModeler);
  }, []);

  return (
    <ModelerContext.Provider
      value={{
        modeler,
        setModeler,
        modelerRef,
      }}
    >
      {children}
    </ModelerContext.Provider>
  );
}

export function useModeler() {
  const context = useContext(ModelerContext);
  if (!context) {
    throw new Error('useModeler must be used within a ModelerProvider');
  }
  return context;
}
