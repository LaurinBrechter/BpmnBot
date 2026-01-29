# BPMN Voice Bot

A voice-enabled BPMN diagram editor that lets you create and modify business process diagrams using natural language voice commands. Built with React, bpmn-js, and Google's Gemini Live API.

## Features

- **Voice-Controlled Editing**: Create tasks, gateways, events, and connections by simply speaking
- **Real-time Bidirectional Audio**: Natural conversation flow with Gemini AI
- **Full BPMN 2.0 Support**: Create compliant business process diagrams
- **Modern Dark UI**: Beautiful, responsive interface built with Tailwind CSS
- **Text Input Fallback**: Type commands if you prefer not to use voice

## Prerequisites

- Node.js 18+ 
- A Google Gemini API key (get one at [Google AI Studio](https://aistudio.google.com/))

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```

3. **Open your browser** at http://localhost:5173

4. **Enter your Gemini API key** in the input field at the top right

5. **Start speaking!** Click the microphone button and describe what you want to create

## Example Voice Commands

- "Add a task called Review Order"
- "Create a user task named Approve Request"
- "Add an exclusive gateway"
- "Connect the start event to the review task"
- "Add an end event and connect it to the last task"
- "What's in my diagram?"
- "Rename the review task to Process Order"

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **bpmn-js** - BPMN 2.0 diagram renderer and modeler
- **@google/genai** - Gemini Live API SDK
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

## Project Structure

```
src/
├── components/
│   ├── ApiKeyInput.tsx     # API key management
│   ├── BpmnCanvas.tsx      # bpmn-js wrapper
│   ├── ChatTranscript.tsx  # Conversation history
│   └── VoiceControl.tsx    # Mic button and text input
├── contexts/
│   └── ModelerContext.tsx  # Shared modeler instance
├── hooks/
│   └── useGeminiLive.ts    # Gemini WebSocket connection
├── services/
│   ├── bpmnOperations.ts   # BPMN manipulation functions
│   └── geminiTools.ts      # Function calling definitions
├── types/
│   └── bpmn-js.d.ts        # TypeScript declarations
├── App.tsx
├── main.tsx
└── index.css               # Tailwind + bpmn-js styles
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## How It Works

1. **Voice Input**: Your microphone streams audio directly to Gemini Live API
2. **AI Processing**: Gemini understands your intent and calls appropriate BPMN functions
3. **Diagram Updates**: Function calls manipulate the bpmn-js modeler in real-time
4. **Voice Response**: Gemini confirms actions with spoken feedback

## License

MIT

