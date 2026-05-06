import { MatchScore, MatchResult, Profile } from './types'

// Haversine formula — returns distance in km
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

interface UserStickerInfo {
  userId: string
  haveNumbers: Set<number>       // stickers marked 'have' (no duplicates)
  duplicateNumbers: Set<number>  // stickers marked 'have_duplicate'
  needNumbers: Set<number>       // stickers marked 'need'
}

// Fetch a user's sticker sets from Supabase
export async function getUserStickerInfo(
  userId: string,
  supabase: any
): Promise<UserStickerInfo> {
  const { data } = await supabase
    .from('user_stickers')
    .select('sticker_number, status')
    .eq('user_id', userId)

  const haveNumbers = new Set<number>()
  const duplicateNumbers = new Set<number>()
  const needNumbers = new Set<number>()

  for (const s of data || []) {
    if (s.status === 'have') haveNumbers.add(s.sticker_number)
    else if (s.status === 'have_duplicate') duplicateNumbers.add(s.sticker_number)
    else if (s.status === 'need') needNumbers.add(s.sticker_number)
  }

  return { userId, haveNumbers, duplicateNumbers, needNumbers }
}

// Calculate how many stickers two users can trade with each other
// canGive  = stickers that userA has duplicates of AND userB needs
// canReceive = stickers that userB has duplicates of AND userA needs
export function calculateMatchScore(
  userA: UserStickerInfo,
  userB: UserStickerInfo
): MatchScore {
  let canGive = 0
  for (const num of userA.duplicateNumbers) {
    if (userB.needNumbers.has(num)) canGive++
  }

  let canReceive = 0
  for (const num of userB.duplicateNumbers) {
    if (userA.needNumbers.has(num)) canReceive++
  }

  const totalMatches = canGive + canReceive

  // Percentage: out of how many stickers userA needs, how many can the match satisfy (plus inverse)
  const maxPossible = Math.max(
    (userA.needNumbers.size + userB.needNumbers.size),
    1
  )
  const percentage = Math.min(100, Math.round((totalMatches / maxPossible) * 100))

  return { canGive, canReceive, totalMatches, percentage }
}

// Find and rank matches for the current user among a list of profiles
// Filters by the user's search radius. Ranked by sticker match percentage (descending).
export async function findMatches(
  currentUser: Profile,
  allUsers: Profile[],
  supabase: any
): Promise<MatchResult[]> {
  if (!currentUser.latitude || !currentUser.longitude) return []

  const radiusKm = currentUser.search_radius_km || 50

  // Filter nearby users first (avoid fetching stickers for everyone)
  const nearbyUsers = allUsers.filter(u => {
    if (u.user_id === currentUser.user_id) return false
    if (!u.latitude || !u.longitude) return false
    const dist = calculateDistance(
      currentUser.latitude, currentUser.longitude,
      u.latitude, u.longitude
    )
    return dist <= radiusKm
  })

  if (nearbyUsers.length === 0) return []

  // Fetch current user's sticker info
  const myInfo = await getUserStickerInfo(currentUser.user_id, supabase)

  // Fetch sticker info for all nearby users in parallel
  const otherInfos = await Promise.all(
    nearbyUsers.map(u => getUserStickerInfo(u.user_id, supabase))
  )

  const results: MatchResult[] = nearbyUsers.map((profile, i) => {
    const dist = parseFloat(
      calculateDistance(
        currentUser.latitude, currentUser.longitude,
        profile.latitude, profile.longitude
      ).toFixed(1)
    )

    const stickerMatchScore = calculateMatchScore(myInfo, otherInfos[i])

    // Legacy match_score: purely distance-based 0-100 for backward compat
    const distScore = Math.max(0, Math.round(100 - (dist / radiusKm) * 100))

    return {
      profile,
      distance_km: dist,
      match_score: distScore,
      match_label: getMatchLabel(dist, radiusKm),
      common_needs: stickerMatchScore.totalMatches,
      stickerMatchScore,
    }
  })

  // Sort by sticker match percentage descending, then by distance
  return results.sort((a, b) => {
    const pctDiff = (b.stickerMatchScore?.percentage ?? 0) - (a.stickerMatchScore?.percentage ?? 0)
    if (pctDiff !== 0) return pctDiff
    return a.distance_km - b.distance_km
  })
}

function getMatchLabel(distanceKm: number, radiusKm: number): string {
  const ratio = distanceKm / radiusKm
  if (ratio <= 0.2) return '🔥 Super Close'
  if (ratio <= 0.5) return '⚡ Nearby'
  if (ratio <= 0.8) return '📍 Reachable'
  return '🗺️ Far Away'
}
