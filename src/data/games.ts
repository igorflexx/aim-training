import type { GameId, GameProfile } from '../types'

const CS2_TURN_SCALE = 0.022
const CS2_BASELINE_SENSITIVITY = 1.35

export const GAME_PROFILES: GameProfile[] = [
  {
    id: 'cs2',
    title: 'Counter-Strike 2',
    summary: 'Базовый профиль для всех конвертаций.',
    turnScale: CS2_TURN_SCALE,
    defaultSensitivity: 1.35,
    accent: '#ffb657',
  },
  {
    id: 'valorant',
    title: 'Valorant',
    summary: 'Низкая базовая сенса с акцентом на контроль микро-коррекций.',
    turnScale: 0.07,
    defaultSensitivity: 0.35,
    accent: '#ff6f7d',
  },
  {
    id: 'warzone',
    title: 'Warzone',
    summary: 'Быстрые переводы и tracking на средних дистанциях.',
    turnScale: 0.0066,
    defaultSensitivity: 4.5,
    accent: '#8fd5ff',
  },
  {
    id: 'apex',
    title: 'Apex Legends',
    summary: 'Длинный tracking и стабильный контроль отдачи.',
    turnScale: 0.022,
    defaultSensitivity: 1.8,
    accent: '#ff9157',
  },
  {
    id: 'pubg',
    title: 'PUBG',
    summary: 'Большая разница между hipfire и общей скоростью камеры.',
    turnScale: 2.222,
    defaultSensitivity: 0.017,
    accent: '#f7c948',
  },
  {
    id: 'deadlock',
    title: 'Deadlock',
    summary: 'Смесь дуэльной точности и резких перемещений камеры.',
    turnScale: 0.044,
    defaultSensitivity: 0.675,
    accent: '#84e2bc',
  },
  {
    id: 'rust',
    title: 'Rust',
    summary: 'Сенса под широкий FOV и агрессивные развороты.',
    turnScale: 0.1125,
    defaultSensitivity: 0.265,
    accent: '#f8a65a',
  },
  {
    id: 'fortnite',
    title: 'Fortnite',
    summary: 'Подходит для flick-ов и быстрой перестройки позиции.',
    turnScale: 0.005555,
    defaultSensitivity: 6.2,
    accent: '#7eb6ff',
  },
  {
    id: 'r6',
    title: 'Rainbow Six Siege',
    summary: 'Точная посадка прицела и медленный темп по сравнению с arena shooters.',
    turnScale: (0.0001 * 180) / Math.PI,
    defaultSensitivity: 7.4,
    accent: '#d0d7ff',
  },
  {
    id: 'overwatch2',
    title: 'Overwatch 2',
    summary: 'Более быстрый tracking с плотной работой по вертикали.',
    turnScale: 0.0066,
    defaultSensitivity: 5,
    accent: '#ff8b5c',
  },
  {
    id: 'thefinals',
    title: 'The Finals',
    summary: 'Вертикальная мобильность и частые угловые входы.',
    turnScale: 0.001,
    defaultSensitivity: 30,
    accent: '#f7786b',
  },
  {
    id: 'tarkov',
    title: 'Escape from Tarkov',
    summary: 'Осторожная посадка прицела, где важен контроль overshoot.',
    turnScale: 0.125,
    defaultSensitivity: 0.24,
    accent: '#9db282',
  },
]

const GAME_MAP = new Map(GAME_PROFILES.map((profile) => [profile.id, profile]))

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function roundSensitivity(value: number): number {
  return Number(value.toFixed(value >= 10 ? 2 : value >= 1 ? 3 : 4))
}

export function getGameProfile(gameId: GameId): GameProfile {
  return GAME_MAP.get(gameId) ?? GAME_PROFILES[0]
}

export function convertSensitivity(
  sourceGame: GameId,
  targetGame: GameId,
  sourceSensitivity: number,
): number {
  const source = getGameProfile(sourceGame)
  const target = getGameProfile(targetGame)
  return roundSensitivity(
    sourceSensitivity * (source.turnScale / target.turnScale),
  )
}

export function calculateEdpi(
  settings: Pick<{ dpi: number; sensitivity: number }, 'dpi' | 'sensitivity'>,
): number {
  return Number((settings.dpi * settings.sensitivity).toFixed(2))
}

export function calculateCm360(
  settings: Pick<
    { selectedGame: GameId; dpi: number; sensitivity: number },
    'selectedGame' | 'dpi' | 'sensitivity'
  >,
): number {
  const profile = getGameProfile(settings.selectedGame)
  const raw =
    (2.54 * 360) /
    Math.max(settings.dpi * settings.sensitivity * profile.turnScale, 0.0001)
  return Number(raw.toFixed(2))
}

export function getEquivalentSensitivities(
  selectedGame: GameId,
  sensitivity: number,
): Array<{ game: GameProfile; sensitivity: number }> {
  return GAME_PROFILES.map((game) => ({
    game,
    sensitivity: convertSensitivity(selectedGame, game.id, sensitivity),
  }))
}

export function getTrainerTurnScalar(
  selectedGame: GameId,
  sensitivity: number,
): number {
  const profile = getGameProfile(selectedGame)
  const normalized =
    (sensitivity * profile.turnScale) /
    (CS2_BASELINE_SENSITIVITY * CS2_TURN_SCALE)
  return clamp(0.00185 * normalized, 0.00045, 0.0115)
}
