import { useState, useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm'
import { Play, Sparkles, Smile, Flame, ShieldAlert, Cpu, Heart, RefreshCw } from 'lucide-react'

interface VRMAvatarProps {
  isSpeaking: boolean
  isConnected: boolean
  isProcessing: boolean
  activeAvatar?: string // 'neo' | 'ares' | 'iris' | 'luna'
}

export default function VRMAvatar({
  isSpeaking,
  isConnected,
  isProcessing,
  activeAvatar = 'neo'
}: VRMAvatarProps) {
  const [vrm, setVrm] = useState<VRM | null>(null)
  const [vrmUrl, setVrmUrl] = useState<string>('')
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Character config mapping
  const charConfig = useMemo(() => {
    const configs: Record<string, { color: string; glow: string; name: string; emotion: string }> = {
      neo: { color: '#00f3ff', glow: '#0044ff', name: 'NEO (Supportive)', emotion: 'neutral' },
      ares: { color: '#ff003c', glow: '#550000', name: 'ARES (Tactical)', emotion: 'focused' },
      iris: { color: '#39ff14', glow: '#003300', name: 'IRIS (Analytical)', emotion: 'happy' },
      luna: { color: '#ffea00', glow: '#ff5500', name: 'LUNA (Playful)', emotion: 'excited' }
    }
    return configs[activeAvatar] || configs.neo
  }, [activeAvatar])

  // Ref to hold loaded VRM model for animations
  const vrmRef = useRef<VRM | null>(null)
  const currentVrm = vrmRef.current

  // Load local VRM file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    loadVRMModel(url)
  }

  // Load VRM model from URL
  const loadVRMModel = (url: string) => {
    if (!url) return
    setIsLoading(true)
    setLoadingError(null)
    setLoadingProgress(0)

    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))

    loader.load(
      url,
      (gltf) => {
        // Stage lifecycle: clean up previous loaded VRM
        if (vrmRef.current) {
          vrmRef.current.scene.parent?.remove(vrmRef.current.scene)
          vrmRef.current.expressionManager?.clearExpressions()
          vrmRef.current.lookAt?.setupLookAtHelper(new THREE.Group())
        }

        const vrmInstance = gltf.userData.vrm as VRM
        if (vrmInstance) {
          vrmRef.current = vrmInstance
          setVrm(vrmInstance)
          vrmInstance.scene.position.set(0, -1.3, 0)
          vrmInstance.scene.rotation.y = Math.PI
          vrmInstance.scene.scale.set(1.2, 1.2, 1.2)
          setIsLoading(false)
          console.log('[AIRI VRM Stage] Avatar successfully initialized and cached on stage lifecycle.', vrmInstance)
        } else {
          setLoadingError('Loaded file is not a valid VRM model. Falling back to procedurally rendered AI companion.')
          setIsLoading(false)
        }
      },
      (progressEvent) => {
        if (progressEvent.total > 0) {
          setLoadingProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100))
        }
      },
      (error) => {
        console.error('[AIRI VRM Loader] Error loading VRM model:', error)
        setLoadingError('Failed to parse VRM. Using high-fidelity procedural 3D cyber fallback.')
        setIsLoading(false)
      }
    )
  }

  // Handle preset model loading triggers
  const loadPreset = (preset: 'boy' | 'girl') => {
    const url = preset === 'girl' 
      ? 'https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Self_Introduce.vrm'
      : 'https://vrm.dev/assets/models/vrm_m_1.0_sample.vrm'
    setVrmUrl(url)
    loadVRMModel(url)
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950/40 rounded-3xl border border-zinc-800/60 overflow-hidden relative backdrop-blur-md">
      {/* 3D Scene viewport */}
      <div className="flex-1 relative min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <div className="text-sm font-semibold text-zinc-200">Initializing Cyber Companion Stage</div>
            <div className="text-xs text-zinc-500 mt-1 uppercase font-mono">Stage Loading {loadingProgress}%</div>
            <div className="w-48 bg-zinc-800 h-1 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-400 h-full transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div>
            </div>
          </div>
        )}

        {/* Dynamic fallback notification banner */}
        {!vrm && !isLoading && (
          <div className="absolute top-4 left-4 right-4 bg-zinc-900/60 border border-zinc-800/80 px-4 py-2.5 rounded-xl z-20 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
              <div className="text-[11px] text-zinc-400 font-mono uppercase tracking-wide">
                Procedural Holographic Companion Stage Active
              </div>
            </div>
            <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-mono uppercase">
              Operational
            </span>
          </div>
        )}

        {/* 3D Canvas element wrapper */}
        <div className="w-full h-full">
          <SceneRenderer 
            vrm={vrm} 
            isSpeaking={isSpeaking} 
            isConnected={isConnected} 
            isProcessing={isProcessing} 
            activeAvatar={activeAvatar}
            charConfig={charConfig}
          />
        </div>
      </div>

      {/* Stage lifecycle controls overlay */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/80 flex flex-col gap-3">
        {loadingError && (
          <div className="text-[10px] text-rose-400 bg-rose-500/5 border border-rose-500/20 px-3 py-1.5 rounded-lg font-medium">
            {loadingError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* Custom Local VRM File Upload */}
          <label className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs text-zinc-300 font-medium transition-all duration-200 cursor-pointer text-center">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Upload Custom VRM
            <input type="file" accept=".vrm" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Quick presets trigger */}
          <button
            onClick={() => loadPreset('girl')}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs text-zinc-300 font-medium transition-all duration-200"
          >
            <Smile className="w-3.5 h-3.5 text-emerald-400" />
            Load Sample Avatar
          </button>
        </div>

        {/* Model info metadata */}
        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono border-t border-zinc-900 pt-2">
          <span>CHARACTER: {charConfig.name}</span>
          <span>STAGE: {vrm ? 'CUSTOM_VRM_ACTIVE' : 'PROCEDURAL_HOLOGRAM'}</span>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// Interactive 3D Canvas Components
// -------------------------------------------------------------

function SceneRenderer({
  vrm,
  isSpeaking,
  isConnected,
  isProcessing,
  activeAvatar,
  charConfig
}: {
  vrm: VRM | null
  isSpeaking: boolean
  isConnected: boolean
  isProcessing: boolean
  activeAvatar: string
  charConfig: any
}) {
  return (
    <div className="w-full h-full relative">
      {/* Embedded canvas with absolute positions to prevent ref resizing conflicts */}
      <div className="absolute inset-0">
        <canvas className="w-full h-full" id="vrm-three-stage" />
        <CanvasWithScene 
          vrm={vrm} 
          isSpeaking={isSpeaking} 
          isConnected={isConnected} 
          isProcessing={isProcessing} 
          activeAvatar={activeAvatar}
          charConfig={charConfig}
        />
      </div>
    </div>
  )
}

function CanvasWithScene({
  vrm,
  isSpeaking,
  isConnected,
  isProcessing,
  activeAvatar,
  charConfig
}: {
  vrm: VRM | null
  isSpeaking: boolean
  isConnected: boolean
  isProcessing: boolean
  activeAvatar: string
  charConfig: any
}) {
  return (
    <div className="w-full h-full">
      {/* 3D Canvas Context */}
      <CanvasWithContext
        vrm={vrm}
        isSpeaking={isSpeaking}
        isConnected={isConnected}
        isProcessing={isProcessing}
        activeAvatar={activeAvatar}
        charConfig={charConfig}
      />
    </div>
  )
}

import { Canvas as R3FCanvas } from '@react-three/fiber'

function CanvasWithContext({
  vrm,
  isSpeaking,
  isConnected,
  isProcessing,
  activeAvatar,
  charConfig
}: {
  vrm: VRM | null
  isSpeaking: boolean
  isConnected: boolean
  isProcessing: boolean
  activeAvatar: string
  charConfig: any
}) {
  return (
    <R3FCanvas
      camera={{ position: [0, 0, 2.4], fov: 45 }}
      style={{ background: 'transparent' }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[1, 3, 2]} intensity={1.5} castShadow />
      <pointLight position={[-1, -2, -1]} intensity={0.5} color={charConfig.color} />
      
      {vrm ? (
        <VRMRenderer vrm={vrm} isSpeaking={isSpeaking} isConnected={isConnected} isProcessing={isProcessing} charConfig={charConfig} />
      ) : (
        <ProceduralHoloRenderer isSpeaking={isSpeaking} isConnected={isConnected} isProcessing={isProcessing} activeAvatar={activeAvatar} charConfig={charConfig} />
      )}
    </R3FCanvas>
  )
}

/**
 * VRM Animator & Emotion-to-Blendshape Controller
 */
function VRMRenderer({
  vrm,
  isSpeaking,
  isConnected,
  isProcessing,
  charConfig
}: {
  vrm: VRM
  isSpeaking: boolean
  isConnected: boolean
  isProcessing: boolean
  charConfig: any
}) {
  const { scene } = useThree()
  
  // Attach loaded VRM scene to React Three Fiber tree
  useEffect(() => {
    scene.add(vrm.scene)
    return () => {
      scene.remove(vrm.scene)
    }
  }, [vrm, scene])

  // Local blink timer registers
  const blinkTimer = useRef<number>(0)
  const isBlinking = useRef<boolean>(false)

  useFrame((state, delta) => {
    if (!vrm) return

    // Update VRM bones/expression parameters
    vrm.update(delta)

    const t = state.clock.getElapsedTime()

    // 1. Auto-blink algorithm (AIRI look-at lookups)
    blinkTimer.current += delta
    if (blinkTimer.current > 3.5) {
      isBlinking.current = true
      blinkTimer.current = 0
    }

    if (isBlinking.current) {
      // Linear transition blink
      vrm.expressionManager?.setValue('blink', 1.0)
      if (blinkTimer.current > 0.12) {
        vrm.expressionManager?.setValue('blink', 0.0)
        isBlinking.current = false
      }
    } else {
      vrm.expressionManager?.setValue('blink', 0.0)
    }

    // 2. Lip-sync lip vibration mapped to speak states
    if (isSpeaking) {
      const mouthOpen = Math.abs(Math.sin(t * 14) * 0.7 + Math.sin(t * 4.5) * 0.3)
      vrm.expressionManager?.setValue('aa', mouthOpen)
    } else {
      vrm.expressionManager?.setValue('aa', 0.0)
    }

    // 3. Emotion → Blend-Shape mapping
    // Support basic mood shapes based on character selection
    if (charConfig.emotion === 'happy') {
      vrm.expressionManager?.setValue('happy', 0.8)
      vrm.expressionManager?.setValue('sad', 0.0)
      vrm.expressionManager?.setValue('angry', 0.0)
    } else if (charConfig.emotion === 'focused') {
      vrm.expressionManager?.setValue('angry', 0.5) // focused brow tilt
      vrm.expressionManager?.setValue('happy', 0.0)
    } else if (charConfig.emotion === 'excited') {
      vrm.expressionManager?.setValue('happy', 1.0)
      vrm.expressionManager?.setValue('surprised', 0.4)
    } else {
      // Neutral baseline
      vrm.expressionManager?.setValue('happy', 0.0)
      vrm.expressionManager?.setValue('sad', 0.0)
      vrm.expressionManager?.setValue('angry', 0.0)
    }

    // 4. Look-At mouse tracking logic (AIRI implementation pattern)
    if (vrm.lookAt) {
      // Slight smooth rotation vector
      const targetRotationX = (state.pointer.y * 0.15)
      const targetRotationY = (state.pointer.x * 0.22)
      
      const head = vrm.humanoid?.getNormalizedBoneNode('head')
      if (head) {
        head.rotation.x += (targetRotationX - head.rotation.x) * 0.15
        head.rotation.y += (targetRotationY - head.rotation.y) * 0.15
      }
    }

    // Subtle breathing floating effect
    vrm.scene.position.y = -1.1 + Math.sin(t * 1.5) * 0.02
  })

  return null
}

/**
 * Advanced Procedural Futuristic Droid/Avatar Renderer (Alternative fallback)
 */
function ProceduralHoloRenderer({
  isSpeaking,
  isConnected,
  isProcessing,
  activeAvatar,
  charConfig
}: {
  isSpeaking: boolean
  isConnected: boolean
  isProcessing: boolean
  activeAvatar: string
  charConfig: any
}) {
  const groupRef = useRef<THREE.Group>(null)
  const leftEyeRef = useRef<THREE.Mesh>(null)
  const rightEyeRef = useRef<THREE.Mesh>(null)
  const mouthRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  const blinkTimer = useRef<number>(0)
  const isBlinking = useRef<boolean>(false)

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()
    if (!groupRef.current) return

    // 1. Idle Floating Animation (Breathe cycle)
    groupRef.current.position.y = Math.sin(t * 1.6) * 0.08
    groupRef.current.rotation.y += delta * 0.15

    // Slight look-at tracking for procedural model
    groupRef.current.rotation.x = -state.pointer.y * 0.12
    groupRef.current.rotation.y = state.pointer.x * 0.22

    // 2. Auto-blink Eye Scaling
    blinkTimer.current += delta
    if (blinkTimer.current > 4.2) {
      isBlinking.current = true
      blinkTimer.current = 0
    }

    const scaleY = isBlinking.current && blinkTimer.current < 0.14 ? 0.05 : 1.0
    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.scale.y += (scaleY - leftEyeRef.current.scale.y) * 0.25
      rightEyeRef.current.scale.y += (scaleY - rightEyeRef.current.scale.y) * 0.25
    }

    // 3. Lip-sync animation (scaled mouth height)
    if (mouthRef.current) {
      let targetMouthY = 0.15
      if (isSpeaking) {
        targetMouthY = 0.4 + Math.abs(Math.sin(t * 16) * 0.5 + Math.sin(t * 5.2) * 0.2)
      } else if (isProcessing) {
        targetMouthY = 0.05 // tight lips when processing
      }
      mouthRef.current.scale.y += (targetMouthY - mouthRef.current.scale.y) * 0.2
    }

    // 4. Ring rotation and audio pulse
    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.4
      ringRef.current.rotation.x = Math.sin(t * 0.8) * 0.15
      
      let targetScale = isConnected ? 1.0 : 0.8
      if (isSpeaking) {
        targetScale = 1.1 + Math.abs(Math.sin(t * 12) * 0.08)
      }
      ringRef.current.scale.setScalar(targetScale)
    }
  })

  // Theme matching colors
  const primaryColor = charConfig.color
  const glowColor = charConfig.glow

  return (
    <group ref={groupRef}>
      {/* Floating Outer Holographic Rings */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.72, 0.02, 16, 100]} />
        <meshBasicMaterial color={primaryColor} transparent opacity={0.4} wireframe />
      </mesh>

      {/* Main futuristic head/visor shell */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshPhysicalMaterial
          color="#0b0e14"
          emissive={glowColor}
          emissiveIntensity={0.3}
          roughness={0.1}
          metalness={0.9}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          transmission={0.2}
          thickness={0.5}
        />
      </mesh>

      {/* Cyber Visor Screen */}
      <mesh position={[0, 0.04, 0.38]}>
        <boxGeometry args={[0.62, 0.24, 0.1]} />
        <meshStandardMaterial
          color="#020408"
          roughness={0.0}
          metalness={1.0}
        />
      </mesh>

      {/* Eyes mapping to character state */}
      <mesh ref={leftEyeRef} position={[-0.18, 0.04, 0.435]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={primaryColor} />
      </mesh>

      <mesh ref={rightEyeRef} position={[0.18, 0.04, 0.435]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={primaryColor} />
      </mesh>

      {/* Mouth lip sync mesh */}
      <mesh ref={mouthRef} position={[0, -0.1, 0.435]}>
        <boxGeometry args={[0.18, 0.04, 0.02]} />
        <meshBasicMaterial color={primaryColor} />
      </mesh>

      {/* Background Holographic Glow Halo */}
      <mesh scale={[1.22, 1.22, 1.22]} position={[0, 0, -0.1]}>
        <sphereGeometry args={[0.48, 16, 16]} />
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          wireframe
        />
      </mesh>
    </group>
  )
}
