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