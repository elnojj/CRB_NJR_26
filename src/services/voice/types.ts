export type VoiceBridgeState =
  | 'Ready' | 'Connecting' | 'Listening' | 'Thinking' | 'Speaking'
  | 'Muted' | 'Reconnecting' | 'Disconnected' | 'Error';

export interface VoiceBridgeCallbacks {
  onStatusChange: (status: VoiceBridgeState, detail?: string) => void;
  onTranscript: (role: 'user' | 'agent', text: string) => void;
  onClientToolCall: (
    toolName: string,
    parameters: Record<string, unknown>
  ) => Promise<string> | string;
  onAudioLevel?: (rms: number) => void;
}

export interface VoiceBridge {
  updateCallbacks(callbacks: VoiceBridgeCallbacks): void;
  isLiveWebSocketOpen(): boolean;
  sendContextualUpdate(json: string): void;
  stopOutputAudioImmediately(): void;
  connect(agentId?: string): Promise<void>;
  retry(): Promise<void>;
  disconnect(intentional?: boolean): void;
  setMuted(muted: boolean): void;
}
