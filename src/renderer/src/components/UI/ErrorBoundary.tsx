import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo | null) => ReactNode)
  name?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[ErrorBoundary] [${this.props.name || 'Generic'}] Caught an error:`,
      error,
      errorInfo
    )
    this.setState({ error, errorInfo })
  }

  private handleRestart = (): void => {
    window.location.reload()
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error!, this.state.errorInfo)
        }
        return this.props.fallback
      }

      // Default beautiful full-screen fallback
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-black text-zinc-100 font-sans p-6 border border-emerald-500/20 rounded-xl select-none">
          <div className="max-w-md w-full bg-zinc-950/60 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl text-center flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="font-mono text-sm font-bold tracking-widest text-zinc-300 uppercase">
                SYSTEM CRITICAL EXCEPTION
              </h1>
              <p className="text-xs text-zinc-500 font-mono leading-relaxed">
                NOVA-X core component crashed. Runtime recovered successfully.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full text-left bg-black/40 border border-white/5 p-4 rounded-xl max-h-40 overflow-y-auto">
                <p className="text-[10px] font-mono text-red-400 break-all whitespace-pre-wrap">
                  {this.state.error.toString()}
                </p>
                {this.state.error.stack && (
                  <p className="text-[9px] font-mono text-zinc-600 mt-2 break-all whitespace-pre-wrap overflow-x-hidden">
                    {this.state.error.stack.split('\n').slice(0, 3).join('\n')}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={this.handleRestart}
              className="w-full cursor-pointer py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            >
              Restart Session
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
