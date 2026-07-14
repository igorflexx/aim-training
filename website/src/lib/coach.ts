import type {
  MissBreakdown,
  MissReason,
  SessionFeedback,
  ShotTelemetry,
} from '../types'

const MISS_REASON_LABELS: Record<MissReason, string> = {
  overshoot: 'Слишком резко перелетаешь через цель',
  'slow-lock': 'Слишком долго доводишь прицел',
  'early-fire': 'Стреляешь раньше полной фиксации',
  'micro-adjust': 'Мелкая коррекция перед выстрелом съедает темп',
}

const LIVE_HINTS: Record<MissReason, string> = {
  overshoot: 'Попробуй снизить сенсу на 4-8% и мягче останавливать кисть.',
  'slow-lock':
    'Чуть подними сенсу на 3-6%, если перевод каждый раз запаздывает.',
  'early-fire':
    'Сенсу пока не трогай, сначала добавь 50-80 мс на подтверждение прицела.',
  'micro-adjust':
    'Снизь сенсу на 2-4% или оставь текущую и работай над точкой остановки.',
}

function toEntries(breakdown: MissBreakdown): Array<[MissReason, number]> {
  return [
    ['overshoot', breakdown.overshoot],
    ['slow-lock', breakdown.slowLock],
    ['early-fire', breakdown.earlyFire],
    ['micro-adjust', breakdown.microAdjust],
  ]
}

export function createEmptyBreakdown(): MissBreakdown {
  return {
    overshoot: 0,
    slowLock: 0,
    earlyFire: 0,
    microAdjust: 0,
  }
}

export function getDominantMissReason(
  breakdown: MissBreakdown,
): MissReason | null {
  const sorted = toEntries(breakdown).sort((left, right) => right[1] - left[1])
  return sorted[0]?.[1] ? sorted[0][0] : null
}

export function getLiveTip(lastShot: ShotTelemetry | null): string {
  if (!lastShot) {
    return 'Нажми, чтобы войти в тренировку, и держи прицел в центре цели.'
  }

  if (lastShot.didHit) {
    return 'Попадание засчитано. Держи тот же ритм и не дергай мышь в конце.'
  }

  return lastShot.missReason
    ? LIVE_HINTS[lastShot.missReason]
    : 'Стабилизируй остановку прицела перед выстрелом.'
}

export function buildSessionFeedback(
  breakdown: MissBreakdown,
  accuracy: number,
  avgReactionMs: number,
): SessionFeedback {
  const dominantMiss = getDominantMissReason(breakdown)

  if (!dominantMiss) {
    return {
      dominantMiss: null,
      headline: 'Раунд чистый, критичных паттернов не найдено.',
      recommendation:
        accuracy >= 70
          ? 'Оставь сенсу как есть и повышай темп через более короткие раунды.'
          : 'Сенса выглядит рабочей, лучше улучшать ритм стрельбы и стабильность первого выстрела.',
      liveTip: 'Повтори раунд и посмотри, растет ли точность без смены сенсы.',
    }
  }

  const headline = MISS_REASON_LABELS[dominantMiss]
  const reactionNote =
    avgReactionMs > 550
      ? ' Реакция медленная, поэтому резкое снижение сенсы не поможет.'
      : avgReactionMs < 200
        ? ' Ты уже стреляешь быстро, важнее качество фиксации.'
        : ''

  return {
    dominantMiss,
    headline,
    recommendation: `${LIVE_HINTS[dominantMiss]}${reactionNote}`,
    liveTip: `Точность ${accuracy.toFixed(
      1,
    )}% и средняя реакция ${Math.round(
      avgReactionMs,
    )} мс. Меняй сенсу только небольшими шагами.`,
  }
}
