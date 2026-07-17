import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'

// Premium futuristic color palette for NOVA-X Fusion Core
const IDLE_COLOR = new THREE.Color('#00f3ff') // Electric Cyan
const ACTIVE_COLOR = new THREE.Color('#ff0077') // Vibrant Magenta
const CORE_COLOR = new THREE.Color('#39ff14') // Bio-glowing Emerald
const RING_COLOR = new THREE.Color('#00f3ff')
const RING_GLOW = new THREE.Color('#ff00bb')

const _blendColor = new THREE.Color()
const _coreColor = new THREE.Color()
const _ringColor = new THREE.Color()
const _scaleVec = new THREE.Vector3()

// Model 1: Central Quantum Crystal Core (Default)
function CoreCrystal({ isConnected, isSpeaking }: { isConnected: boolean; isSpeaking: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const wireRef = useRef<THREE.Mesh>(null)
  const volRef = useRef(0)

  useFrame((state, delta) => {
    if (!meshRef.current || !wireRef.current) return

    const t = state.clock.getElapsedTime()
    
    let targetVol = 0
    if (isSpeaking) {
      targetVol = Math.abs(Math.sin(t * 11) * 0.5 + Math.sin(t * 4.7) * 0.5)
    } else if (isConnected) {
      targetVol = Math.abs(Math.sin(t * 2)) * 0.12
    }
    volRef.current += (targetVol - volRef.current) * 0.15
    const vol = volRef.current

    const speed = isSpeaking ? 1.4 : isConnected ? 0.45 : 0.1
    meshRef.current.rotation.y += delta * speed
    meshRef.current.rotation.x += delta * speed * 0.6
    
    wireRef.current.rotation.y -= delta * speed * 1.2
    wireRef.current.rotation.z += delta * speed * 0.8

    const baseScale = isConnected ? 0.75 : 0.5
    const s = baseScale + vol * 0.95
    _scaleVec.set(s, s, s)
    meshRef.current.scale.copy(_scaleVec)
    wireRef.current.scale.copy(_scaleVec).multiplyScalar(1.22)

    _coreColor.lerpColors(IDLE_COLOR, ACTIVE_COLOR, Math.min(vol * 2.2, 1))
    
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    const wireMat = wireRef.current.material as THREE.MeshBasicMaterial
    
    mat.color.copy(_coreColor)
    wireMat.color.lerpColors(CORE_COLOR, ACTIVE_COLOR, Math.min(vol * 1.5, 1))
    
    mat.opacity = isConnected ? 0.18 + vol * 0.4 : 0.08
    wireMat.opacity = isConnected ? 0.65 + vol * 0.35 : 0.25
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshBasicMaterial
          color={IDLE_COLOR}
          transparent
          opacity={0.15}
          wireframe={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={wireRef}>
        <icosahedronGeometry args={[0.56, 1]} />
        <meshBasicMaterial
          color={CORE_COLOR}
          transparent
          opacity={0.5}
          wireframe
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function ParticleShell({ isConnected, isSpeaking }: { isConnected: boolean; isSpeaking: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const volRef = useRef(0)
  const COUNT = 1200

  const { positions, original, seeds } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const orig = new Float32Array(COUNT * 3)
    const s = new Float32Array(COUNT * 2)

    for (let i = 0; i < COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / COUNT)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      const r = 1.45

      const px = r * Math.sin(phi) * Math.cos(theta)
      const py = r * Math.sin(phi) * Math.sin(theta)
      const pz = r * Math.cos(phi)

      pos[i * 3] = px
      pos[i * 3 + 1] = py
      pos[i * 3 + 2] = pz
      orig[i * 3] = px
      orig[i * 3 + 1] = py
      orig[i * 3 + 2] = pz

      s[i * 2] = Math.random() * Math.PI * 2
      s[i * 2 + 1] = 0.4 + Math.random() * 0.9
    }
    return { positions: pos, original: orig, seeds: s }
  }, [])

  useFrame((state, delta) => {
    if (!ref.current) return
    const pts = ref.current
    const geo = pts.geometry
    const mat = pts.material as THREE.PointsMaterial

    pts.rotation.y += delta * 0.09
    pts.rotation.z += delta * 0.04

    const t = state.clock.getElapsedTime()

    let targetVol = 0
    if (isSpeaking) {
      const pulse = Math.abs(Math.sin(t * 10) * 0.6 + Math.sin(t * 4.5) * 0.4)
      targetVol = pulse * 0.65 + Math.random() * 0.1
    } else if (isConnected) {
      targetVol = Math.abs(Math.sin(t * 1.5)) * 0.04
    }
    const lerpSpeed = isSpeaking ? 0.15 : 0.08
    volRef.current += (targetVol - volRef.current) * lerpSpeed
    const vol = volRef.current

    _blendColor.lerpColors(IDLE_COLOR, ACTIVE_COLOR, Math.min(vol * 2, 1))
    mat.color.copy(_blendColor)
    const targetOp = isConnected ? 0.7 + vol * 0.3 : 0.22
    mat.opacity += (targetOp - mat.opacity) * 0.08

    if (vol > 0.002) {
      const posArr = geo.attributes.position.array as Float32Array
      for (let i = 0; i < COUNT; i++) {
        const ix = i * 3
        const phase = seeds[i * 2]
        const weight = seeds[i * 2 + 1]

        const wave = Math.sin(t * 8.5 + phase) * vol * weight * 0.26

        const ox = original[ix]
        const oy = original[ix + 1]
        const oz = original[ix + 2]
        const invR = 0.6897

        posArr[ix] = ox + ox * invR * wave
        posArr[ix + 1] = oy + oy * invR * wave
        posArr[ix + 2] = oz + oz * invR * wave
      }
      geo.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          // @ts-ignore
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
      <pointsMaterial
        // @ts-ignore
        size={0.02}
        transparent
        opacity={0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors={false}
        color={IDLE_COLOR}
      />
    </points>
  )
}

function OrbitalRing({
  radius,
  tube,
  tilt,
  rotSpeed,
  isConnected,
  isSpeaking,
  phase = 0
}: {
  radius: number
  tube: number
  tilt: number
  rotSpeed: number
  isConnected: boolean
  isSpeaking: boolean
  phase?: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const volRef = useRef(0)

  useFrame((state, delta) => {
    if (!ref.current || !matRef.current) return

    ref.current.rotation.y += delta * rotSpeed

    const t = state.clock.getElapsedTime() + phase
    let targetVol = 0
    if (isSpeaking) {
      targetVol = Math.abs(Math.sin(t * 9)) * 0.6 + 0.15
    } else if (isConnected) {
      targetVol = Math.abs(Math.sin(t * 1.3)) * 0.12
    }
    volRef.current += (targetVol - volRef.current) * 0.085
    const vol = volRef.current

    _ringColor.lerpColors(RING_COLOR, RING_GLOW, vol)
    matRef.current.color.copy(_ringColor)

    const targetOp = isConnected ? 0.16 + vol * 0.65 : 0.04
    matRef.current.opacity += (targetOp - matRef.current.opacity) * 0.1
  })

  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, tube, 3, 64]} />
      <meshBasicMaterial
        ref={matRef}
        // @ts-ignore
        color={RING_COLOR}
        transparent
        opacity={0.06}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

// Model 2: Hypercube Grid Core
function HypercubeCore({ isConnected, isSpeaking }: { isConnected: boolean; isSpeaking: boolean }) {
  const cubeRef = useRef<THREE.Mesh>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const volRef = useRef(0)

  useFrame((state, delta) => {
    if (!cubeRef.current || !innerRef.current) return
    const t = state.clock.getElapsedTime()
    
    let targetVol = isSpeaking ? Math.abs(Math.sin(t * 11) * 0.42) : isConnected ? Math.abs(Math.sin(t * 2)) * 0.08 : 0
    volRef.current += (targetVol - volRef.current) * 0.15
    const vol = volRef.current

    const speed = isSpeaking ? 1.5 : isConnected ? 0.55 : 0.15
    cubeRef.current.rotation.x += delta * speed
    cubeRef.current.rotation.y += delta * speed * 0.7
    cubeRef.current.rotation.z += delta * speed * 0.4

    innerRef.current.rotation.y -= delta * speed * 1.5

    const scale = 0.85 + vol * 0.9
    cubeRef.current.scale.set(scale, scale, scale)
    innerRef.current.scale.set(scale * 0.45, scale * 0.45, scale * 0.45)

    const mat = cubeRef.current.material as THREE.MeshBasicMaterial
    const innerMat = innerRef.current.material as THREE.MeshBasicMaterial
    mat.color.copy(IDLE_COLOR).lerp(ACTIVE_COLOR, Math.min(vol * 2.5, 1))
    innerMat.color.copy(CORE_COLOR).lerp(ACTIVE_COLOR, Math.min(vol * 2.5, 1))
  })

  return (
    <group>
      <mesh ref={cubeRef}>
        <boxGeometry args={[1.1, 1.1, 1.1]} />
        <meshBasicMaterial color={IDLE_COLOR} wireframe transparent opacity={0.65} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={innerRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshBasicMaterial color={CORE_COLOR} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

// Model 3: Cyber Ring Matrix
function CyberRingCore({ isConnected, isSpeaking }: { isConnected: boolean; isSpeaking: boolean }) {
  const r1Ref = useRef<THREE.Mesh>(null)
  const r2Ref = useRef<THREE.Mesh>(null)
  const r3Ref = useRef<THREE.Mesh>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const volRef = useRef(0)

  useFrame((state, delta) => {
    if (!r1Ref.current || !r2Ref.current || !r3Ref.current || !coreRef.current) return
    const t = state.clock.getElapsedTime()
    
    let targetVol = isSpeaking ? Math.abs(Math.sin(t * 11) * 0.45) : isConnected ? Math.abs(Math.sin(t * 2)) * 0.08 : 0
    volRef.current += (targetVol - volRef.current) * 0.15
    const vol = volRef.current

    const speed = isSpeaking ? 2.0 : isConnected ? 0.6 : 0.2
    r1Ref.current.rotation.x += delta * speed
    r1Ref.current.rotation.y += delta * speed * 0.5

    r2Ref.current.rotation.y -= delta * speed * 0.8
    r2Ref.current.rotation.z += delta * speed * 0.4

    r3Ref.current.rotation.x -= delta * speed * 0.3
    r3Ref.current.rotation.z += delta * speed * 0.9

    const s = 0.82 + vol * 0.9
    coreRef.current.scale.set(s * 0.4, s * 0.4, s * 0.4)

    const m1 = r1Ref.current.material as THREE.MeshBasicMaterial
    const m2 = r2Ref.current.material as THREE.MeshBasicMaterial
    const m3 = r3Ref.current.material as THREE.MeshBasicMaterial
    const mc = coreRef.current.material as THREE.MeshBasicMaterial

    const activeBlend = Math.min(vol * 2.2, 1)
    m1.color.copy(IDLE_COLOR).lerp(ACTIVE_COLOR, activeBlend)
    m2.color.copy(CORE_COLOR).lerp(ACTIVE_COLOR, activeBlend)
    m3.color.copy(RING_GLOW).lerp(ACTIVE_COLOR, activeBlend)
    mc.color.copy(IDLE_COLOR).lerp(CORE_COLOR, activeBlend)
  })

  return (
    <group>
      <mesh ref={r1Ref}>
        <torusGeometry args={[1.15, 0.015, 8, 48]} />
        <meshBasicMaterial color={IDLE_COLOR} transparent opacity={0.7} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={r2Ref}>
        <torusGeometry args={[0.85, 0.012, 8, 48]} />
        <meshBasicMaterial color={CORE_COLOR} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={r3Ref}>
        <torusGeometry args={[0.55, 0.008, 8, 48]} />
        <meshBasicMaterial color={RING_GLOW} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color={IDLE_COLOR} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

// Model 4: Nebula Swarm Nodes
function NebulaSwarmCore({ isConnected, isSpeaking }: { isConnected: boolean; isSpeaking: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const volRef = useRef(0)
  const COUNT = 1500

  const { positions, original, seeds } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const orig = new Float32Array(COUNT * 3)
    const s = new Float32Array(COUNT * 2)

    for (let i = 0; i < COUNT; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = 0.5 + Math.random() * 0.95

      const px = r * Math.sin(phi) * Math.cos(theta)
      const py = r * Math.sin(phi) * Math.sin(theta)
      const pz = r * Math.cos(phi)

      pos[i * 3] = px
      pos[i * 3 + 1] = py
      pos[i * 3 + 2] = pz
      orig[i * 3] = px
      orig[i * 3 + 1] = py
      orig[i * 3 + 2] = pz

      s[i * 2] = Math.random() * Math.PI * 2
      s[i * 2 + 1] = 0.5 + Math.random() * 1.5
    }
    return { positions: pos, original: orig, seeds: s }
  }, [])

  useFrame((state, delta) => {
    if (!ref.current) return
    const pts = ref.current
    const geo = pts.geometry
    const mat = pts.material as THREE.PointsMaterial
    const t = state.clock.getElapsedTime()

    pts.rotation.y += delta * 0.15
    pts.rotation.x += delta * 0.05

    let targetVol = isSpeaking ? Math.abs(Math.sin(t * 11) * 0.45) : isConnected ? Math.abs(Math.sin(t * 1.5)) * 0.05 : 0
    volRef.current += (targetVol - volRef.current) * 0.1
    const vol = volRef.current

    mat.color.copy(IDLE_COLOR).lerp(ACTIVE_COLOR, Math.min(vol * 2.5, 1))
    mat.opacity = isConnected ? 0.75 + vol * 0.25 : 0.3

    const posArr = geo.attributes.position.array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3
      const phase = seeds[i * 2]
      const weight = seeds[i * 2 + 1]

      const wave = Math.sin(t * 5.0 + phase) * (0.05 + vol * weight * 0.4)

      posArr[ix] = original[ix] + original[ix] * wave
      posArr[ix + 1] = original[ix + 1] + original[ix + 1] * wave
      posArr[ix + 2] = original[ix + 2] + original[ix + 2] * wave
    }
    geo.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          // @ts-ignore
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
      <pointsMaterial
        // @ts-ignore
        size={0.016}
        transparent
        opacity={0.65}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        color={IDLE_COLOR}
      />
    </points>
  )
}

// Model 5: EVA Holographic Core (Vertical energy strands with pink/blue particles)
function EvaHologramCore({ isConnected, isSpeaking }: { isConnected: boolean; isSpeaking: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const volRef = useRef(0)
  const COUNT = 900

  const { positions, original, colors } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const orig = new Float32Array(COUNT * 3)
    const cols = new Float32Array(COUNT * 3)

    const color1 = new THREE.Color('#ff00aa') // Hot Pink / Violet
    const color2 = new THREE.Color('#00ccff') // Neon Blue

    for (let i = 0; i < COUNT; i++) {
      const ratio = i / COUNT
      const t = ratio * Math.PI * 8 // 4 full turns
      const helixId = i % 2 === 0 ? 1 : -1
      const r = 0.52 + Math.sin(t * 0.4) * 0.15

      const px = r * Math.cos(t) * helixId
      const pz = r * Math.sin(t) * helixId
      const py = ratio * 1.8 - 0.9 // centered vertically from -0.9 to 0.9

      pos[i * 3] = px
      pos[i * 3 + 1] = py
      pos[i * 3 + 2] = pz

      orig[i * 3] = px
      orig[i * 3 + 1] = py
      orig[i * 3 + 2] = pz

      const blendColor = new THREE.Color()
      blendColor.lerpColors(color1, color2, ratio)
      cols[i * 3] = blendColor.r
      cols[i * 3 + 1] = blendColor.g
      cols[i * 3 + 2] = blendColor.b
    }
    return { positions: pos, original: orig, colors: cols }
  }, [])

  useFrame((state, delta) => {
    if (!ref.current) return
    const pts = ref.current
    const geo = pts.geometry
    const t = state.clock.getElapsedTime()

    pts.rotation.y += delta * 1.4 // fast, elegant rotate

    let targetVol = isSpeaking ? Math.abs(Math.sin(t * 11) * 0.45) : isConnected ? Math.abs(Math.sin(t * 2)) * 0.08 : 0
    volRef.current += (targetVol - volRef.current) * 0.15
    const vol = volRef.current

    const posArr = geo.attributes.position.array as Float32Array
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3
      const ratio = i / COUNT
      const phase = ratio * Math.PI * 4
      const r = (0.52 + Math.sin(t * 2.5 + phase) * (0.05 + vol * 0.42))
      const helixId = i % 2 === 0 ? 1 : -1
      const angle = ratio * Math.PI * 8 + t * 0.75

      posArr[ix] = r * Math.cos(angle) * helixId
      posArr[ix + 2] = r * Math.sin(angle) * helixId
    }
    geo.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        transparent
        opacity={0.85}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors
      />
    </points>
  )
}

// Model 6: Jarvis Tactical Core (Amber/Orange military radar HUD theme)
function JarvisTacticalCore({ isConnected, isSpeaking }: { isConnected: boolean; isSpeaking: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null)
  const ringInnerRef = useRef<THREE.Mesh>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const volRef = useRef(0)

  const AMBER = new THREE.Color('#ffaa00')
  const ACTIVE_RED = new THREE.Color('#ff3300')

  const { positions } = useMemo(() => {
    const COUNT = 400
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2
      const r = 0.95 + (Math.random() - 0.5) * 0.08
      pos[i * 3] = r * Math.cos(angle)
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.04
      pos[i * 3 + 2] = r * Math.sin(angle)
    }
    return { positions: pos }
  }, [])

  useFrame((state, delta) => {
    if (!ringRef.current || !ringInnerRef.current || !pointsRef.current) return
    const t = state.clock.getElapsedTime()

    let targetVol = isSpeaking ? Math.abs(Math.sin(t * 11) * 0.45) : isConnected ? Math.abs(Math.sin(t * 2)) * 0.08 : 0
    volRef.current += (targetVol - volRef.current) * 0.15
    const vol = volRef.current

    const speed = isSpeaking ? 1.6 : isConnected ? 0.5 : 0.12
    ringRef.current.rotation.y += delta * speed
    ringRef.current.rotation.x = Math.PI * 0.25 + Math.sin(t * 0.4) * 0.1

    ringInnerRef.current.rotation.y -= delta * speed * 1.4
    ringInnerRef.current.rotation.z = Math.sin(t * 0.7) * 0.12

    pointsRef.current.rotation.y += delta * speed * 0.45

    const s = 0.82 + vol * 0.8
    ringRef.current.scale.set(s, s, s)
    ringInnerRef.current.scale.set(s * 0.7, s * 0.7, s * 0.7)
    pointsRef.current.scale.set(s * 1.15, s * 1.15, s * 1.15)

    const mat = ringRef.current.material as THREE.MeshBasicMaterial
    const innerMat = ringInnerRef.current.material as THREE.MeshBasicMaterial
    const ptsMat = pointsRef.current.material as THREE.PointsMaterial

    const color = new THREE.Color()
    color.lerpColors(AMBER, ACTIVE_RED, Math.min(vol * 2.5, 1))

    mat.color.copy(color)
    innerMat.color.copy(color)
    ptsMat.color.copy(color)

    mat.opacity = isConnected ? 0.6 + vol * 0.4 : 0.18
    innerMat.opacity = isConnected ? 0.75 + vol * 0.25 : 0.22
    ptsMat.opacity = isConnected ? 0.65 + vol * 0.35 : 0.12
  })

  return (
    <group>
      <mesh ref={ringRef}>
        <torusGeometry args={[0.95, 0.015, 8, 32]} />
        <meshBasicMaterial color={AMBER} transparent opacity={0.6} wireframe />
      </mesh>
      <mesh ref={ringInnerRef}>
        <torusGeometry args={[0.62, 0.01, 6, 24]} />
        <meshBasicMaterial color={AMBER} transparent opacity={0.75} wireframe />
      </mesh>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.024} transparent opacity={0.65} color={AMBER} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  )
}

function AIOrb({
  isConnected,
  isSpeaking,
  coreType = 'quantum'
}: {
  isConnected: boolean
  isSpeaking: boolean
  coreType?: 'quantum' | 'cube' | 'matrix' | 'nebula' | 'eva' | 'jarvis'
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const targetScale = !isConnected ? 0.48 : isSpeaking ? 0.74 : 0.62
    _scaleVec.set(targetScale, targetScale, targetScale)
    groupRef.current.scale.lerp(_scaleVec, delta * 3.5)
    groupRef.current.rotation.y += delta * 0.05
  })

  return (
    <group ref={groupRef}>
      {coreType === 'quantum' && (
        <>
          <CoreCrystal isConnected={isConnected} isSpeaking={isSpeaking} />
          <ParticleShell isConnected={isConnected} isSpeaking={isSpeaking} />
          <OrbitalRing radius={1.6} tube={0.007} tilt={Math.PI * 0.15} rotSpeed={0.22} isConnected={isConnected} isSpeaking={isSpeaking} phase={0} />
          <OrbitalRing radius={1.85} tube={0.004} tilt={Math.PI * 0.45} rotSpeed={-0.14} isConnected={isConnected} isSpeaking={isSpeaking} phase={2} />
        </>
      )}
      {coreType === 'cube' && <HypercubeCore isConnected={isConnected} isSpeaking={isSpeaking} />}
      {coreType === 'matrix' && <CyberRingCore isConnected={isConnected} isSpeaking={isSpeaking} />}
      {coreType === 'nebula' && <NebulaSwarmCore isConnected={isConnected} isSpeaking={isSpeaking} />}
      {coreType === 'eva' && <EvaHologramCore isConnected={isConnected} isSpeaking={isSpeaking} />}
      {coreType === 'jarvis' && <JarvisTacticalCore isConnected={isConnected} isSpeaking={isSpeaking} />}
    </group>
  )
}

const CORE_THEMES = {
  quantum: {
    core: 'bg-[#00f3ff]',
    ring: 'border-[#ff0077]/30',
    glow: 'shadow-[0_0_40px_rgba(0,243,255,0.65)]'
  },
  cube: {
    core: 'bg-[#00f3ff]',
    ring: 'border-[#00f3ff]/20',
    glow: 'shadow-[0_0_35px_rgba(0,243,255,0.45)]'
  },
  matrix: {
    core: 'bg-[#39ff14]',
    ring: 'border-[#39ff14]/30',
    glow: 'shadow-[0_0_40px_rgba(57,255,20,0.65)]'
  },
  nebula: {
    core: 'bg-[#ff00bb]',
    ring: 'border-[#00f3ff]/20',
    glow: 'shadow-[0_0_45px_rgba(255,0,187,0.6)]'
  },
  eva: {
    core: 'bg-[#ff0055]',
    ring: 'border-[#ff0055]/30',
    glow: 'shadow-[0_0_40px_rgba(255,0,85,0.65)]'
  },
  jarvis: {
    core: 'bg-[#ffaa00]',
    ring: 'border-[#ff3300]/30',
    glow: 'shadow-[0_0_40px_rgba(255,170,0,0.65)]'
  }
}

export function AICore2D({
  isConnected = false,
  isSpeaking = false,
  coreType = 'quantum',
  coreSize = 0.65
}: {
  isConnected?: boolean
  isSpeaking?: boolean
  coreType?: 'quantum' | 'cube' | 'matrix' | 'nebula' | 'eva' | 'jarvis'
  coreSize?: number
}) {
  const theme = CORE_THEMES[coreType] || CORE_THEMES.quantum

  // Determine dynamic size and opacity based on speaking/connected state
  const baseScale = isConnected ? 1.0 : 0.72
  const speakScale = isSpeaking ? 1.25 : 1.0
  const finalScale = coreSize * baseScale * speakScale

  const pulseSpeed = isSpeaking ? 'duration-150' : 'duration-1000'

  return (
    <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
      <div
        className="relative flex items-center justify-center pointer-events-none select-none transition-transform duration-500"
        style={{
          width: '280px',
          height: '280px',
          transform: `scale(${finalScale})`
        }}
      >
        {/* Outer Rotating Compass/HUD ring */}
        <div className="absolute inset-0 rounded-full border border-dashed border-[#00f3ff]/10 animate-[spin_40s_linear_infinite]" />
        
        {/* Middle Rotating HUD ring with custom theme boundary */}
        <div className={`absolute inset-4 rounded-full border border-double ${theme.ring} animate-[spin_15s_linear_infinite_reverse]`} />
        
        {/* Inner Technical HUD tickmarks (glowing ticks) */}
        <svg className="absolute inset-8 w-[calc(100%-64px)] h-[calc(100%-64px)] animate-[spin_60s_linear_infinite] opacity-30" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 4" className="text-[#00f3ff]" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 8" className="text-white" />
        </svg>

        {/* Main Core Glimmer - ambient aura */}
        <div
          className={`absolute inset-16 rounded-full opacity-25 blur-xl transition-all ${pulseSpeed} ${theme.core} ${
            isSpeaking ? 'scale-130 opacity-45' : isConnected ? 'scale-110 opacity-30' : 'scale-90 opacity-15'
          }`}
        />

        {/* Primary Glowing Core Solid Sphere */}
        <div
          className={`absolute w-14 h-14 rounded-full transition-all ${pulseSpeed} ${theme.core} ${theme.glow} flex items-center justify-center ${
            isSpeaking ? 'scale-125 animate-pulse' : isConnected ? 'scale-100' : 'scale-75 opacity-70'
          }`}
        >
          {/* Core Center Dot */}
          <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_#fff]" />
        </div>

        {/* Orbiting Tech Nodes */}
        <div className="absolute inset-0 animate-[spin_8s_linear_infinite]">
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${theme.core} shadow-[0_0_8px_currentColor]`} />
        </div>
        <div className="absolute inset-6 animate-[spin_12s_linear_infinite_reverse]">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#00f3ff] shadow-[0_0_6px_#00f3ff]" />
        </div>
      </div>
    </div>
  )
}

export default function AICore({
  isConnected = false,
  isSpeaking = false,
  coreType = 'quantum',
  coreSize = 0.65
}: {
  isConnected?: boolean
  isSpeaking?: boolean
  coreType?: 'quantum' | 'cube' | 'matrix' | 'nebula' | 'eva' | 'jarvis'
  coreSize?: number
}) {
  const [perfMode, setPerfMode] = useState<'high' | 'medium' | 'low'>(() => {
    const saved = localStorage.getItem('novax_perf_mode') as 'high' | 'medium' | 'low'
    if (saved) return saved
    
    // Auto-detect WebGL context support
    try {
      const canvas = document.createElement('canvas')
      const support = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
      if (!support) return 'low'
      
      return localStorage.getItem('novax_low_end_mode') === 'true' ? 'low' : 'high'
    } catch (e) {
      return 'low'
    }
  })

  useEffect(() => {
    const handlePerfChange = (e: any) => {
      setPerfMode(e.detail || 'high')
    }
    window.addEventListener('novax_perf_mode_changed', handlePerfChange)
    return () => {
      window.removeEventListener('novax_perf_mode_changed', handlePerfChange)
    }
  }, [])

  if (perfMode === 'low') {
    return (
      <AICore2D
        isConnected={isConnected}
        isSpeaking={isSpeaking}
        coreType={coreType}
        coreSize={coreSize}
      />
    )
  }

  // Medium vs High WebGL configurations
  const isHighEnd = perfMode === 'high'

  return (
    <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 5.8], fov: 38 }}
        gl={{
          antialias: isHighEnd,
          powerPreference: isHighEnd ? 'high-performance' : 'low-power',
          alpha: true,
          depth: isHighEnd,
          stencil: false,
          precision: isHighEnd ? 'highp' : 'lowp'
        }}
        dpr={isHighEnd ? Math.min(window.devicePixelRatio, 2) : 1.0} // Dynamic DPR capping
        frameloop="always"
      >
        <group scale={[coreSize, coreSize, coreSize]}>
          <AIOrb isConnected={isConnected} isSpeaking={isSpeaking} coreType={coreType} />
        </group>
      </Canvas>
    </div>
  )
}
