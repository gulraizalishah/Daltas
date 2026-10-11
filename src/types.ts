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
  type: 'match' | 'like' | 'message' | 'comment' | 'post_like' | 'system';
  payload: { name?: string; match_id?: string; conversation_id?: string; post_id?: string; text?: string };
  created_at: string;
  read_at: string | null;
};

export type PostRow = {
  id: string;
  user_id: string;
  image_path: string | null;
  caption: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
};

export type CommentRow = {
  id: string;
  user_id: string;
  display_name: string;
  photo: string | null;
  content: string;
  created_at: string;
  mine: boolean;
};

export type AdminStats = {
  users_total: number; new_users_7d: number; active_24h: number; suspended_total: number; banned_total: number;
  matches_total: number; messages_24h: number; live_sessions_24h: number; open_reports: number; posts_total: number;
};

export type AdminUser = {
  user_id: string; email: string; display_name: string; gender: string; age: number; status: string; role: string;
  created_at: string; last_active_at: string | null; report_count: number; photo: string | null;
};

export type AdminReport = {
  id: string; created_at: string; reason: string; details: string | null; status: string; is_live: boolean;
  reporter_name: string; reported_id: string; reported_name: string; reported_bio: string;
  reported_status: string; reported_photo: string | null; reported_total_reports: number;
};

export type AdminPost = {
  id: string; user_id: string; author_name: string; image_path: string | null; caption: string; created_at: string;
};