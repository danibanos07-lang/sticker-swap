export interface Profile {
  id: string
  user_id: string
  username: string
  bio?: string
  avatar_url?: string
  age?: number
  latitude: number
  longitude: number
  search_radius_km: number
  has_seen_tutorial: boolean
  created_at: string
  updated_at: string
}

export interface UserSticker {
  id: string
  user_id: string
  sticker_number: number
  sticker_name: string
  team: string
  status: 'have' | 'need' | 'have_duplicate'
  created_at: string
}

export interface Trade {
  id: string
  initiator_id: string
  responder_id: string
  initiator_sticker_number: number
  responder_sticker_number: number
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'canceled'
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  trade_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: { username: string }
}

// Direct messaging between users (independent of trades)
// SQL migration needed:
// CREATE TABLE direct_messages (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   sender_id UUID NOT NULL REFERENCES auth.users(id),
//   receiver_id UUID NOT NULL REFERENCES auth.users(id),
//   content TEXT NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT now(),
//   read BOOLEAN DEFAULT false
// );
// CREATE INDEX ON direct_messages(receiver_id, read);
// CREATE INDEX ON direct_messages(sender_id, receiver_id, created_at);
// ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can read their own messages" ON direct_messages
//   FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
// CREATE POLICY "Users can send messages" ON direct_messages
//   FOR INSERT WITH CHECK (auth.uid() = sender_id);
// CREATE POLICY "Receivers can mark read" ON direct_messages
//   FOR UPDATE USING (auth.uid() = receiver_id);
export interface DirectMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  read: boolean
  sender_username?: string
}

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export interface ConversationPreview {
  userId: string
  username: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

// Match score between two users based on sticker overlap
export interface MatchScore {
  canGive: number      // stickers current user can give to the other
  canReceive: number   // stickers current user can receive from the other
  totalMatches: number // canGive + canReceive
  percentage: number   // (totalMatches / max_possible) * 100
}

export interface MatchResult {
  profile: Profile
  distance_km: number
  match_score: number
  match_label: string
  common_needs: number
  // Extended match info (populated by matching-algorithm.ts)
  stickerMatchScore?: MatchScore
}

// WC 2026 Teams
export const WC2026_TEAMS = [
  'Argentina', 'Brazil', 'France', 'England', 'Spain', 'Germany',
  'Portugal', 'Netherlands', 'Belgium', 'Italy', 'Croatia', 'Uruguay',
  'Mexico', 'USA', 'Canada', 'Morocco', 'Senegal', 'Japan', 'South Korea',
  'Australia', 'Colombia', 'Ecuador', 'Chile', 'Peru', 'Switzerland',
  'Denmark', 'Poland', 'Serbia', 'Turkey', 'Saudi Arabia', 'Iran', 'Qatar',
  'Egypt', 'Nigeria', 'Cameroon', 'Ghana', 'Algeria', 'Tunisia',
  'Costa Rica', 'Panama', 'Honduras', 'Paraguay', 'Bolivia', 'Venezuela',
  'China', 'Indonesia', 'New Zealand', 'FIFA Stars',
] as const

export type WC2026Team = typeof WC2026_TEAMS[number]
