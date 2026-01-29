import { FunctionDeclaration, Type } from '@google/genai';

// Define tools that Gemini can call to manipulate the BPMN diagram
export const bpmnFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: 'createTask',
    description: 'Create a new task element in the BPMN diagram. Tasks represent work that needs to be done.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'The name/label of the task',
        },
        type: {
          type: Type.STRING,
          description: 'The type of task: "task" (generic), "userTask" (human task), "serviceTask" (automated), "scriptTask" (script execution)',
        },
        x: {
          type: Type.NUMBER,
          description: 'Optional X position on the canvas',
        },
        y: {
          type: Type.NUMBER,
          description: 'Optional Y position on the canvas',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'createGateway',
    description: 'Create a gateway element for decision points or parallel flows in the BPMN diagram.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'Optional name/label for the gateway',
        },
        type: {
          type: Type.STRING,
          description: 'The type of gateway: "exclusive" (XOR, one path), "parallel" (AND, all paths), "inclusive" (OR, one or more paths)',
        },
        x: {
          type: Type.NUMBER,
          description: 'Optional X position on the canvas',
        },
        y: {
          type: Type.NUMBER,
          description: 'Optional Y position on the canvas',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'createEvent',
    description: 'Create an event element (start, end, or intermediate) in the BPMN diagram.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'Optional name/label for the event',
        },
        type: {
          type: Type.STRING,
          description: 'The type of event: "start" (beginning), "end" (conclusion), "intermediate" (between start and end)',
        },
        x: {
          type: Type.NUMBER,
          description: 'Optional X position on the canvas',
        },
        y: {
          type: Type.NUMBER,
          description: 'Optional Y position on the canvas',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'connectElements',
    description: 'Connect two elements with a sequence flow. Use this to define the order of activities.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sourceId: {
          type: Type.STRING,
          description: 'The ID of the source element (where the flow starts)',
        },
        targetId: {
          type: Type.STRING,
          description: 'The ID of the target element (where the flow ends)',
        },
        name: {
          type: Type.STRING,
          description: 'Optional label for the connection (useful for conditional flows)',
        },
      },
      required: ['sourceId', 'targetId'],
    },
  },
  {
    name: 'updateElementName',
    description: 'Change the name/label of an existing element in the diagram.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        elementId: {
          type: Type.STRING,
          description: 'The ID of the element to rename',
        },
        name: {
          type: Type.STRING,
          description: 'The new name for the element',
        },
      },
      required: ['elementId', 'name'],
    },
  },
  {
    name: 'deleteElement',
    description: 'Remove an element from the diagram.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        elementId: {
          type: Type.STRING,
          description: 'The ID of the element to delete',
        },
      },
      required: ['elementId'],
    },
  },
  {
    name: 'getDiagramState',
    description: 'Get the current state of the diagram including all elements and their IDs. Use this to understand what elements exist before connecting or modifying them.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'findElementByName',
    description: 'Find an element by its name and return its ID. Useful when the user refers to elements by name rather than ID.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: 'The name of the element to find (case-insensitive partial match)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'getLastCreatedElement',
    description: 'Get the ID of the most recently created element. Useful for connecting new elements.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'exportDiagram',
    description: 'Export the current diagram as BPMN XML.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [] as string[],
    },
  },
];

export const SYSTEM_INSTRUCTION = `You are a BPMN (Business Process Model and Notation) expert assistant integrated into a diagram editor. Your role is to help users create and modify BPMN diagrams using voice commands.

INITIAL STATE:
The diagram starts with a Start event already present:
- ID: "StartEvent_1"
- Name: "Start"
- Type: bpmn:StartEvent

You can connect new elements to this Start event using its ID "StartEvent_1".

CAPABILITIES:
- Create tasks (regular, user, service, script tasks)
- Create gateways (exclusive/XOR, parallel/AND, inclusive/OR)
- Create events (start, end, intermediate)
- Connect elements with sequence flows
- Rename and delete elements
- Query the current diagram state

WORKFLOW GUIDELINES:
1. When creating elements, always use meaningful names
2. After creating an element, remember its ID for connecting
3. Use getDiagramState to understand existing elements before modifications
4. Use findElementByName when users refer to elements by name
5. Connect elements in logical order (source → target)

RESPONSE STYLE:
- Be concise but friendly
- Confirm what actions you took
- If something fails, explain why and suggest alternatives
- Ask clarifying questions if the user's intent is unclear

EXAMPLE INTERACTIONS:
User: "Add a task called Review Order"
→ Call createTask with name "Review Order", then confirm

User: "Connect the start to the review task"  
→ First call findElementByName("Review") to get ID, then connectElements

User: "Add a decision point after the review"
→ Create an exclusive gateway, connect from the review task

User: "What's in my diagram?"
→ Call getDiagramState and summarize the elements

Remember: You're helping users think through their business processes, so feel free to suggest best practices!`;
