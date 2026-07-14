import './App.css'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'

import { AimTrainerScene } from './components/AimTrainerScene'
import {
  calculateCm360,
  calculateEdpi,
  convertSensitivity,
  GAME_PROFILES,
  getEquivalentSensitivities,
  getGameProfile,
} from './data/games'
import {
  buildSessionFeedback,
  createEmptyBreakdown,
  getLiveTip,
} from './lib/coach'
import { loadHistory, loadSettings, saveHistory, saveSettings } from './lib/storage'
import type {
  GameId,
  LiveStats,
  MissBreakdown,
  SessionFeedback,
  SessionSummary,
  TrainerSettings,
} from './types'

type MenuPanel = 'main' | 'settings' | 'crosshair' | 'about'

const defaultSettings: TrainerSettings = {
  selectedGame: 'cs2',
  sensitivity: 1.35,
  dpi: 800,
  roundDurationSec: 45,
  targetSize: 0.42,
  goalScore: 30,
  crosshair: {
    color: '#ffffff',
    size: 15,
    gap: 6,
    thickness: 2,
    opacity: 0.95,
    dot: true,
    tStyle: false,
  },
}

const emptyFeedback: SessionFeedback = {
  dominantMiss: null,
  headline: 'Тренировка готова.',
  recommendation:
    'Выбери профиль, введи свою сенсу и запускай полноэкранный Grind Shot 3x3.',
  liveTip: 'Основа конвертации берется из CS2, а остальные игры пересчитываются относительно нее.',
}

function createDefaultLiveStats(roundDurationSec: number): LiveStats {
  return {
    score: 0,
    shots: 0,
    hits: 0,
    accuracy: 0,
    timeLeftMs: roundDurationSec * 1000,
    bestStreak: 0,
    lastShot: null,
  }
}

function formatMs(value: number): string {
  return `${Math.round(value)} мс`
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sanitizeNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function App() {
  const [settings, setSettings] = useState<TrainerSettings>(() =>
    loadSettings(defaultSettings),
  )
  const [history, setHistory] = useState<SessionSummary[]>(() => loadHistory())
  const [sessionNonce, setSessionNonce] = useState(1)
  const [menuOpen, setMenuOpen] = useState(true)
  const [activePanel, setActivePanel] = useState<MenuPanel>('main')
  const [liveStats, setLiveStats] = useState<LiveStats>(() =>
    createDefaultLiveStats(defaultSettings.roundDurationSec),
  )
  const [lastBreakdown, setLastBreakdown] = useState<MissBreakdown>(
    createEmptyBreakdown(),
  )
  const [feedback, setFeedback] = useState<SessionFeedback>(emptyFeedback)
  const [isLocked, setIsLocked] = useState(false)
  const [converterSourceGame, setConverterSourceGame] =
    useState<GameId>('valorant')
  const [converterSourceSensitivity, setConverterSourceSensitivity] = useState(0.35)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    saveHistory(history)
  }, [history])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen((current) => !current)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const equivalents = useMemo(
    () => getEquivalentSensitivities(settings.selectedGame, settings.sensitivity),
    [settings.selectedGame, settings.sensitivity],
  )

  const currentProfile = getGameProfile(settings.selectedGame)
  const convertedFromSource = convertSensitivity(
    converterSourceGame,
    settings.selectedGame,
    converterSourceSensitivity,
  )
  const cs2Equivalent = convertSensitivity(
    settings.selectedGame,
    'cs2',
    settings.sensitivity,
  )
  const edpi = calculateEdpi(settings)
  const cm360 = calculateCm360(settings)

  const crosshairStyle = {
    '--crosshair-color': settings.crosshair.color,
    '--crosshair-size': `${settings.crosshair.size}px`,
    '--crosshair-gap': `${settings.crosshair.gap}px`,
    '--crosshair-thickness': `${settings.crosshair.thickness}px`,
    '--crosshair-opacity': `${settings.crosshair.opacity}`,
  } as CSSProperties

  function updateSettings(patch: Partial<TrainerSettings>) {
    setSettings((current) => ({ ...current, ...patch }))
  }

  function updateCrosshair<K extends keyof TrainerSettings['crosshair']>(
    key: K,
    value: TrainerSettings['crosshair'][K],
  ) {
    setSettings((current) => ({
      ...current,
      crosshair: {
        ...current.crosshair,
        [key]: value,
      },
    }))
  }

  async function startTraining() {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen?.()
      } catch {
        // Ignore browser fullscreen rejection.
      }
    }

    setLiveStats(createDefaultLiveStats(settings.roundDurationSec))
    setLastBreakdown(createEmptyBreakdown())
    setMenuOpen(false)
    setActivePanel('main')
    setSessionNonce((current) => current + 1)
  }

  function handleGameChange(nextGame: GameId) {
    setSettings((current) => ({
      ...current,
      selectedGame: nextGame,
      sensitivity: convertSensitivity(
        current.selectedGame,
        nextGame,
        current.sensitivity,
      ),
    }))
  }

  function handleSessionComplete(
    payload: Omit<LiveStats, 'lastShot'> & {
      avgReactionMs: number
      missBreakdown: MissBreakdown
    },
  ) {
    const sessionFeedback = buildSessionFeedback(
      payload.missBreakdown,
      payload.accuracy,
      payload.avgReactionMs,
    )

    const summary: SessionSummary = {
      id: crypto.randomUUID(),
      playedAt: new Date().toISOString(),
      mapName: 'Grind Shot 3x3',
      selectedGame: settings.selectedGame,
      sensitivity: settings.sensitivity,
      dpi: settings.dpi,
      score: payload.score,
      shots: payload.shots,
      hits: payload.hits,
      accuracy: payload.accuracy,
      avgReactionMs: payload.avgReactionMs,
      won: payload.score >= settings.goalScore,
      missBreakdown: payload.missBreakdown,
      feedback: sessionFeedback,
    }

    setHistory((current) => [summary, ...current].slice(0, 30))
    setLiveStats({
      ...payload,
      lastShot: null,
    })
    setLastBreakdown(payload.missBreakdown)
    setFeedback(sessionFeedback)
    setMenuOpen(true)
    setActivePanel('main')
  }

  return (
    <div className="app-root">
      <div className="scene-shell">
        <AimTrainerScene
          settings={settings}
          sessionNonce={sessionNonce}
          paused={menuOpen}
          onLiveStatsChange={(stats, breakdown) => {
            setLiveStats(stats)
            setLastBreakdown(breakdown)
          }}
          onSessionComplete={handleSessionComplete}
          onLockChange={setIsLocked}
        />
        <div className="scene-vignette" />
      </div>

      <div className="hud-top">
        <div className="hud-card">
          <span className="status-pill">{currentProfile.title}</span>
          <strong>Grind Shot 3x3</strong>
          <span>{currentProfile.summary}</span>
        </div>
        <div className="hud-card">
          <span>Счет</span>
          <strong>{liveStats.score}</strong>
          <span>Цель: {settings.goalScore}</span>
        </div>
        <div className="hud-card">
          <span>Точность</span>
          <strong>{liveStats.accuracy.toFixed(1)}%</strong>
          <span>
            {liveStats.hits}/{liveStats.shots} попаданий
          </span>
        </div>
        <div className="hud-card">
          <span>Время</span>
          <strong>{Math.ceil(liveStats.timeLeftMs / 1000)} сек</strong>
          <span>Стрик: {liveStats.bestStreak}</span>
        </div>
      </div>

      <div className="hud-bottom">
        <div className="hud-card compact">
          <span>Подсказка</span>
          <strong>{feedback.headline}</strong>
          <span>{getLiveTip(liveStats.lastShot) || feedback.liveTip}</span>
        </div>
        <div className="hud-card compact align-right">
          <span>Статус</span>
          <strong>{menuOpen ? 'Меню открыто' : isLocked ? 'Тренировка идет' : 'Кликни для захвата мыши'}</strong>
          <span>
            {menuOpen
              ? 'Esc закрывает меню и возвращает в тренировку.'
              : 'Esc открывает меню, настройки и рекомендации.'}
          </span>
        </div>
      </div>

      <div
        className={`crosshair ${settings.crosshair.tStyle ? 'crosshair--t' : ''}`}
        style={crosshairStyle}
      >
        <span className="crosshair-arm top" />
        <span className="crosshair-arm right" />
        <span className="crosshair-arm bottom" />
        <span className="crosshair-arm left" />
        {settings.crosshair.dot ? <span className="crosshair-dot" /> : null}
      </div>

      {menuOpen ? (
        <div className="menu-overlay">
          <div className="menu-panel">
            <div className="menu-header">
              <div className="menu-brand">
                <span className="menu-kicker">AimForge</span>
                <h1>Полноэкранный тренажер под твою сенсу</h1>
                <p>
                  В основе конвертации лежит профиль CS2, а все остальные игры
                  пересчитываются через реальные коэффициенты поворота.
                </p>
              </div>
              {activePanel !== 'main' ? (
                <button
                  className="back-button"
                  onClick={() => setActivePanel('main')}
                  type="button"
                >
                  Назад
                </button>
              ) : null}
            </div>

            {activePanel === 'main' ? (
              <div className="content-stack">
                <div className="menu-grid">
                  <button className="menu-button primary" onClick={startTraining} type="button">
                    Тренироваться
                  </button>
                  <button
                    className="menu-button secondary"
                    onClick={() => setActivePanel('settings')}
                    type="button"
                  >
                    Ввести текущие настройки
                  </button>
                  <button
                    className="menu-button secondary"
                    onClick={() => setActivePanel('crosshair')}
                    type="button"
                  >
                    Настроить прицел
                  </button>
                  <button
                    className="menu-button secondary"
                    onClick={() => setActivePanel('about')}
                    type="button"
                  >
                    О разработчике
                  </button>
                </div>

                <div className="section-card">
                  <h2>Рекомендация после раунда</h2>
                  <p>{feedback.recommendation}</p>
                  <div className="info-grid">
                    <div className="info-card">
                      <span>Текущая сенса</span>
                      <strong>{settings.sensitivity}</strong>
                      <small>{currentProfile.title}</small>
                    </div>
                    <div className="info-card">
                      <span>CS2 эквивалент</span>
                      <strong>{cs2Equivalent}</strong>
                      <small>База конвертации</small>
                    </div>
                    <div className="info-card">
                      <span>eDPI</span>
                      <strong>{edpi}</strong>
                      <small>DPI x sensitivity</small>
                    </div>
                    <div className="info-card">
                      <span>cm/360</span>
                      <strong>{cm360}</strong>
                      <small>Насколько длинный поворот</small>
                    </div>
                  </div>
                  <div className="equivalents-grid">
                    <div className="equivalent-row">
                      <span>Переводы</span>
                      <strong>{lastBreakdown.overshoot}</strong>
                    </div>
                    <div className="equivalent-row">
                      <span>Долгое наведение</span>
                      <strong>{lastBreakdown.slowLock}</strong>
                    </div>
                    <div className="equivalent-row">
                      <span>Слишком ранний выстрел</span>
                      <strong>{lastBreakdown.earlyFire}</strong>
                    </div>
                    <div className="equivalent-row">
                      <span>Микродокрутка</span>
                      <strong>{lastBreakdown.microAdjust}</strong>
                    </div>
                  </div>
                </div>

                <div className="section-card">
                  <h2>Последние раунды</h2>
                  <div className="history-list">
                    {history.length > 0 ? (
                      history.slice(0, 5).map((session) => (
                        <div className="history-item" key={session.id}>
                          <div>
                            <strong>{formatDate(session.playedAt)}</strong>
                            <span>
                              {getGameProfile(session.selectedGame).title} · {session.mapName}
                            </span>
                          </div>
                          <div>
                            <strong>
                              {session.score}/{settings.goalScore}
                            </strong>
                            <span>
                              {session.accuracy.toFixed(1)}% ·{' '}
                              {formatMs(session.avgReactionMs)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="helper-text">
                        История появится после первого завершенного раунда.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activePanel === 'settings' ? (
              <div className="content-stack">
                <div className="section-card">
                  <h2>Текущие настройки</h2>
                  <div className="field-grid">
                    <label className="field">
                      <span>Текущая игра</span>
                      <select
                        onChange={(event) =>
                          handleGameChange(event.target.value as GameId)
                        }
                        value={settings.selectedGame}
                      >
                        {GAME_PROFILES.map((game) => (
                          <option key={game.id} value={game.id}>
                            {game.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Сенса</span>
                      <input
                        min="0.001"
                        onChange={(event) =>
                          updateSettings({
                            sensitivity: sanitizeNumber(
                              event.target.value,
                              settings.sensitivity,
                            ),
                          })
                        }
                        step="0.001"
                        type="number"
                        value={settings.sensitivity}
                      />
                    </label>
                    <label className="field">
                      <span>DPI</span>
                      <input
                        min="100"
                        onChange={(event) =>
                          updateSettings({
                            dpi: sanitizeNumber(event.target.value, settings.dpi),
                          })
                        }
                        step="50"
                        type="number"
                        value={settings.dpi}
                      />
                    </label>
                    <label className="field">
                      <span>Длительность раунда</span>
                      <input
                        max="120"
                        min="15"
                        onChange={(event) =>
                          updateSettings({
                            roundDurationSec: sanitizeNumber(
                              event.target.value,
                              settings.roundDurationSec,
                            ),
                          })
                        }
                        step="5"
                        type="number"
                        value={settings.roundDurationSec}
                      />
                    </label>
                    <label className="field">
                      <span>Цель по попаданиям</span>
                      <input
                        max="120"
                        min="5"
                        onChange={(event) =>
                          updateSettings({
                            goalScore: sanitizeNumber(
                              event.target.value,
                              settings.goalScore,
                            ),
                          })
                        }
                        step="1"
                        type="number"
                        value={settings.goalScore}
                      />
                    </label>
                    <label className="field">
                      <span>Размер цели</span>
                      <input
                        max="0.75"
                        min="0.2"
                        onChange={(event) =>
                          updateSettings({
                            targetSize: sanitizeNumber(
                              event.target.value,
                              settings.targetSize,
                            ),
                          })
                        }
                        step="0.01"
                        type="number"
                        value={settings.targetSize}
                      />
                    </label>
                  </div>
                </div>

                <div className="section-card">
                  <h2>Конвертировать сенсу из другой игры</h2>
                  <div className="field-grid">
                    <label className="field">
                      <span>Игра-источник</span>
                      <select
                        onChange={(event) =>
                          setConverterSourceGame(event.target.value as GameId)
                        }
                        value={converterSourceGame}
                      >
                        {GAME_PROFILES.map((game) => (
                          <option key={game.id} value={game.id}>
                            {game.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Сенса в другой игре</span>
                      <input
                        min="0.001"
                        onChange={(event) =>
                          setConverterSourceSensitivity(
                            sanitizeNumber(
                              event.target.value,
                              converterSourceSensitivity,
                            ),
                          )
                        }
                        step="0.001"
                        type="number"
                        value={converterSourceSensitivity}
                      />
                    </label>
                    <div className="field result-field">
                      <span>Эквивалент в {currentProfile.title}</span>
                      <strong>{convertedFromSource}</strong>
                      <button
                        className="inline-button"
                        onClick={() => updateSettings({ sensitivity: convertedFromSource })}
                        type="button"
                      >
                        Применить
                      </button>
                    </div>
                  </div>
                  <p className="helper-text">
                    Если выбрать другую игру сверху, текущая сенса автоматически
                    конвертируется, чтобы сохранить тот же поворот.
                  </p>
                </div>

                <div className="section-card">
                  <h2>Эквиваленты для всех игр</h2>
                  <div className="equivalents-grid">
                    {equivalents.map(({ game, sensitivity }) => (
                      <div className="equivalent-row" key={game.id}>
                        <span>{game.title}</span>
                        <strong>{sensitivity}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activePanel === 'crosshair' ? (
              <div className="content-stack">
                <div className="section-card">
                  <h2>Прицел</h2>
                  <div className="field-grid">
                    <label className="field">
                      <span>Цвет</span>
                      <input
                        onChange={(event) => updateCrosshair('color', event.target.value)}
                        type="color"
                        value={settings.crosshair.color}
                      />
                    </label>
                    <label className="field">
                      <span>Размер</span>
                      <input
                        max="32"
                        min="6"
                        onChange={(event) =>
                          updateCrosshair(
                            'size',
                            sanitizeNumber(
                              event.target.value,
                              settings.crosshair.size,
                            ),
                          )
                        }
                        step="1"
                        type="range"
                        value={settings.crosshair.size}
                      />
                    </label>
                    <label className="field">
                      <span>Отступ</span>
                      <input
                        max="18"
                        min="0"
                        onChange={(event) =>
                          updateCrosshair(
                            'gap',
                            sanitizeNumber(
                              event.target.value,
                              settings.crosshair.gap,
                            ),
                          )
                        }
                        step="1"
                        type="range"
                        value={settings.crosshair.gap}
                      />
                    </label>
                    <label className="field">
                      <span>Толщина</span>
                      <input
                        max="6"
                        min="1"
                        onChange={(event) =>
                          updateCrosshair(
                            'thickness',
                            sanitizeNumber(
                              event.target.value,
                              settings.crosshair.thickness,
                            ),
                          )
                        }
                        step="1"
                        type="range"
                        value={settings.crosshair.thickness}
                      />
                    </label>
                    <label className="field">
                      <span>Прозрачность</span>
                      <input
                        max="1"
                        min="0.2"
                        onChange={(event) =>
                          updateCrosshair(
                            'opacity',
                            sanitizeNumber(
                              event.target.value,
                              settings.crosshair.opacity,
                            ),
                          )
                        }
                        step="0.05"
                        type="range"
                        value={settings.crosshair.opacity}
                      />
                    </label>
                  </div>

                  <div className="field-grid toggles">
                    <label className="toggle-field">
                      <input
                        checked={settings.crosshair.dot}
                        onChange={(event) =>
                          updateCrosshair('dot', event.target.checked)
                        }
                        type="checkbox"
                      />
                      <span>Центральная точка</span>
                    </label>
                    <label className="toggle-field">
                      <input
                        checked={settings.crosshair.tStyle}
                        onChange={(event) =>
                          updateCrosshair('tStyle', event.target.checked)
                        }
                        type="checkbox"
                      />
                      <span>T-style</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            {activePanel === 'about' ? (
              <div className="content-stack">
                <div className="section-card">
                  <h2>О разработчике</h2>
                  <p>Игорь, 22 года.</p>
                  <p>
                    GitHub:{' '}
                    <a href="https://github.com/igorflexx" rel="noreferrer" target="_blank">
                      github.com/igorflexx
                    </a>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
