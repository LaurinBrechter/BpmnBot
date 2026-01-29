import { useCallback, useRef, useState, useEffect } from 'react';
import { 
  GoogleGenAI, 
  Modality,
  ActivityHandling,
  type Session,
  type LiveServerMessage, 
  type FunctionCall 
} from '@google/genai';
import { bpmnFunctionDeclarations, SYSTEM_INSTRUCTION } from '../services/geminiTools';
import {
  createTask,
  createGateway,
  createEvent,
  connectElements,
  updateElementName,
  deleteElement,
  exportDiagram,
  getDiagramState,
  findElementByName,
  getLastCreatedElement,
} from '../services/bpmnOperations';
import type BpmnModeler from 'bpmn-js/lib/Modeler';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseGeminiLiveOptions {
  apiKey: string;
  modelerRef: React.MutableRefObject<BpmnModeler | null>;
  onUserTranscript?: (text: string) => void;
  onAssistantResponse?: (text: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

// Utility to convert Float32 PCM to base64 encoded Int16
function float32ToBase64(float32Array: Float32Array): string {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decode base64 audio to Float32Array for playback
function decodeBase64Audio(base64: string): Float32Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

export function useGeminiLive({
  apiKey,
  modelerRef,
  onUserTranscript,
  onAssistantResponse,
  onStatusChange,
}: UseGeminiLiveOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isListening, setIsListening] = useState(false);
  
  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const isCleaningUpRef = useRef(false);
  const isRecordingRef = useRef(false);
  
  // Transcript accumulation refs
  const inputTranscriptRef = useRef<string>('');
  const outputTranscriptRef = useRef<string>('');
  
  // Audio refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputGainNodeRef = useRef<GainNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextStartTimeRef = useRef(0);

  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Initialize GoogleGenAI client
  useEffect(() => {
    if (apiKey && !clientRef.current) {
      clientRef.current = new GoogleGenAI({
        apiKey,
        httpOptions: { apiVersion: 'v1alpha' },
      });
    }
  }, [apiKey]);

  const executeFunctionCall = useCallback(async (functionCall: FunctionCall): Promise<any> => {
    const modeler = modelerRef.current;
    if (!modeler) {
      return { error: 'Modeler not initialized' };
    }

    const { name, args } = functionCall;
    const params = args as Record<string, any>;

    try {
      switch (name) {
        case 'createTask': {
          const id = createTask(modeler, params as any);
          return { success: true, elementId: id, message: `Created task "${params.name}"` };
        }
        case 'createGateway': {
          const id = createGateway(modeler, params as any);
          return { success: true, elementId: id, message: `Created ${params.type || 'exclusive'} gateway` };
        }
        case 'createEvent': {
          const id = createEvent(modeler, params as any);
          return { success: true, elementId: id, message: `Created ${params.type || 'end'} event` };
        }
        case 'connectElements': {
          const id = connectElements(modeler, params as any);
          if (id) {
            return { success: true, connectionId: id, message: 'Connected elements' };
          }
          return { success: false, error: 'Failed to connect elements - check element IDs' };
        }
        case 'updateElementName': {
          const result = updateElementName(modeler, params as any);
          return { success: result, message: result ? 'Updated element name' : 'Element not found' };
        }
        case 'deleteElement': {
          const result = deleteElement(modeler, params as any);
          return { success: result, message: result ? 'Deleted element' : 'Element not found' };
        }
        case 'getDiagramState': {
          const state = getDiagramState(modeler);
          return { success: true, ...state };
        }
        case 'findElementByName': {
          const id = findElementByName(modeler, params.name);
          return { success: !!id, elementId: id, message: id ? `Found element with ID: ${id}` : 'Element not found' };
        }
        case 'getLastCreatedElement': {
          const id = getLastCreatedElement(modeler);
          return { success: !!id, elementId: id };
        }
        case 'exportDiagram': {
          const xml = await exportDiagram(modeler);
          return { success: true, xml: xml.substring(0, 500) + '...' };
        }
        default:
          return { error: `Unknown function: ${name}` };
      }
    } catch (error) {
      return { error: String(error) };
    }
  }, [modelerRef]);

  const initializeAudioContexts = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Input context at 16kHz for sending to Gemini
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      // Output context at 24kHz for playing Gemini responses
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      outputGainNodeRef.current = outputAudioContextRef.current.createGain();
      outputGainNodeRef.current.connect(outputAudioContextRef.current.destination);
    }
  }, []);

  const playAudioChunk = useCallback(async (base64Data: string) => {
    if (!outputAudioContextRef.current || !outputGainNodeRef.current) return;

    const float32 = decodeBase64Audio(base64Data);
    const audioBuffer = outputAudioContextRef.current.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = outputAudioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputGainNodeRef.current);

    // Queue audio to play in sequence
    nextStartTimeRef.current = Math.max(
      nextStartTimeRef.current,
      outputAudioContextRef.current.currentTime
    );

    source.addEventListener('ended', () => {
      sourcesRef.current.delete(source);
    });

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    sourcesRef.current.add(source);
  }, []);

  const connect = useCallback(async () => {
    if (!apiKey || !clientRef.current) {
      console.error('No API key or client not initialized');
      return;
    }

    if (sessionRef.current) {
      console.log('Session already exists');
      return;
    }

    try {
      updateStatus('connecting');
      isCleaningUpRef.current = false;

      // Initialize audio contexts
      initializeAudioContexts();
      if (outputAudioContextRef.current) {
        nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
      }

      const session = await clientRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Connected to Gemini Live API');
            updateStatus('connected');
          },
          onmessage: async (message) => {
            // Handle tool/function calls
            if (message.toolCall?.functionCalls) {
              const functionResponses = [];
              for (const fc of message.toolCall.functionCalls) {
                console.log('Executing function:', fc.name, fc.args);
                onAssistantResponse?.(`Executing: ${fc.name}`);
                
                const response = await executeFunctionCall(fc);
                functionResponses.push({
                  id: fc.id,
                  name: fc.name,
                  response,
                });
              }

              // Send function responses back
              sessionRef.current?.sendToolResponse({
                functionResponses,
              });
            }

            // Handle audio output
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
            if (audio?.data) {
              playAudioChunk(audio.data);
            }

            // Accumulate output transcription (what assistant said)
            const outputText = message.serverContent?.outputTranscription?.text;
            if (outputText) {
              outputTranscriptRef.current += outputText;
            }

            // Accumulate input transcription (what user said)
            const inputText = message.serverContent?.inputTranscription?.text;
            if (inputText) {
              inputTranscriptRef.current += inputText;
            }

            // Handle interruptions - clear accumulated transcripts
            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
              // Clear transcripts on interruption
              inputTranscriptRef.current = '';
              outputTranscriptRef.current = '';
            }

            // When turn is complete, emit accumulated transcripts
            if (message.serverContent?.turnComplete) {
              // Emit accumulated user transcript
              if (inputTranscriptRef.current.trim()) {
                onUserTranscript?.(inputTranscriptRef.current.trim());
                inputTranscriptRef.current = '';
              }
              // Emit accumulated assistant transcript
              if (outputTranscriptRef.current.trim()) {
                onAssistantResponse?.(outputTranscriptRef.current.trim());
                outputTranscriptRef.current = '';
              }
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Gemini Live error:', e.message);
            updateStatus('error');
          },
          onclose: (e: CloseEvent) => {
            if (!isCleaningUpRef.current) {
              console.log('Session closed - code:', e.code, 'wasClean:', e.wasClean, e);
              if (isRecordingRef.current) {
                console.error('Unexpected session close');
              }
            }
            console.log('Disconnected from Gemini Live API');
            updateStatus('disconnected');
            setIsListening(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: bpmnFunctionDeclarations }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          realtimeInputConfig: {
            activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
      });

      sessionRef.current = session;
    } catch (error) {
      console.error('Failed to connect:', error);
      updateStatus('error');
    }
  }, [apiKey, executeFunctionCall, initializeAudioContexts, playAudioChunk, updateStatus, onAssistantResponse, onUserTranscript]);

  const startListening = useCallback(async () => {
    if (!sessionRef.current) {
      await connect();
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!sessionRef.current) {
      console.error('Session not available');
      return;
    }

    if (!inputAudioContextRef.current) {
      initializeAudioContexts();
    }

    try {
      // Resume audio context if suspended
      if (inputAudioContextRef.current?.state === 'suspended') {
        await inputAudioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      mediaStreamRef.current = stream;

      if (inputAudioContextRef.current) {
        sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
        
        // Use ScriptProcessor for audio processing (compatible approach)
        const bufferSize = 4096;
        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

        scriptProcessorRef.current.onaudioprocess = (event) => {
          if (sessionRef.current && isRecordingRef.current) {
            const inputBuffer = event.inputBuffer;
            const pcmData = inputBuffer.getChannelData(0);
            
            // Convert to base64 and send
            const base64Audio = float32ToBase64(pcmData);
            
            sessionRef.current.sendRealtimeInput({
              media: {
                data: base64Audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          }
        };

        sourceNodeRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);

        isRecordingRef.current = true;
        setIsListening(true);
        console.log('Started listening');
      }
    } catch (error) {
      console.error('Failed to start listening:', error);
      stopListening();
    }
  }, [connect, initializeAudioContexts]);

  const stopListening = useCallback(() => {
    isRecordingRef.current = false;
    setIsListening(false);

    if (scriptProcessorRef.current && sourceNodeRef.current) {
      scriptProcessorRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }
    scriptProcessorRef.current = null;
    sourceNodeRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    console.log('Stopped listening');
  }, []);

  const disconnect = useCallback(() => {
    isCleaningUpRef.current = true;
    stopListening();
    
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        // Ignore close errors
      }
      sessionRef.current = null;
    }

    // Stop any playing audio
    for (const source of sourcesRef.current.values()) {
      try {
        source.stop();
      } catch (e) {
        // Ignore
      }
    }
    sourcesRef.current.clear();

    // Clear accumulated transcripts
    inputTranscriptRef.current = '';
    outputTranscriptRef.current = '';

    updateStatus('disconnected');
  }, [stopListening, updateStatus]);

  const sendTextMessage = useCallback(async (text: string) => {
    if (!sessionRef.current) {
      await connect();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (sessionRef.current) {
      onUserTranscript?.(text);
      sessionRef.current.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      });
    }
  }, [connect, onUserTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCleaningUpRef.current = true;
      
      if (sessionRef.current) {
        try {
          sessionRef.current.close();
        } catch (e) {
          // Ignore
        }
        sessionRef.current = null;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
      }
      if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
      }
    };
  }, []);

  return {
    status,
    isListening,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendTextMessage,
  };
}
