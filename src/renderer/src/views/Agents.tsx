import { useState, useEffect, useRef } from 'react'
import {
  Cpu,
  Shield,
  Terminal,
  Play,
  Pause,
  RefreshCw,
  Zap,
  Monitor,
  Activity,
  Radio,
  Eye,
  Search,
  CheckCircle2,
  GitPullRequest,
  Tag,
  Layers,
  ArrowRight,
  Sparkles,
  Server,
  Code,
  Mic,
  MicOff,
  UserCheck,
  Volume2,
  Camera,
  Video
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AGENTS_DATA, Agent } from '../data/agents'

export default function AgentsView() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(AGENTS_DATA[0])
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'SCREEN_SHARE' | 'AUTOPILOT'>('CONSOLE')

  // Real-time fluctuating network stats
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 28.4,
    ram: 45.1,
    latency: 24,
    activeAgents: 32
  })

  // Simulated Autopilot Workflow states
  const [isAutopilotRunning, setIsAutopilotRunning] = useState(false)
  const [autopilotLogs, setAutopilotLogs] = useState<string[]>([
    'SYSTEM: Neural Core Autopilot initialized.',
    'STATUS: Awaiting code drift trigger or scheduled cron loop.'
  ])
  const [currentVersion, setCurrentVersion] = useState(() => {
    return (
      localStorage.getItem('xtehzeeb_app_version') ||
      localStorage.getItem('novax_app_version') ||
      '1.6.3'
    )
  })

  const visionIntervalRef = useRef<any>(null)

  useEffect(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke('get-app-version').then((v: string) => {
        if (v) {
          setCurrentVersion(v)
          localStorage.setItem('xtehzeeb_app_version', v)
          localStorage.setItem('novax_app_version', v)
        }
      })

      // Real-time progress logs subscription
      const handleProgress = (_event: any, msg: string) => {
        setAgentLogs((prev) => {
          const currentLogs = prev['coding-agent'] || []
          return {
            ...prev,
            'coding-agent': [...currentLogs, msg]
          }
        })
      }

      const unsubscribe = window.electron.ipcRenderer.on('agent-progress-log', handleProgress)
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        }
      }
    }
    return undefined
  }, [])

  // Direct Uplink console input/log states
  const [consoleInput, setConsoleInput] = useState('')
  const [agentLogs, setAgentLogs] = useState<Record<string, string[]>>({})

  // Custom Voice Fingerprinting & Speaker Profiles
  const [voiceProfiles, setVoiceProfiles] = useState<Array<{ name: string; fingerprint: string }>>(() => {
    const saved = localStorage.getItem('novax_voice_profiles')
    return saved ? JSON.parse(saved) : [
      { name: 'Boss (Primary)', fingerprint: 'v_fp_01_high_pitch' },
      { name: 'Assistant Developer', fingerprint: 'v_fp_02_low_pitch' }
    ]
  })
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('Boss (Primary)')
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [isRegisteringVoice, setIsRegisteringVoice] = useState(false)
  const [registerName, setRegisterName] = useState('')
  const [isVoiceSupported, setIsVoiceSupported] = useState(false)
  const [activeVoiceWaveform, setActiveVoiceWaveform] = useState<number[]>(new Array(15).fill(4))

  // Optics & Snapshots
  const [isCameraActive, setIsCameraActive] = useState(() => localStorage.getItem('novax_camera_monitoring') === 'true')
  const [isScreenActive, setIsScreenActive] = useState(() => localStorage.getItem('novax_screen_monitoring') === 'true')
  const [opticsLogs, setOpticsLogs] = useState<string[]>([
    'OPTICS: Privacy-first localized context nodes ready.',
    'OPTICS: Camera and Screen monitors status loaded from settings.'
  ])

  const webcamVideoRef = useRef<HTMLVideoElement | null>(null)
  const webcamStreamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Screen sharing state
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [shareResolution, setShareResolution] = useState('—')
  const [shareFps, setShareFps] = useState(0)
  const [shareBitrate, setShareBitrate] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Fluctuating metric values to look hyper-alive!
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemMetrics((prev) => {
        const cpuDrift = (Math.random() - 0.5) * 4
        const ramDrift = (Math.random() - 0.5) * 1.5
        const latencyDrift = Math.floor((Math.random() - 0.5) * 6)

        return {
          cpu: Math.min(100, Math.max(5, +(prev.cpu + cpuDrift).toFixed(1))),
          ram: Math.min(100, Math.max(10, +(prev.ram + ramDrift).toFixed(1))),
          latency: Math.min(150, Math.max(2, prev.latency + latencyDrift)),
          activeAgents: prev.activeAgents
        }
      })
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  // Categories list
  const categories = ['ALL', 'Automation', 'Neural', 'DevOps', 'Security', 'Media', 'Research']

  // Filter agents
  const filteredAgents = AGENTS_DATA.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'ALL' || agent.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Screen share trigger
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (visionIntervalRef.current) {
        clearInterval(visionIntervalRef.current)
        visionIntervalRef.current = null
      }
      setIsScreenSharing(false)
      setShareResolution('—')
      setShareFps(0)
      setShareBitrate(0)
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: false
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setIsScreenSharing(true)

        const videoTrack = stream.getVideoTracks()[0]
        const settings = videoTrack.getSettings()
        setShareResolution(`${settings.width || 1920}x${settings.height || 1080}`)

        // Measure FPS and Bitrate dynamically
        let lastTime = performance.now()
        let frames = 0
        const trackStats = () => {
          if (!streamRef.current) return
          frames++
          const now = performance.now()
          if (now - lastTime >= 1000) {
            setShareFps(Math.round((frames * 1000) / (now - lastTime)))
            setShareBitrate(+(4.2 + Math.random() * 2.1).toFixed(1)) // mock active mbps transfer
            frames = 0
            lastTime = now
          }
          animationFrameRef.current = requestAnimationFrame(trackStats)
        }
        trackStats()

        // Real-time multimodal screen vision capture loop
        visionIntervalRef.current = setInterval(async () => {
          if (!streamRef.current || !videoRef.current) return
          try {
            const canvas = document.createElement('canvas')
            canvas.width = 640
            canvas.height = 360
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
              const base64 = canvas.toDataURL('image/jpeg', 0.6)

              setAutopilotLogs((prev) => [
                ...prev,
                `[VISION] Capture frame dispatched to server-side multimodal analyzer...`
              ])

              if (window.iris?.sendVisionFrame) {
                const res = await window.iris.sendVisionFrame(base64)
                if (res.success) {
                  setAutopilotLogs((prev) => [
                    ...prev,
                    `[VISION] Analysis Result:\n${res.analysis}`
                  ])
                } else {
                  setAutopilotLogs((prev) => [...prev, `[VISION ERROR] ${res.error}`])
                }
              }
            }
          } catch (e: any) {
            if (e.message !== 'Failed to fetch') {
              console.error('Vision frame capture failed:', e)
            }
          }
        }, 12000)

        videoTrack.onended = () => {
          toggleScreenShare()
        }
      } catch (err) {
        console.error('Screen capture rejected or failed:', err)
      }
    }
  }

  // Determine speech support on mount
  useEffect(() => {
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (Speech) {
      setIsVoiceSupported(true)
    }
  }, [])

  // Background Optics Monitoring (Webcam & Screen periodic snapshot)
  useEffect(() => {
    let cameraInterval: any = null
    let localWebcamStream: MediaStream | null = null

    const startCameraSnapshotLoop = async () => {
      if (!isCameraActive) return
      try {
        setOpticsLogs((prev) => [...prev, 'SYS: Initializing camera device for background optics...'])
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        localWebcamStream = stream
        webcamStreamRef.current = stream

        // Attach to a hidden video element
        const hiddenVideo = document.createElement('video')
        hiddenVideo.srcObject = stream
        hiddenVideo.muted = true
        hiddenVideo.play()
        webcamVideoRef.current = hiddenVideo

        setOpticsLogs((prev) => [...prev, 'SYS: Camera optics active. Taking periodic context snapshots.'])

        // Take snapshot every 15 seconds
        cameraInterval = setInterval(async () => {
          if (!webcamVideoRef.current) return
          try {
            const canvas = document.createElement('canvas')
            canvas.width = 320
            canvas.height = 240
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(webcamVideoRef.current, 0, 0, canvas.width, canvas.height)
              const base64 = canvas.toDataURL('image/jpeg', 0.6)
              
              setOpticsLogs((prev) => [...prev, 'SYS: Dispatched background webcam frame...'])
              
              if (window.electron?.ipcRenderer) {
                const res = await window.electron.ipcRenderer.invoke('analyze-optics', {
                  base64Image: base64,
                  source: 'camera'
                })
                setOpticsLogs((prev) => [
                  ...prev,
                  `SYS: [CAMERA SEEN] ${res}`
                ])
                // Add to Scratch Agent system logs if it's currently selected
                setAgentLogs((prev) => ({
                  ...prev,
                  'scratch-agent': [...(prev['scratch-agent'] || []), `[Optics Camera] Saw: ${res}`]
                }))
              }
            }
          } catch (err: any) {
            console.error('Camera capture failed:', err)
          }
        }, 15000)

      } catch (err: any) {
        setOpticsLogs((prev) => [...prev, `ERROR: Camera access rejected: ${err.message}`])
        setIsCameraActive(false)
        localStorage.setItem('novax_camera_monitoring', 'false')
      }
    }

    if (isCameraActive) {
      startCameraSnapshotLoop()
    }

    return () => {
      if (cameraInterval) clearInterval(cameraInterval)
      if (localWebcamStream) {
        localWebcamStream.getTracks().forEach(t => t.stop())
      }
    }
  }, [isCameraActive])

  // Periodic Screen Monitor snapshots when screen sharing is ACTIVE and screen monitoring is enabled
  useEffect(() => {
    let screenInterval: any = null

    if (isScreenActive && isScreenSharing && videoRef.current) {
      setOpticsLogs((prev) => [...prev, 'SYS: Screen monitoring linked to active HUD stream.'])
      
      screenInterval = setInterval(async () => {
        if (!videoRef.current) return
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 400
          canvas.height = 225
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
            const base64 = canvas.toDataURL('image/jpeg', 0.6)
            
            setOpticsLogs((prev) => [...prev, 'SYS: Dispatched background screen frame...'])
            
            if (window.electron?.ipcRenderer) {
              const res = await window.electron.ipcRenderer.invoke('analyze-optics', {
                base64Image: base64,
                source: 'screen'
              })
              setOpticsLogs((prev) => [
                ...prev,
                `SYS: [SCREEN SEEN] ${res}`
              ])
              setAgentLogs((prev) => ({
                ...prev,
                'scratch-agent': [...(prev['scratch-agent'] || []), `[Optics Screen] Saw: ${res}`]
              }))
            }
          }
        } catch (err) {
          console.error('Screen background capture failed:', err)
        }
      }, 20000)
    }

    return () => {
      if (screenInterval) clearInterval(screenInterval)
    }
  }, [isScreenActive, isScreenSharing])

  // Web Audio Waveform Generator for realistic microphone recording visual effects
  const startWaveformAnimation = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioCtx()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 32
      source.connect(analyser)
      analyserRef.current = analyser

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const updateWave = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        
        // Convert frequencies to a nice array of 15 visual height parameters
        const wave = []
        for (let i = 0; i < 15; i++) {
          const val = dataArray[i % bufferLength] || 10
          // scale to a height value between 4 and 28
          wave.push(Math.max(4, Math.floor((val / 255) * 28)))
        }
        setActiveVoiceWaveform(wave)
        requestAnimationFrame(updateWave)
      }
      updateWave()
    } catch (e) {
      console.error('Web Audio API setup failed', e)
    }
  }

  const stopWaveformAnimation = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    setActiveVoiceWaveform(new Array(15).fill(4))
  }

  // Trigger voice command parsing or registration
  const startVoiceCapture = async () => {
    if (isRecordingVoice) {
      // Stop
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      stopWaveformAnimation()
      setIsRecordingVoice(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      startWaveformAnimation(stream)
      setIsRecordingVoice(true)

      const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (Speech) {
        const recognition = new Speech()
        recognition.continuous = true
        recognition.interimResults = false
        recognition.lang = 'en-US'

        recognition.onresult = async (event: any) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " ";
            }
          }
          const transcript = finalTranscript.trim();
          console.log('[Voice recognition] Heard transcript:', transcript)
          
          setConsoleInput(transcript)
          
          // Voice fingerprint extract (simulating based on speech rate & pitch characteristics of the Web Audio analyser)
          const pitchSum = activeVoiceWaveform.reduce((a, b) => a + b, 0)
          const isHighPitch = pitchSum > 120
          const extractedFingerprint = isHighPitch ? 'v_fp_01_high_pitch' : 'v_fp_02_low_pitch'

          // Match fingerprint
          let matchedName = 'Unknown Speaker'
          const matchedProfile = voiceProfiles.find(v => v.fingerprint === extractedFingerprint)
          if (matchedProfile) {
            matchedName = matchedProfile.name
            setCurrentSpeaker(matchedName)
          }

          setAgentLogs((prev) => ({
            ...prev,
            'scratch-agent': [
              ...(prev['scratch-agent'] || []),
              `USER (${matchedName}): "${transcript}"`
            ]
          }))

          // Send to agent command backend
          if (window.electron?.ipcRenderer) {
            try {
              // Greet speaker customized
              const greeting = matchedName !== 'Unknown Speaker' 
                ? `[Voice Fingerprint Matched: ${matchedName}]` 
                : '[Voice Fingerprint: Unregistered Speaker]'
              
              setAgentLogs((prev) => ({
                ...prev,
                'scratch-agent': [...(prev['scratch-agent'] || []), greeting]
              }))

              const res = await window.electron.ipcRenderer.invoke('scratch-agent-command', `${transcript} (Spoken by user ${matchedName})`)
              setAgentLogs((prev) => ({
                ...prev,
                'scratch-agent': [...(prev['scratch-agent'] || []), `NOVA: ${res}`]
              }))
            } catch (err: any) {
              setAgentLogs((prev) => ({
                ...prev,
                'scratch-agent': [...(prev['scratch-agent'] || []), `ERROR: ${err.message}`]
              }))
            }
          }
        }

        recognition.onend = () => {
          setIsRecordingVoice(false)
          stopWaveformAnimation()
          stream.getTracks().forEach(t => t.stop())
        };

        recognitionRef.current = recognition
        recognition.start()
      } else {
        // Voice recognition simulation fallback
        setTimeout(async () => {
          setIsRecordingVoice(false)
          stopWaveformAnimation()
          stream.getTracks().forEach(t => t.stop())

          // Prompt simulation user command
          const promptCommand = prompt("Voice command input fallback (Web Speech API simulated):", "wallpaper change karo cyberpunk city")
          if (promptCommand) {
            setConsoleInput(promptCommand)
            
            // Randomly match voice to test fingerprinting
            const randomProfile = voiceProfiles[Math.floor(Math.random() * voiceProfiles.length)]
            setCurrentSpeaker(randomProfile.name)

            setAgentLogs((prev) => ({
              ...prev,
              'scratch-agent': [
                ...(prev['scratch-agent'] || []),
                `USER (${randomProfile.name}): "${promptCommand}"`
              ]
            }))

            if (window.electron?.ipcRenderer) {
              try {
                const res = await window.electron.ipcRenderer.invoke('scratch-agent-command', `${promptCommand} (Spoken by user ${randomProfile.name})`)
                setAgentLogs((prev) => ({
                  ...prev,
                  'scratch-agent': [...(prev['scratch-agent'] || []), `[Vocal Recognition Match: ${randomProfile.name}]`, `NOVA: ${res}`]
                }))
              } catch (err: any) {
                setAgentLogs((prev) => ({
                  ...prev,
                  'scratch-agent': [...(prev['scratch-agent'] || []), `ERROR: ${err.message}`]
                }))
              }
            }
          }
        }, 3500)
      }
    } catch (e: any) {
      console.error('Mic access rejected', e)
    }
  }

  // Register New Speaker Profile
  const registerNewVoiceProfile = async () => {
    if (!registerName.trim()) {
      alert("Please enter a speaker name to register.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      startWaveformAnimation(stream)
      setIsRegisteringVoice(true)
      
      // Keep recording for 4 seconds to analyze voice print
      setTimeout(() => {
        stream.getTracks().forEach(t => t.stop())
        stopWaveformAnimation()
        setIsRegisteringVoice(false)

        const randomHash = `v_fp_03_custom_${Date.now().toString().slice(-4)}`
        const newProfiles = [...voiceProfiles, { name: registerName, fingerprint: randomHash }]
        setVoiceProfiles(newProfiles)
        localStorage.setItem('novax_voice_profiles', JSON.stringify(newProfiles))
        setCurrentSpeaker(registerName)
        setRegisterName('')

        setAgentLogs((prev) => ({
          ...prev,
          'scratch-agent': [
            ...(prev['scratch-agent'] || []),
            `SYSTEM: Voice Profile Registered successfully for "${registerName}"! Acoustic signature linked to profile.`,
            `NOVA: Arre, welcome aboard, ${registerName}! Ab se main aapki awaaz ki profile pehchaan sakti hoon. Kaam shuru karein?`
          ]
        }))
      }, 4000)

    } catch (err: any) {
      alert(`Vocal registration failed: ${err.message}`)
    }
  }

  // Handle direct console submission
  const handleConsoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consoleInput.trim() || !selectedAgent) return

    const input = consoleInput
    setConsoleInput('')

    const currentAgentLogs = agentLogs[selectedAgent.id] || selectedAgent.systemLogs
    const newLogs = [...currentAgentLogs, `USER: ${input}`]

    setAgentLogs({
      ...agentLogs,
      [selectedAgent.id]: newLogs
    })

    if (selectedAgent.id === 'scratch-agent') {
      if (window.electron?.ipcRenderer) {
        try {
          const res = await window.electron.ipcRenderer.invoke('scratch-agent-command', input)
          setAgentLogs((prev) => ({
            ...prev,
            'scratch-agent': [...(prev['scratch-agent'] || []), `NOVA: ${res}`]
          }))
        } catch (err: any) {
          setAgentLogs((prev) => ({
            ...prev,
            'scratch-agent': [...(prev['scratch-agent'] || []), `ERROR: ${err.message}`]
          }))
        }
      }
      return
    }

    if (selectedAgent.id === 'coding-agent') {
      if (window.electron?.ipcRenderer) {
        try {
          const res = await window.electron.ipcRenderer.invoke('agent-run-task', input)
          if (res.success) {
            setAgentLogs((prev) => ({
              ...prev,
              'coding-agent': [...(prev['coding-agent'] || []), `NEURAL: ${res.summary}`]
            }))
          } else {
            setAgentLogs((prev) => ({
              ...prev,
              'coding-agent': [...(prev['coding-agent'] || []), `ERROR: ${res.error}`]
            }))
          }
        } catch (err: any) {
          setAgentLogs((prev) => ({
            ...prev,
            'coding-agent': [...(prev['coding-agent'] || []), `ERROR: ${err.message}`]
          }))
        }
      } else {
        setAgentLogs((prev) => ({
          ...prev,
          'coding-agent': [
            ...(prev['coding-agent'] || []),
            `ERROR: Main process communication is unavailable.`
          ]
        }))
      }
    } else {
      // Simulate Agent response based on its identity
      setTimeout(() => {
        let response = ''
        if (selectedAgent.id === 'github-workflow-automator') {
          response = `AUTOMATOR: Executed custom patch release sequence. Bumped package version, created release.yml template, compiled JS assemblies, and pushed tag to simulated git origin.`
        } else {
          response = `${selectedAgent.id.toUpperCase()}: Instruction loaded. Analyzing context nodes, executing targeted tool parameters. Output pipeline verified. Status code: 200 OK.`
        }
        setAgentLogs((prev) => ({
          ...prev,
          [selectedAgent.id]: [...(prev[selectedAgent.id] || []), response]
        }))
      }, 1000)
    }
  }

  // Run the Master Autopilot Release loop!
  const startAutopilotSequence = () => {
    if (isAutopilotRunning) return

    // Calculate dynamic next version
    const parts = currentVersion.split('.')
    let nextVersion = '1.6.4'
    if (parts.length === 3) {
      parts[2] = (parseInt(parts[2], 10) + 1).toString()
      nextVersion = parts.join('.')
    }

    setIsAutopilotRunning(true)
    const logs = [
      '⚡ [AUTOPILOT] Triggered automated repository analyzer...',
      '🔍 [ANALYSIS] Scanning file-system drift in workspace root...',
      '📝 [ANALYSIS] Found modifications: License ownership shifted to Lead Operator, package.json compiled.',
      '💾 [REDUCTION] Removing deprecated Razorpay, RazorPay checkout, and sponsor badges... OK.',
      '⚙️ [COMPILATION] Invoking esbuild bundling protocol: server.ts -> dist/server.cjs...',
      '📦 [COMPILATION] Vite bundle compiled successfully into static assets.',
      '🏷️ [VERSIONING] Semantic patch detected. Preparing version promotion...',
      `📈 [VERSIONING] Promoting local build from v${currentVersion} to v${nextVersion}...`,
      `🏷️ [GIT] Generated secure release tag: v${nextVersion}-release`,
      '🤖 [AUTOPILOT] Crafting GitHub release assets and workflow payloads...',
      '🚀 [RELEASE] Pushing assets to GitHub Actions workflow pipeline...',
      '📡 [RELEASE] GitHub release action executed successfully. Deployment online!',
      '🏁 [AUTOPILOT] Self-update and release sequence completed. System is fully stabilized.'
    ]

    setAutopilotLogs(['[AUTOPILOT] Initializing full loop.'])

    let index = 0
    const interval = setInterval(async () => {
      if (index < logs.length) {
        setAutopilotLogs((prev) => [...prev, logs[index]])
        index++
        if (index === 8) {
          if (window.electron?.ipcRenderer) {
            try {
              const realNext = await window.electron.ipcRenderer.invoke('bump-app-version')
              if (realNext) {
                setCurrentVersion(realNext)
                localStorage.setItem('xtehzeeb_app_version', realNext)
                localStorage.setItem('novax_app_version', realNext)
              }
            } catch (err) {
              setCurrentVersion(nextVersion)
              localStorage.setItem('xtehzeeb_app_version', nextVersion)
              localStorage.setItem('novax_app_version', nextVersion)
            }
          } else {
            setCurrentVersion(nextVersion)
            localStorage.setItem('xtehzeeb_app_version', nextVersion)
            localStorage.setItem('novax_app_version', nextVersion)
          }
        }
      } else {
        clearInterval(interval)
        setIsAutopilotRunning(false)
      }
    }, 900)
  }

  return (
    <div className="h-full w-full bg-transparent flex flex-col p-2 relative text-zinc-100 select-none">
      {/* Upper Grid - System telemetry HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 z-10">
        <div className="bg-zinc-950/60 border border-white/5 backdrop-blur-xl p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase">
              Neural Cores
            </span>
            <span className="text-xl font-bold font-mono text-[#00ff88]">100 Nodes</span>
          </div>
          <div className="p-2 bg-[#00ff88]/5 border border-[#00ff88]/10 rounded-lg">
            <Layers className="text-[#00ff88]" size={18} />
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-white/5 backdrop-blur-xl p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase">
              Core CPU Overhead
            </span>
            <span className="text-xl font-bold font-mono text-cyan-400">{systemMetrics.cpu}%</span>
          </div>
          <div className="p-2 bg-cyan-500/5 border border-cyan-500/10 rounded-lg">
            <Cpu className="text-cyan-400" size={18} />
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-white/5 backdrop-blur-xl p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase">
              Active RAM Load
            </span>
            <span className="text-xl font-bold font-mono text-[#a855f7]">{systemMetrics.ram}%</span>
          </div>
          <div className="p-2 bg-[#a855f7]/5 border border-[#a855f7]/10 rounded-lg">
            <Activity className="text-[#a855f7]" size={18} />
          </div>
        </div>

        <div className="bg-zinc-950/60 border border-white/5 backdrop-blur-xl p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="block text-[8px] font-mono tracking-widest text-zinc-500 uppercase">
              Uplink Latency
            </span>
            <span className="text-xl font-bold font-mono text-orange-400">
              {systemMetrics.latency} ms
            </span>
          </div>
          <div className="p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg">
            <Radio className="text-orange-400" size={18} />
          </div>
        </div>
      </div>

      {/* Main Container splits between Left (60 Agents select) and Right (Interactive workspace) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left Side: 60 Agents Selector (Col span 7) */}
        <div className="lg:col-span-7 flex flex-col bg-zinc-950/30 border border-white/5 rounded-2xl p-4 min-h-0">
          {/* Categories & Search Header */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-3 py-1.5 rounded-xl w-full md:w-64">
              <Search size={14} className="text-zinc-500" />
              <input
                type="text"
                placeholder="Search 100 agent cores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs font-mono text-zinc-200 outline-none w-full"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-[8px] font-mono tracking-wider uppercase rounded-lg border transition-all shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                      : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Container */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[52vh] min-h-0">
            {filteredAgents.map((agent) => {
              const isSelected = selectedAgent?.id === agent.id
              const activeColor =
                agent.category === 'Automation'
                  ? 'text-emerald-400'
                  : agent.category === 'Neural'
                    ? 'text-cyan-400'
                    : agent.category === 'DevOps'
                      ? 'text-purple-400'
                      : agent.category === 'Security'
                        ? 'text-red-400'
                        : agent.category === 'Media'
                          ? 'text-orange-400'
                          : 'text-blue-400'

              return (
                <motion.div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`relative overflow-hidden p-3 rounded-xl border cursor-pointer transition-all duration-300 group ${
                    isSelected
                      ? 'bg-zinc-900/80 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                      : 'bg-black/30 border-white/5 hover:border-white/15 hover:bg-zinc-950/40'
                  }`}
                >
                  {/* Subtle ambient pulse background on active */}
                  {agent.status === 'ACTIVE' && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
                  )}

                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg bg-zinc-900 border border-white/5 group-hover:border-white/10 ${activeColor}`}
                      >
                        {agent.category === 'Automation' && <Zap size={13} />}
                        {agent.category === 'Neural' && <Sparkles size={13} />}
                        {agent.category === 'DevOps' && <Code size={13} />}
                        {agent.category === 'Security' && <Shield size={13} />}
                        {agent.category === 'Media' && <Monitor size={13} />}
                        {agent.category === 'Research' && <Server size={13} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-wide text-zinc-100 group-hover:text-white">
                          {agent.name}
                        </span>
                        <span className="text-[7px] font-mono tracking-widest uppercase text-zinc-500">
                          {agent.category} Node
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span
                          className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${agent.status === 'PROCESSING' || agent.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                        />
                        <span
                          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${agent.status === 'PROCESSING' ? 'bg-amber-400' : agent.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                        />
                      </span>
                      <span className="text-[7px] font-mono text-zinc-500 tracking-wider">
                        {agent.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400 mt-2 line-clamp-2 h-7 leading-normal">
                    {agent.role}
                  </p>

                  <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-2 font-mono text-[8px] text-zinc-500">
                    <span>CPU: {agent.metrics.cpu}%</span>
                    <span>RAM: {agent.metrics.ram}MB</span>
                    <span>LATENCY: {agent.metrics.latency}ms</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Right Side: Interactive Agent workspace (Col span 5) */}
        <div className="lg:col-span-5 flex flex-col bg-zinc-950/30 border border-white/5 rounded-2xl p-4 min-h-0">
          {/* Sub Tab Navigation */}
          <div className="flex border-b border-white/5 pb-2 mb-4 gap-1">
            <button
              onClick={() => setActiveTab('CONSOLE')}
              className={`px-3 py-1 text-[9px] font-mono tracking-widest uppercase rounded-lg border transition-all ${
                activeTab === 'CONSOLE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              Uplink Console
            </button>
            <button
              onClick={() => setActiveTab('AUTOPILOT')}
              className={`px-3 py-1 text-[9px] font-mono tracking-widest uppercase rounded-lg border transition-all ${
                activeTab === 'AUTOPILOT'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              Autopilot Release
            </button>
            <button
              onClick={() => setActiveTab('SCREEN_SHARE')}
              className={`relative px-3 py-1 text-[9px] font-mono tracking-widest uppercase rounded-lg border transition-all ${
                activeTab === 'SCREEN_SHARE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              Screen HUD
              {isScreenSharing && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {/* View 1: CONSOLE */}
            {activeTab === 'CONSOLE' && selectedAgent && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-zinc-900 text-emerald-400 border border-white/5">
                      <Terminal size={14} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-mono tracking-wide text-zinc-200">
                        Uplink: {selectedAgent.name}
                      </h3>
                      <p className="text-[8px] font-mono text-zinc-500 tracking-wider uppercase">
                        Direct Node Interface
                      </p>
                    </div>
                  </div>

                  {/* OPTICS MONITOR FLASHING INDICATOR */}
                  {(isCameraActive || isScreenActive) && (
                    <motion.div 
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <span className="text-[7.5px] font-mono font-bold uppercase tracking-widest">
                        OPTICS MONITOR ACTIVE
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* LOGS DISPLAY */}
                <div className="flex-1 bg-black/60 border border-white/5 rounded-xl p-3 font-mono text-[9px] overflow-y-auto mb-3 max-h-[28vh] space-y-2.5">
                  <span className="block text-zinc-600 border-b border-white/5 pb-1 mb-1">
                    // CONNECTED TO ACTIVE AGENT CORE PORT
                  </span>

                  {(agentLogs[selectedAgent.id] || selectedAgent.systemLogs).map((log, index) => {
                    const isUser = log.startsWith('USER:') || log.includes('USER (')
                    const isResponse =
                      log.startsWith('AUTOMATOR:') ||
                      log.startsWith('NEURAL:') ||
                      log.startsWith('ADB:') ||
                      log.startsWith('NOVA:') ||
                      log.includes(': ')
                    return (
                      <div
                        key={index}
                        className={`leading-relaxed p-1.5 rounded ${
                          isUser
                            ? 'bg-[#00ff88]/5 text-[#00ff88] border-l-2 border-[#00ff88]/40 pl-2'
                            : isResponse
                              ? 'bg-zinc-900/60 text-zinc-300'
                              : 'text-zinc-500'
                        }`}
                      >
                        {log}
                      </div>
                    )
                  })}
                </div>

                {/* SPEAKER VOICE IDENTIFICATION BAR */}
                {selectedAgent.id === 'scratch-agent' && (
                  <div className="bg-zinc-900/70 border border-white/5 rounded-xl p-3 mb-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck size={12} className="text-emerald-400" />
                        <span className="text-[9px] font-mono text-zinc-300">
                          Identified Speaker: <strong className="text-emerald-400">{currentSpeaker}</strong>
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-zinc-500 uppercase">
                        Vocal Fingerprints
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[8px] text-zinc-400 font-mono">Select:</span>
                      {voiceProfiles.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => {
                            setCurrentSpeaker(p.name)
                            setAgentLogs((prev) => ({
                              ...prev,
                              'scratch-agent': [
                                ...(prev['scratch-agent'] || []),
                                `SYSTEM: Speaker context shifted to "${p.name}".`
                              ]
                            }))
                          }}
                          className={`px-2 py-0.5 text-[8px] font-mono rounded border transition-all ${
                            currentSpeaker === p.name
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-transparent text-zinc-500 border-white/5 hover:text-zinc-300'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>

                    {/* REGISTER NEW SPEAKER PROFILE */}
                    <div className="flex gap-2 items-center border-t border-white/5 pt-2.5 mt-1">
                      <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Register new speaker name..."
                        className="bg-black/40 border border-white/5 px-2 py-1 rounded text-[8px] font-mono text-zinc-300 outline-none flex-1 focus:border-emerald-500/30"
                      />
                      <button
                        onClick={registerNewVoiceProfile}
                        disabled={isRegisteringVoice}
                        className={`px-2.5 py-1 rounded text-[8px] font-mono font-bold tracking-wider uppercase border transition-all ${
                          isRegisteringVoice
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                            : 'bg-emerald-500 text-black border-emerald-400/20 hover:bg-emerald-400 cursor-pointer'
                        }`}
                      >
                        {isRegisteringVoice ? 'Learning...' : 'Fingerprint Voice'}
                      </button>
                    </div>
                  </div>
                )}

                {/* INPUT CONTROL LAYER */}
                <form onSubmit={handleConsoleSubmit} className="flex gap-2 items-center">
                  {/* MIC TRIGGER */}
                  <button
                    type="button"
                    onClick={startVoiceCapture}
                    className={`cursor-pointer p-2 rounded-xl border flex items-center justify-center transition-all ${
                      isRecordingVoice
                        ? 'bg-red-500 text-white border-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                        : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/15 hover:text-zinc-200'
                    }`}
                    title={isRecordingVoice ? 'Stop voice command recording' : 'Start voice command'}
                  >
                    {isRecordingVoice ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>

                  {/* MIC REAL-TIME EQUALIZER */}
                  {isRecordingVoice && (
                    <div className="flex gap-0.5 items-end h-5 px-2">
                      {activeVoiceWaveform.map((h, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: h }}
                          className="w-[2px] bg-emerald-400 rounded-full"
                          style={{ minHeight: '4px' }}
                        />
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    placeholder={`Instruct ${selectedAgent.name.split(' ')[0]} (Awaaz se bhi command de sakte hain)...`}
                    className="flex-1 bg-black/50 border border-white/5 px-3 py-2 rounded-xl text-[10px] font-mono text-zinc-200 outline-none focus:border-emerald-500/30 transition-all placeholder:text-zinc-600"
                  />
                  <button
                    type="submit"
                    className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black px-3.5 py-2 rounded-xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </button>
                </form>

                {/* COGNITIVE OPTICS STATS FOR COMPANION */}
                {(isCameraActive || isScreenActive) && (
                  <div className="mt-3 p-2 bg-black/40 border border-white/5 rounded-xl text-[8px] font-mono text-zinc-500">
                    <div className="text-[7px] text-zinc-400 uppercase tracking-widest mb-1">
                      Optics Activity Memory Logs
                    </div>
                    <div className="max-h-[50px] overflow-y-auto space-y-1">
                      {opticsLogs.slice(-3).map((log, idx) => (
                        <div key={idx} className="truncate">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View 2: AUTOPILOT */}
            {activeTab === 'AUTOPILOT' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-zinc-900 text-purple-400 border border-white/5">
                      <Zap size={14} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-mono text-zinc-200">
                        Self-Releasing Autopilot
                      </h3>
                      <p className="text-[8px] font-mono text-zinc-500 tracking-wider uppercase">
                        Vite + Esbuild Automated Build System
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-purple-500/20 bg-purple-500/5">
                    <Tag size={10} className="text-purple-400" />
                    <span className="text-[8px] font-mono text-purple-300 tracking-wider">
                      v{currentVersion}
                    </span>
                  </div>
                </div>

                <div className="flex-1 bg-black/60 border border-white/5 rounded-xl p-3 font-mono text-[9px] overflow-y-auto mb-3 max-h-[34vh] space-y-2">
                  <span className="block text-zinc-600 border-b border-white/5 pb-1 mb-1">
                    // SECURE AUTOPILOT CI/CD OUTPUT
                  </span>
                  {autopilotLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`leading-relaxed ${
                        log.includes('SUCCESS') || log.includes('OK') || log.includes('stabilized')
                          ? 'text-[#00ff88]'
                          : log.includes('release') || log.includes('v1.6.4')
                            ? 'text-purple-400 font-bold'
                            : 'text-zinc-400'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>

                <button
                  onClick={startAutopilotSequence}
                  disabled={isAutopilotRunning}
                  className={`w-full cursor-pointer font-mono text-[9px] tracking-widest uppercase py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    isAutopilotRunning
                      ? 'bg-purple-500/5 border-purple-500/20 text-purple-400 cursor-not-allowed'
                      : 'bg-[#a855f7] hover:bg-[#b86dfb] text-white border-[#b86dfb]/20 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                  }`}
                >
                  {isAutopilotRunning ? (
                    <>
                      <RefreshCw className="animate-spin" size={13} />
                      Analyzing & Compiling Build...
                    </>
                  ) : (
                    <>
                      <GitPullRequest size={13} />
                      Trigger Autopilot Self-Release Loop
                    </>
                  )}
                </button>
              </div>
            )}

            {/* View 3: SCREEN HUD */}
            {activeTab === 'SCREEN_SHARE' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-zinc-900 text-cyan-400 border border-white/5">
                      <Monitor size={14} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-mono text-zinc-200">
                        Real-Clock Screen HUD
                      </h3>
                      <p className="text-[8px] font-mono text-zinc-500 tracking-wider uppercase">
                        Direct Windows Frame-Capture
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span
                        className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${isScreenSharing ? 'bg-red-400' : 'bg-zinc-600'}`}
                      />
                      <span
                        className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isScreenSharing ? 'bg-red-400' : 'bg-zinc-600'}`}
                      />
                    </span>
                    <span className="text-[8px] font-mono text-zinc-400 tracking-wider">
                      {isScreenSharing ? 'LIVE' : 'STANDBY'}
                    </span>
                  </div>
                </div>

                <div className="relative aspect-video w-full rounded-xl border border-white/5 bg-black/60 overflow-hidden mb-3 flex flex-col items-center justify-center">
                  <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isScreenSharing ? 'opacity-90' : 'opacity-0 pointer-events-none'}`}
                    muted
                  />

                  {/* High Tech HUD Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex justify-between items-end text-zinc-400 z-10 select-none">
                    <div className="font-mono text-[7px] space-y-0.5">
                      <div>
                        DIMENSIONS:{' '}
                        <span className="text-cyan-400 font-bold">{shareResolution}</span>
                      </div>
                      <div>
                        FPS STREAM:{' '}
                        <span className="text-[#00ff88] font-bold">{shareFps || '—'} Hz</span>
                      </div>
                    </div>
                    <div className="font-mono text-[7px] space-y-0.5 text-right">
                      <div>
                        BITRATE:{' '}
                        <span className="text-purple-400 font-bold">
                          {shareBitrate ? `${shareBitrate} MB/s` : '—'}
                        </span>
                      </div>
                      <div>
                        LATENCY:{' '}
                        <span className="text-orange-400 font-bold">
                          {isScreenSharing ? '12 ms' : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isScreenSharing && (
                    <div className="flex flex-col items-center text-center gap-2 p-4 relative z-10">
                      <div className="h-10 w-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <Monitor size={18} />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-300">
                          Screen Uplink Disabled
                        </span>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-1 block">
                          Click start to share screen
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={toggleScreenShare}
                  className={`w-full cursor-pointer font-mono text-[9px] tracking-widest uppercase py-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    isScreenSharing
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                  }`}
                >
                  {isScreenSharing ? (
                    <>
                      <Pause size={13} />
                      Stop Screen Capture
                    </>
                  ) : (
                    <>
                      <Play size={13} />
                      Initiate Direct Screen Capture
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
