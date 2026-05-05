import { Profile, MatchResult } from './types'

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export function getMatchLabel(distanceKm: number, radiusKm: number): string {
  const ratio = distanceKm / radiusKm
  if (ratio <= 0.2) return '🔥 Super Close'
  if (ratio <= 0.5) return '⚡ Nearby'
  if (ratio <= 0.8) return '📍 Reachable'
  return '🗺️ Far Away'
}

export function buildMatchResults(
  userProfile: Profile,
  profiles: Profile[],
  radiusKm: number = 50
): MatchResult[] {
  return profiles
    .filter(p => p.user_id !== userProfile.user_id)
    .map(profile => {
      const distance = calculateDistanceKm(
        userProfile.latitude, userProfile.longitude,
        profile.latitude, profile.longitude
      )
      const score = Math.max(0, Math.round(100 - (distance / radiusKm) * 100))
      return {
        profile,
        distance_km: parseFloat(distance.toFixed(1)),
        match_score: score,
        match_label: getMatchLabel(distance, radiusKm),
        common_needs: 0,
      }
    })
    .filter(m => m.distance_km <= radiusKm)
    .sort((a, b) => b.match_score - a.match_score)
}
