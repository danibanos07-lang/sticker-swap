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
  status: 'pending' | 'accepted' | 'completed' | 'rejected'
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

export interface MatchResult {
  profile: Profile
  distance_km: number
  match_score: number
  match_label: string
  common_needs: number
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
