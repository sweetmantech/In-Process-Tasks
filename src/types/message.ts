export interface MessageCollection {
  id: string;
  uri: string;
  name: string;
  address: string;
  chain_id: number;
  created_at: string;
  updated_at: string;
  default_admin: string;
  payout_recipient: string;
}

export interface MessageMoment {
  id: string;
  uri: string;
  token_id: number;
  collection: MessageCollection;
  created_at: string;
  max_supply: number;
  updated_at: string;
}

export interface MessageMetadata {
  id: string;
  client: string;
  created_at: string;
  artist_address?: string | null;
}

export interface MessagePart {
  text?: string;
  type: string;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  metadata: MessageMetadata;
  moment?: MessageMoment | null;
}
