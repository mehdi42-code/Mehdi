export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  role: MessageRole;
  text: string;
  timestamp: number;
  isError?: boolean;
  groundingUrls?: Array<{ title: string; uri: string }>;
}

export interface GenerationState {
  isGenerating: boolean;
  progress: string; // Message to show user
}

export enum AppMode {
  UPLOAD = 'upload',
  TRY_ON = 'try_on'
}

export interface StylistOption {
  id: string;
  label: string;
  prompt: string;
  icon: string; // emoji or icon name
}