import { FunctionDeclaration, Type } from '@google/genai';

// Define tools that Gemini can call to manipulate the BPMN diagram
export const bpmnFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: 'createElement',
    description: 'Create a new BPMN element in the diagram. Can create tasks, gateways, or events.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description: 'The type of element to create. Tasks: "task" (generic), "userTask" (human task), "serviceTask" (automated), "scriptTask" (script execution). Gateways: "exclusiveGateway" (XOR, one path), "parallelGateway" (AND, all paths), "inclusiveGateway" (OR, one or more paths). Events: "startEvent" (beginning), "endEvent" (conclusion), "intermediateEvent" (between start and end).',
        },
        name: {
          type: Type.STRING,
          description: 'Optional name/label for the element',
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
      required: ['type'],
    },
  },
  {
    name: 'updateElements',
    description: 'Update one or more elements in a single operation. Can change name, position (x, y), and/or documentation/comments for each element.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        updates: {
          type: Type.ARRAY,
          description: 'Array of element updates',
          items: {
            type: Type.OBJECT,
            properties: {
              elementId: {
                type: Type.STRING,
                description: 'The ID of the element to update',
              },
              name: {
                type: Type.STRING,
                description: 'New name/label for the element',
              },
              x: {
                type: Type.NUMBER,
                description: 'New X position on the canvas',
              },
              y: {
                type: Type.NUMBER,
                description: 'New Y position on the canvas',
              },
              documentation: {
                type: Type.STRING,
                description: 'Documentation/comment text for the element',
              },
            },
            required: ['elementId'],
          },
        },
      },
      required: ['updates'],
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
    name: 'disconnectElements',
    description: 'Remove the sequence flow connection between two elements.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sourceId: {
          type: Type.STRING,
          description: 'The ID of the source element',
        },
        targetId: {
          type: Type.STRING,
          description: 'The ID of the target element',
        },
      },
      required: ['sourceId', 'targetId'],
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
    description: 'Get the current state of the diagram including: (1) all elements with their IDs, types, names, documentation/comments, positions (x, y) and sizes (width, height), and (2) all connections showing which elements are connected (sourceId → targetId). Use this to understand the diagram structure before making modifications.',
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
  {
    name: 'updateDiagramTitle',
    description: 'Update the title/name of the current diagram session. Use this when the user asks to rename or change the diagram name, or when you want to give the diagram a meaningful name based on its content.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'The new title for the diagram',
        },
      },
      required: ['title'],
    },
  },
];

export const SYSTEM_INSTRUCTION = `You are a BPMN (Business Process Model and Notation) expert assistant integrated into a diagram editor. Your role is to help users create and modify BPMN diagrams using voice commands.

INITIAL STATE:
The diagram starts with a Start event already present:
- ID: "StartEvent_1"
- Name: "Start"
- Type: bpmn:StartEvent
- Position: approximately x=180, y=200

You can connect new elements to this Start event using its ID "StartEvent_1".

CAPABILITIES:
- Create elements using createElement with these types:
  - Tasks: "task", "userTask", "serviceTask", "scriptTask"
  - Gateways: "exclusiveGateway", "parallelGateway", "inclusiveGateway"
  - Events: "startEvent", "endEvent", "intermediateEvent"
- Update elements using updateElements (can modify name, position, and documentation in one call)
- Connect elements with sequence flows
- Disconnect/remove connections between elements
- Delete elements
- Query the current diagram state (includes positions, sizes, and documentation)
- Update the diagram title/name

LAYOUT BEST PRACTICES (IMPORTANT):
Always specify x and y positions when creating elements to ensure a clean, readable diagram:
- Flow direction: Left to right (start events on left, end events on right)
- Horizontal spacing: ~150-180px between connected elements
- Vertical spacing: ~100-120px for parallel branches
- Typical element sizes: Tasks are ~100x80px, Gateways are ~50x50px, Events are ~36x36px
- Keep the main flow on a horizontal line (same y-coordinate)
- Branch paths from gateways vertically (different y, then continue horizontally)
- Avoid edge crossings by planning positions before creating elements

Before creating new elements:
1. Call getDiagramState to see current element positions
2. Calculate appropriate x,y coordinates based on where the new element fits in the flow
3. Place elements to minimize edge crossings and maintain readability

Example positioning for a simple flow:
- Start Event: x=180, y=200
- First Task: x=330, y=180 (tasks are taller, adjust y to center vertically)
- Gateway: x=500, y=195
- Upper branch task: x=650, y=100
- Lower branch task: x=650, y=280
- End Event: x=850, y=200

WORKFLOW GUIDELINES:
1. When creating elements, always use meaningful names AND specify positions
2. After creating an element, remember its ID for connecting
3. Use getDiagramState to understand existing elements and their positions before modifications
4. Use findElementByName when users refer to elements by name
5. Connect elements in logical order (source → target)
6. Use updateElements to rename, reposition, or add documentation to elements

RESPONSE STYLE:
- Be concise but friendly
- Confirm what actions you took
- If something fails, explain why and suggest alternatives
- Ask clarifying questions if the user's intent is unclear

EXAMPLE INTERACTIONS:
User: "Add a task called Review Order"
→ First call getDiagramState to see current positions, then createElement with type "task", name "Review Order", and calculated x,y position

User: "Connect the start to the review task"  
→ First call findElementByName("Review") to get ID, then connectElements

User: "Add a decision point after the review"
→ Get current positions, calculate where the gateway should go (to the right of the review task), create exclusiveGateway with specific position

User: "Rename the review task and add a comment"
→ Use updateElements with the element ID, new name, and documentation text

User: "Move these elements to the right"
→ Use updateElements with new x,y positions for each element

User: "What's in my diagram?"
→ Call getDiagramState and summarize the elements, their layout, and any documentation

Remember: You're helping users think through their business processes. A well-laid-out diagram is easier to understand, so always think about positioning!`;
