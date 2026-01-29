import type BpmnModeler from 'bpmn-js/lib/Modeler';

// Position tracker for auto-layout
let nextX = 300;
const NEXT_Y = 200;
const SPACING_X = 150;

function getNextPosition() {
  const pos = { x: nextX, y: NEXT_Y };
  nextX += SPACING_X;
  return pos;
}

export function resetPositionTracker() {
  nextX = 300;
}

export interface CreateTaskParams {
  name: string;
  type?: 'task' | 'userTask' | 'serviceTask' | 'scriptTask';
  x?: number;
  y?: number;
}

export function createTask(modeler: BpmnModeler, params: CreateTaskParams): string {
  const elementFactory = modeler.get('elementFactory') as any;
  const modeling = modeler.get('modeling') as any;
  const canvas = modeler.get('canvas') as any;

  const typeMap: Record<string, string> = {
    task: 'bpmn:Task',
    userTask: 'bpmn:UserTask',
    serviceTask: 'bpmn:ServiceTask',
    scriptTask: 'bpmn:ScriptTask',
  };

  const bpmnType = typeMap[params.type || 'task'];
  const position = params.x && params.y ? { x: params.x, y: params.y } : getNextPosition();

  // Create shape - elementFactory will create the businessObject
  const taskShape = elementFactory.createShape({
    type: bpmnType,
  });

  const rootElement = canvas.getRootElement();
  const createdShape = modeling.createShape(taskShape, position, rootElement);

  // Update the name after creation
  if (params.name) {
    modeling.updateProperties(createdShape, { name: params.name });
  }

  return createdShape.id;
}

export interface CreateGatewayParams {
  name?: string;
  type?: 'exclusive' | 'parallel' | 'inclusive';
  x?: number;
  y?: number;
}

export function createGateway(modeler: BpmnModeler, params: CreateGatewayParams): string {
  const elementFactory = modeler.get('elementFactory') as any;
  const modeling = modeler.get('modeling') as any;
  const canvas = modeler.get('canvas') as any;

  const typeMap: Record<string, string> = {
    exclusive: 'bpmn:ExclusiveGateway',
    parallel: 'bpmn:ParallelGateway',
    inclusive: 'bpmn:InclusiveGateway',
  };

  const bpmnType = typeMap[params.type || 'exclusive'];
  const position = params.x && params.y ? { x: params.x, y: params.y } : getNextPosition();

  const gatewayShape = elementFactory.createShape({
    type: bpmnType,
  });

  const rootElement = canvas.getRootElement();
  const createdShape = modeling.createShape(gatewayShape, position, rootElement);

  // Update the name after creation if provided
  if (params.name) {
    modeling.updateProperties(createdShape, { name: params.name });
  }

  return createdShape.id;
}

export interface CreateEventParams {
  name?: string;
  type?: 'start' | 'end' | 'intermediate';
  x?: number;
  y?: number;
}

export function createEvent(modeler: BpmnModeler, params: CreateEventParams): string {
  const elementFactory = modeler.get('elementFactory') as any;
  const modeling = modeler.get('modeling') as any;
  const canvas = modeler.get('canvas') as any;

  const typeMap: Record<string, string> = {
    start: 'bpmn:StartEvent',
    end: 'bpmn:EndEvent',
    intermediate: 'bpmn:IntermediateCatchEvent',
  };

  const bpmnType = typeMap[params.type || 'end'];
  const position = params.x && params.y ? { x: params.x, y: params.y } : getNextPosition();

  const eventShape = elementFactory.createShape({
    type: bpmnType,
  });

  const rootElement = canvas.getRootElement();
  const createdShape = modeling.createShape(eventShape, position, rootElement);

  // Update the name after creation if provided
  if (params.name) {
    modeling.updateProperties(createdShape, { name: params.name });
  }

  return createdShape.id;
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

export interface UpdateElementNameParams {
  elementId: string;
  name: string;
}

export function updateElementName(modeler: BpmnModeler, params: UpdateElementNameParams): boolean {
  const elementRegistry = modeler.get('elementRegistry') as any;
  const modeling = modeler.get('modeling') as any;

  const element = elementRegistry.get(params.elementId);
  if (!element) {
    console.error('Element not found:', params.elementId);
    return false;
  }

  // Update the name property on the business object
  modeling.updateProperties(element, {
    name: params.name,
  });

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

export function getDiagramState(modeler: BpmnModeler): { elements: Array<{ id: string; type: string; name?: string }> } {
  const elementRegistry = modeler.get('elementRegistry') as any;
  const elements: Array<{ id: string; type: string; name?: string }> = [];

  elementRegistry.forEach((element: any) => {
    if (element.type !== 'bpmn:Process' && element.type !== 'label') {
      elements.push({
        id: element.id,
        type: element.type,
        name: element.businessObject?.name,
      });
    }
  });

  return { elements };
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
