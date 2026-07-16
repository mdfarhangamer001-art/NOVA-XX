import { Component, ReactNode } from 'react'

interface OrbErrorBoundaryProps {
  children: ReactNode
}

interface OrbErrorBoundaryState {
  hasError: boolean
}

// Catches render crashes coming from the Three.js / WebGL orb (AICoreSphere).
// On low-end or driver-broken machines, WebGL context creation can throw
// during mount. Without this boundary, that exception propagates up and
// takes down the entire renderer (the "crash right after login" bug),
// because the orb previously only mounted once the operator was authenticated.
// With this boundary, the failure is contained to just the orb and the rest
// of the dashboard keeps working normally.
export default class OrbErrorBoundary extends Component<OrbErrorBoundaryProps, OrbErrorBoundaryState> {
  constructor(props: OrbErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): OrbErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown): void {
    console.error('[NOVA-X] 3D Orb failed to render (likely WebGL unsupported on this machine):', error)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Lightweight CSS fallback so the layout doesn't shift and the
      // operator still sees something alive in place of the orb.
      return (
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
          <div className="w-32 h-32 rounded-full bg-cyan-500/10 border border-cyan-400/30 animate-pulse" />
        </div>
      )
    }
    return this.props.children
  }
}
