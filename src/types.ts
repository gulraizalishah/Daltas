export type FeedProfile = {
  user_id: string;
  display_name: string;
  age: number;
  gender: string;
  bio: string;
  location_label: string | null;
  relationship_intention: string | null;
  occupation: string | null;
  education: string | null;
  languages: string[];
  interests: string[];
  mutual_interests: string[];
  photos: string[];
};

export type MatchRow = {
  match_id: string;
  user_id: string;
  display_name: string;
  age: number;
  photo: string | null;
  matched_at: string;
};

export type ConversationRow = {
  conversation_id: string;
  user_id: string;
  display_name: string;
  photo: string | null;
  last_message: string;
  last_message_at: string;
  last_sender_id: string;
  unread_count: number;
  online: boolean | null;
  last_active_at: string | null;
};

export type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id?: string;
  content: string;
  created_at: string;
  read_at: string | null;
  pending?: boolean;
};

export type ChatPeer = {
  user_id: string;
  display_name: string;
  photo: string | null;
  online: boolean | null;
  last_active_at: string | null;
};

export type NotificationRow = {
  id: string;
  type: 'match' | 'like' | 'message' | 'system';
  payload: { name?: string; match_id?: string; conversation_id?: string; text?: string };
  created_at: string;
  read_at: string | null;
};