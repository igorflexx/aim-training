import { Grid } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import { getTrainerTurnScalar } from '../data/games'
import { createEmptyBreakdown } from '../lib/coach'
import type {
  LiveStats,
  MissBreakdown,
  MissReason,
  ShotTelemetry,
  TrainerSettings,
} from '../types'

interface AimTrainerSceneProps {
  settings: TrainerSettings
  sessionNonce: number
  paused: boolean
  onLiveStatsChange: (stats: LiveStats, breakdown: MissBreakdown) => void
  onSessionComplete: (
    payload: Omit<LiveStats, 'lastShot'> & {
      avgReactionMs: number
      missBreakdown: MissBreakdown
    },
  ) => void
  onLockChange: (locked: boolean) => void
}

interface ArenaControllerProps extends AimTrainerSceneProps {
  targetPositions: Array<[number, number, number]>
}

function copyBreakdown(breakdown: MissBreakdown): MissBreakdown {
  return {
    overshoot: breakdown.overshoot,
    slowLock: breakdown.slowLock,
    earlyFire: breakdown.earlyFire,
    microAdjust: breakdown.microAdjust,
  }
}

function classifyMiss(
  planarError: number,
  targetRadius: number,
  reactionMs: number,
  speed: number,
): MissReason {
  if (speed > 15 && planarError > targetRadius * 1.1) {
    return 'overshoot'
  }

  if (reactionMs > 640) {
    return 'slow-lock'
  }

  if (reactionMs < 170) {
    return 'early-fire'
  }

  return 'micro-adjust'
}

function ArenaController({
  settings,
  sessionNonce,
  paused,
  onLiveStatsChange,
  onSessionComplete,
  onLockChange,
  targetPositions,
}: ArenaControllerProps) {
  const { camera, gl } = useThree()
  const [activeTargetIndex, setActiveTargetIndex] = useState(4)

  const turnScalar = useMemo(
    () => getTrainerTurnScalar(settings.selectedGame, settings.sensitivity),
    [settings.selectedGame, settings.sensitivity],
  )
  const liveStatsCallbackRef = useRef(onLiveStatsChange)
  const sessionCompleteCallbackRef = useRef(onSessionComplete)
  const lockChangeCallbackRef = useRef(onLockChange)
  const fireShotRef = useRef<() => void>(() => {})

  const roundStartedAtRef = useRef(performance.now())
  const targetSpawnAtRef = useRef(performance.now())
  const pauseStartedAtRef = useRef<number | null>(null)
  const totalPausedMsRef = useRef(0)
  const completedRef = useRef(false)
  const lastHudSyncAtRef = useRef(0)
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const lastMoveSpeedRef = useRef(0)
  const streakRef = useRef(0)
  const reactionsRef = useRef<number[]>([])
  const liveStatsRef = useRef<LiveStats>({
    score: 0,
    shots: 0,
    hits: 0,
    accuracy: 0,
    timeLeftMs: settings.roundDurationSec * 1000,
    bestStreak: 0,
    lastShot: null,
  })
  const missBreakdownRef = useRef<MissBreakdown>(createEmptyBreakdown())

  useEffect(() => {
    liveStatsCallbackRef.current = onLiveStatsChange
    sessionCompleteCallbackRef.current = onSessionComplete
    lockChangeCallbackRef.current = onLockChange
  }, [onLiveStatsChange, onLockChange, onSessionComplete])

  useEffect(() => {
    camera.position.set(0, 1.65, 5.4)
    camera.lookAt(0, 1.65, 0)
  }, [camera])

  useEffect(() => {
    const now = performance.now()
    roundStartedAtRef.current = now
    targetSpawnAtRef.current = now
    completedRef.current = false
    lastHudSyncAtRef.current = 0
    yawRef.current = 0
    pitchRef.current = 0
    lastMoveSpeedRef.current = 0
    streakRef.current = 0
    reactionsRef.current = []
    missBreakdownRef.current = createEmptyBreakdown()
    pauseStartedAtRef.current = null
    totalPausedMsRef.current = 0
    liveStatsRef.current = {
      score: 0,
      shots: 0,
      hits: 0,
      accuracy: 0,
      timeLeftMs: settings.roundDurationSec * 1000,
      bestStreak: 0,
      lastShot: null,
    }
    camera.position.set(0, 1.65, 5.4)
    camera.lookAt(0, 1.65, 0)
    setActiveTargetIndex(Math.floor(Math.random() * targetPositions.length))
    liveStatsCallbackRef.current(
      liveStatsRef.current,
      copyBreakdown(missBreakdownRef.current),
    )
  }, [
    camera,
    sessionNonce,
    settings.roundDurationSec,
    targetPositions.length,
  ])

  useEffect(() => {
    if (paused && document.pointerLockElement === gl.domElement) {
      document.exitPointerLock()
    }

    if (paused && pauseStartedAtRef.current === null) {
      pauseStartedAtRef.current = performance.now()
    }

    if (!paused && pauseStartedAtRef.current !== null) {
      const pausedDuration = performance.now() - pauseStartedAtRef.current
      totalPausedMsRef.current += pausedDuration
      targetSpawnAtRef.current += pausedDuration
      pauseStartedAtRef.current = null
    }
  }, [gl.domElement, paused])

  useEffect(() => {
    function syncLockState() {
      lockChangeCallbackRef.current(
        document.pointerLockElement === gl.domElement,
      )
    }

    function handleMouseMove(event: MouseEvent) {
      if (paused || document.pointerLockElement !== gl.domElement) {
        return
      }

      lastMoveSpeedRef.current = Math.hypot(event.movementX, event.movementY)
      yawRef.current -= event.movementX * turnScalar
      pitchRef.current = Math.max(
        -1.2,
        Math.min(1.2, pitchRef.current - event.movementY * turnScalar),
      )
    }

    function handleMouseDown(event: MouseEvent) {
      if (paused || completedRef.current) {
        return
      }

      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock()
        return
      }

      if (event.button === 0) {
        fireShotRef.current()
      }
    }

    document.addEventListener('pointerlockchange', syncLockState)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    syncLockState()

    return () => {
      document.removeEventListener('pointerlockchange', syncLockState)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [gl.domElement, paused, turnScalar])

  function updateLiveStats(lastShot: ShotTelemetry | null, timeLeftMs: number) {
    const score = liveStatsRef.current.score
    const shots = liveStatsRef.current.shots
    const hits = liveStatsRef.current.hits
    const accuracy = shots ? (hits / shots) * 100 : 0

    liveStatsRef.current = {
      score,
      shots,
      hits,
      accuracy,
      timeLeftMs,
      bestStreak: liveStatsRef.current.bestStreak,
      lastShot,
    }

    liveStatsCallbackRef.current(
      liveStatsRef.current,
      copyBreakdown(missBreakdownRef.current),
    )
  }

  function finishRound() {
    if (completedRef.current) {
      return
    }

    completedRef.current = true

    if (document.pointerLockElement === gl.domElement) {
      document.exitPointerLock()
    }

    const reactionSamples = reactionsRef.current
    const avgReactionMs =
      reactionSamples.length > 0
        ? reactionSamples.reduce((sum, value) => sum + value, 0) /
          reactionSamples.length
        : 0

    sessionCompleteCallbackRef.current({
      score: liveStatsRef.current.score,
      shots: liveStatsRef.current.shots,
      hits: liveStatsRef.current.hits,
      accuracy: liveStatsRef.current.accuracy,
      timeLeftMs: 0,
      bestStreak: liveStatsRef.current.bestStreak,
      avgReactionMs,
      missBreakdown: copyBreakdown(missBreakdownRef.current),
    })
  }

  function fireShot() {
    const activePosition = targetPositions[activeTargetIndex]

    if (!activePosition) {
      return
    }

    const targetRadius = settings.targetSize
    const targetWorld = new THREE.Vector3(...activePosition)
    const localTarget = camera.worldToLocal(targetWorld.clone())
    const planarError = Math.hypot(localTarget.x, localTarget.y)
    const reactionMs = Math.max(90, performance.now() - targetSpawnAtRef.current)
    const didHit = planarError <= targetRadius
    const missReason = didHit
      ? null
      : classifyMiss(
          planarError,
          targetRadius,
          reactionMs,
          lastMoveSpeedRef.current,
        )

    if (!didHit && missReason) {
      if (missReason === 'overshoot') {
        missBreakdownRef.current.overshoot += 1
      } else if (missReason === 'slow-lock') {
        missBreakdownRef.current.slowLock += 1
      } else if (missReason === 'early-fire') {
        missBreakdownRef.current.earlyFire += 1
      } else {
        missBreakdownRef.current.microAdjust += 1
      }
    }

    const shot: ShotTelemetry = {
      didHit,
      reactionMs,
      missReason,
      errorX: Number(localTarget.x.toFixed(3)),
      errorY: Number(localTarget.y.toFixed(3)),
      distance: Number(planarError.toFixed(3)),
      speed: Number(lastMoveSpeedRef.current.toFixed(2)),
      targetId: `${sessionNonce}-${activeTargetIndex}`,
    }

    liveStatsRef.current.shots += 1
    reactionsRef.current.push(reactionMs)

    if (didHit) {
      liveStatsRef.current.hits += 1
      liveStatsRef.current.score += 1
      streakRef.current += 1
      liveStatsRef.current.bestStreak = Math.max(
        liveStatsRef.current.bestStreak,
        streakRef.current,
      )
    } else {
      streakRef.current = 0
    }

    const elapsedMs =
      performance.now() - roundStartedAtRef.current - totalPausedMsRef.current
    const timeLeftMs = Math.max(
      0,
      settings.roundDurationSec * 1000 - elapsedMs,
    )

    updateLiveStats(shot, timeLeftMs)

    if (didHit && liveStatsRef.current.score >= settings.goalScore) {
      finishRound()
      return
    }

    if (didHit) {
      let nextIndex = activeTargetIndex
      while (nextIndex === activeTargetIndex) {
        nextIndex = Math.floor(Math.random() * targetPositions.length)
      }
      setActiveTargetIndex(nextIndex)
      targetSpawnAtRef.current = performance.now()
    }
  }

  fireShotRef.current = fireShot

  useFrame(() => {
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yawRef.current
    camera.rotation.x = pitchRef.current

    const activePausedMs =
      pauseStartedAtRef.current === null
        ? 0
        : performance.now() - pauseStartedAtRef.current
    const elapsedMs =
      performance.now() -
      roundStartedAtRef.current -
      totalPausedMsRef.current -
      activePausedMs
    const timeLeftMs = Math.max(0, settings.roundDurationSec * 1000 - elapsedMs)

    if (!completedRef.current && !paused && timeLeftMs <= 0) {
      updateLiveStats(liveStatsRef.current.lastShot, 0)
      finishRound()
      return
    }

    if (performance.now() - lastHudSyncAtRef.current > 120) {
      lastHudSyncAtRef.current = performance.now()
      updateLiveStats(liveStatsRef.current.lastShot, timeLeftMs)
    }
  })

  return (
    <>
      <color attach="background" args={['#04070f']} />
      <fog attach="fog" args={['#04070f', 8, 18]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        color="#89c2ff"
        intensity={2.2}
        position={[4, 8, 5]}
        castShadow
      />
      <spotLight
        color="#ff7d57"
        intensity={16}
        angle={0.35}
        distance={20}
        penumbra={0.8}
        position={[0, 6, 7]}
      />

      <group position={[0, -0.85, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[24, 24]} />
          <meshStandardMaterial color="#071119" metalness={0.2} roughness={0.92} />
        </mesh>
        <Grid
          args={[24, 24]}
          cellColor="#1b3f54"
          sectionColor="#264b62"
          fadeDistance={18}
          fadeStrength={1}
          infiniteGrid
          position={[0, 0.01, 0]}
        />
      </group>

      <mesh position={[0, 2.1, -0.1]}>
        <torusGeometry args={[4.5, 0.04, 16, 128]} />
        <meshStandardMaterial
          color="#103445"
          emissive="#11384b"
          emissiveIntensity={1.2}
        />
      </mesh>

      {targetPositions.map((position, index) => {
        const isActive = index === activeTargetIndex

        return (
          <group key={`${position.join('-')}-${index}`} position={position}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[settings.targetSize, 36, 36]} />
              <meshStandardMaterial
                color={isActive ? '#ffffff' : '#e7eef4'}
                emissive={isActive ? '#ffffff' : '#5c6770'}
                emissiveIntensity={isActive ? 1.65 : 0.16}
                roughness={0.22}
                metalness={0.04}
              />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

export function AimTrainerScene(props: AimTrainerSceneProps) {
  const targetPositions = useMemo<Array<[number, number, number]>>(
    () => [
      [-1.8, 2.7, 0],
      [0, 2.7, 0],
      [1.8, 2.7, 0],
      [-1.8, 1.5, 0],
      [0, 1.5, 0],
      [1.8, 1.5, 0],
      [-1.8, 0.3, 0],
      [0, 0.3, 0],
      [1.8, 0.3, 0],
    ],
    [],
  )

  return (
    <Canvas
      camera={{ fov: 72, near: 0.1, far: 60, position: [0, 1.65, 5.4] }}
      dpr={[1, 1.7]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      shadows
    >
      <Suspense fallback={null}>
        <ArenaController {...props} targetPositions={targetPositions} />
      </Suspense>
    </Canvas>
  )
}
