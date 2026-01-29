import { useEffect, useRef } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { useModeler } from '../contexts/ModelerContext';
import type { Theme } from '../App';

interface BpmnCanvasProps {
  theme: Theme;
}

const INITIAL_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
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

export default function BpmnCanvas({ theme }: BpmnCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setModeler } = useModeler();

  const isLight = theme === 'light';

  useEffect(() => {
    if (!containerRef.current) return;

    let isDestroyed = false;

    const modeler = new BpmnModeler({
      container: containerRef.current,
    });

    async function initDiagram() {
      try {
        const result = await modeler.importXML(INITIAL_DIAGRAM);
        
        // Check if component was unmounted during async operation
        if (isDestroyed) return;
        
        if (result.warnings?.length > 0) {
          console.warn('BPMN import warnings:', result.warnings);
        }
        
        const canvas = modeler.get('canvas') as any;
        canvas.zoom('fit-viewport');
        setModeler(modeler);
      } catch (err) {
        if (!isDestroyed) {
          console.error('Failed to load BPMN diagram:', err);
        }
      }
    }

    initDiagram();

    return () => {
      isDestroyed = true;
      modeler.destroy();
      setModeler(null);
    };
  }, [setModeler]);

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
