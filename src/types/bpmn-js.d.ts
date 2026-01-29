declare module 'bpmn-js/lib/Modeler' {
  interface ModelerOptions {
    container?: HTMLElement | string;
    width?: string | number;
    height?: string | number;
    keyboard?: {
      bindTo?: Document | HTMLElement;
    };
    additionalModules?: any[];
    moddleExtensions?: Record<string, any>;
  }

  interface ImportResult {
    warnings: string[];
  }

  interface SaveXMLOptions {
    format?: boolean;
    preamble?: boolean;
  }

  interface SaveXMLResult {
    xml?: string;
  }

  class BpmnModeler {
    constructor(options?: ModelerOptions);
    
    importXML(xml: string): Promise<ImportResult>;
    saveXML(options?: SaveXMLOptions): Promise<SaveXMLResult>;
    
    get<T = any>(service: string): T;
    
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback?: (...args: any[]) => void): void;
    
    destroy(): void;
    
    createDiagram(): Promise<ImportResult>;
  }

  export default BpmnModeler;
}

declare module 'bpmn-js/lib/Viewer' {
  interface ViewerOptions {
    container?: HTMLElement | string;
    width?: string | number;
    height?: string | number;
    additionalModules?: any[];
  }

  class BpmnViewer {
    constructor(options?: ViewerOptions);
    
    importXML(xml: string): Promise<{ warnings: string[] }>;
    
    get<T = any>(service: string): T;
    
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback?: (...args: any[]) => void): void;
    
    destroy(): void;
  }

  export default BpmnViewer;
}

