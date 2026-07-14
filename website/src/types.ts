export type GameId =
  | 'cs2'
  | 'valorant'
  | 'warzone'
  | 'apex'
  | 'pubg'
  | 'deadlock'
  | 'rust'
  | 'fortnite'
  | 'r6'
  | 'overwatch2'
  | 'thefinals'
  | 'tarkov'

export type MissReason =
  | 'overshoot'
  | 'slow-lock'
  | 'early-fire'
  | 'micro-adjust'

export interface GameProfile {
  id: GameId
  title: string
  summary: string
  turnScale: number
  defaultSensitivity: number
  accent: string
}

export interface CrosshairSettings {
  color: string
  size: number
  gap: number
  thickness: number
  opacity: number
  dot: boolean
  tStyle: boolean
}

export interface AudioSettings {
  volume: number
  selectedTrackId: string
}

export interface TrainerSettings {
  selectedGame: GameId
  sensitivity: number
  dpi: number
  roundDurationSec: number
  targetSize: number
  goalScore: number
  crosshair: CrosshairSettings
  audio: AudioSettings
}

export interface ShotTelemetry {
  didHit: boolean
  reactionMs: number
  missReason: MissReason | null
  errorX: number
  errorY: number
  distance: number
  speed: number
  targetId: string
}

export interface LiveStats {
  score: number
  shots: number
  hits: number
  accuracy: number
  timeLeftMs: number
  bestStreak: number
  lastShot: ShotTelemetry | null
}

export interface MissBreakdown {
  overshoot: number
  slowLock: number
  earlyFire: number
  microAdjust: number
}

export interface SessionFeedback {
  dominantMiss: MissReason | null
  headline: string
  recommendation: string
  liveTip: string
}

export interface SessionSummary {
  id: string
  playedAt: string
  mapName: string
  selectedGame: GameId
  sensitivity: number
  dpi: number
  score: number
  shots: number
  hits: number
  accuracy: number
  avgReactionMs: number
  won: boolean
  missBreakdown: MissBreakdown
  feedback: SessionFeedback
}
