
export interface Asset {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  altText: string;
  tags?: string[];
  isAnalyzing?: boolean;
  timestamp: number;
  size: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'code';
  model?: string;
}
