import type BpmnModeler from 'bpmn-js/lib/Modeler';

// Position tracker for smarter auto-layout
let elementCount = 0;
const START_X = 300;
const START_Y = 200;
const SPACING_X = 180;
const SPACING_Y = 120;
const ELEMENTS_PER_ROW = 4;

function getNextPosition() {
  const row = Math.floor(elementCount / ELEMENTS_PER_ROW);
  const col = elementCount % ELEMENTS_PER_ROW;
  
  const pos = { 
    x: START_X + (col * SPACING_X), 
    y: START_Y + (row * SPACING_Y) 
  };
  
  elementCount++;
  return pos;
}

export function resetPositionTracker() {
  elementCount = 0;
}

// Get position relative to another element (for connecting flows)
export function getPositionAfter(modeler: BpmnModeler, elementId: string, direction: 'right' | 'below' = 'right'): { x: number; y: number } {
  const elementRegistry = modeler.get('elementRegistry') as any;
  const element = elementRegistry.get(elementId);
  
  if (!element) {
    return getNextPosition();
  }
  
  if (direction === 'right') {
    return {
      x: element.x + element.width + SPACING_X,
      y: element.y + (element.height / 2)
    };
  } else {
    return {
      x: element.x + (element.width / 2),
      y: element.y + element.height + SPACING_Y
    };
  }
}

// Unified element type mapping
const ELEMENT_TYPE_MAP: Record<string, string> = {
  // Tasks
  task: 'bpmn:Task',
  userTask: 'bpmn:UserTask',
  serviceTask: 'bpmn:ServiceTask',
  scriptTask: 'bpmn:ScriptTask',
  // Gateways
  exclusiveGateway: 'bpmn:ExclusiveGateway',
  parallelGateway: 'bpmn:ParallelGateway',
  inclusiveGateway: 'bpmn:InclusiveGateway',
  // Events
  startEvent: 'bpmn:StartEvent',
  endEvent: 'bpmn:EndEvent',
  intermediateEvent: 'bpmn:IntermediateCatchEvent',
};

export type ElementType = keyof typeof ELEMENT_TYPE_MAP;

export interface CreateElementParams {
  type: ElementType;
  name?: string;
  x?: number;
  y?: number;
}

export function createElement(modeler: BpmnModeler, params: CreateElementParams): string {
  const elementFactory = modeler.get('elementFactory') as any;
  const modeling = modeler.get('modeling') as any;
  const canvas = modeler.get('canvas') as any;

  const bpmnType = ELEMENT_TYPE_MAP[params.type];
  if (!bpmnType) {
    throw new Error(`Unknown element type: ${params.type}. Valid types: ${Object.keys(ELEMENT_TYPE_MAP).join(', ')}`);
  }

  const position = params.x !== undefined && params.y !== undefined 
    ? { x: params.x, y: params.y } 
    : getNextPosition();

  const shape = elementFactory.createShape({ type: bpmnType });
  const rootElement = canvas.getRootElement();
  const createdShape = modeling.createShape(shape, position, rootElement);

  if (params.name) {
    modeling.updateProperties(createdShape, { name: params.name });
  }

  return createdShape.id;
}

export interface ElementUpdate {
  elementId: string;
  name?: string;
  x?: number;
  y?: number;
  documentation?: string;
}

export interface UpdateElementsParams {
  updates: ElementUpdate[];
}

export interface UpdateElementsResult {
  success: boolean;
  updated: string[];
  notFound: string[];
}

export function updateElements(modeler: BpmnModeler, params: UpdateElementsParams): UpdateElementsResult {
  const elementRegistry = modeler.get('elementRegistry') as any;
  const modeling = modeler.get('modeling') as any;
  const bpmnFactory = modeler.get('bpmnFactory') as any;

  const updated: string[] = [];
  const notFound: string[] = [];

  for (const update of params.updates) {
    const element = elementRegistry.get(update.elementId);
    if (!element) {
      console.error('Element not found:', update.elementId);
      notFound.push(update.elementId);
      continue;
    }

    // Update position if specified
    if (update.x !== undefined && update.y !== undefined) {
      const deltaX = update.x - element.x;
      const deltaY = update.y - element.y;
      modeling.moveElements([element], { x: deltaX, y: deltaY });
    }

    // Build properties to update
    const propertiesToUpdate: Record<string, any> = {};

    if (update.name !== undefined) {
      propertiesToUpdate.name = update.name;
    }

    if (update.documentation !== undefined) {
      // Create BPMN documentation element
      propertiesToUpdate.documentation = [
        bpmnFactory.create('bpmn:Documentation', {
          text: update.documentation,
        }),
      ];
    }

    // Apply property updates if any
    if (Object.keys(propertiesToUpdate).length > 0) {
      modeling.updateProperties(element, propertiesToUpdate);
    }

    updated.push(update.elementId);
  }

  return {
    success: notFound.length === 0,
    updated,
    notFound,
  };
}

export interface CreateEventParams {
  name?: string;
  type?: 'start' | 'end' | 'intermediate';
  x?: number;
  y?: number;
}

export function createEvent(modeler: BpmnModeler, params: CreateEventParams): string {
  const typeMap: Record<string, ElementType> = {
    start: 'startEvent',
    end: 'endEvent',
    intermediate: 'intermediateEvent',
  };
  return createElement(modeler, {
    type: typeMap[params.type || 'end'],
    name: params.name,
    x: params.x,
    y: params.y,
  });
}

export interface ConnectElementsParams {
  sourceId: string;
  targetId: string;
  name?: string;
}

export function connectElements(modeler: BpmnModeler, params: ConnectElementsParams): string | null {
  const elementRegistry = modeler.get('elementRegistry') as any;
  const modeling = modeler.get('modeling') as any;

  const source = elementRegistry.get(params.sourceId);
  const target = elementRegistry.get(params.targetId);

  if (!source || !target) {
    console.error('Source or target element not found:', params.sourceId, params.targetId);
    return null;
  }

  const connection = modeling.connect(source, target, {
    type: 'bpmn:SequenceFlow',
  });

  if (params.name) {
    modeling.updateLabel(connection, params.name);
  }

  return connection.id;
}

export interface DisconnectElementsParams {
  sourceId: string;
  targetId: string;
}

export function disconnectElements(modeler: BpmnModeler, params: DisconnectElementsParams): boolean {
  const elementRegistry = modeler.get('elementRegistry') as any;
  const modeling = modeler.get('modeling') as any;

  const source = elementRegistry.get(params.sourceId);
  const target = elementRegistry.get(params.targetId);

  if (!source || !target) {
    console.error('Source or target element not found:', params.sourceId, params.targetId);
    return false;
  }

  // Find the connection between source and target
  const connections = source.outgoing?.filter(
    (conn: any) => conn.target?.id === params.targetId && conn.type === 'bpmn:SequenceFlow'
  ) || [];

  if (connections.length === 0) {
    console.error('No connection found between:', params.sourceId, 'and', params.targetId);
    return false;
  }

  // Remove all connections between these elements
  modeling.removeElements(connections);
  return true;
}


export interface DeleteElementParams {
  elementId: string;
}

export function deleteElement(modeler: BpmnModeler, params: DeleteElementParams): boolean {
  const elementRegistry = modeler.get('elementRegistry') as any;
  const modeling = modeler.get('modeling') as any;

  const element = elementRegistry.get(params.elementId);
  if (!element) {
    console.error('Element not found:', params.elementId);
    return false;
  }

  modeling.removeElements([element]);
  return true;
}

export async function exportDiagram(modeler: BpmnModeler): Promise<string> {
  const result = await modeler.saveXML({ format: true });
  return result.xml || '';
}

export interface DiagramElement {
  id: string;
  type: string;
  name?: string;
  documentation?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramConnection {
  id: string;
  sourceId: string;
  targetId: string;
  name?: string;
}

export interface DiagramState {
  elements: DiagramElement[];
  connections: DiagramConnection[];
}

export function getDiagramState(modeler: BpmnModeler): DiagramState {
  const elementRegistry = modeler.get('elementRegistry') as any;
  const elements: DiagramElement[] = [];
  const connections: DiagramConnection[] = [];

  elementRegistry.forEach((element: any) => {
    if (element.type === 'bpmn:Process' || element.type === 'label') {
      return;
    }

    if (element.type === 'bpmn:SequenceFlow') {
      // This is a connection
      connections.push({
        id: element.id,
        sourceId: element.source?.id,
        targetId: element.target?.id,
        name: element.businessObject?.name,
      });
    } else {
      // This is a shape element
      // Extract documentation text if present
      const docs = element.businessObject?.documentation;
      const documentation = docs && docs.length > 0 ? docs[0].text : undefined;

      elements.push({
        id: element.id,
        type: element.type,
        name: element.businessObject?.name,
        documentation,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      });
    }
  });

  console.log('elements', elements);
  console.log('connections', connections);

  return { elements, connections };
}

export function findElementByName(modeler: BpmnModeler, name: string): string | null {
  const elementRegistry = modeler.get('elementRegistry') as any;
  let foundId: string | null = null;

  const nameLower = name.toLowerCase();
  elementRegistry.forEach((element: any) => {
    const elementName = element.businessObject?.name?.toLowerCase();
    if (elementName && elementName.includes(nameLower)) {
      foundId = element.id;
    }
  });

  return foundId;
}

export function getLastCreatedElement(modeler: BpmnModeler): string | null {
  const elementRegistry = modeler.get('elementRegistry') as any;
  let lastElement: any = null;

  elementRegistry.forEach((element: any) => {
    if (element.type !== 'bpmn:Process' && element.type !== 'label' && element.type !== 'bpmn:SequenceFlow') {
      lastElement = element;
    }
  });

  return lastElement?.id || null;
}