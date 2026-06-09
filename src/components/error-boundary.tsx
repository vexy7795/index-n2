import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Catches render-time throws from anywhere below it so one malformed bookmark
// shape can't blank the whole tab. Class component because there's no hook
// equivalent for getDerivedStateFromError / componentDidCatch.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("render error:", error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <div className="max-w-md space-y-1 text-center">
          <p className="text-sm font-medium">Render failed.</p>
          <p className="text-muted-foreground font-mono text-xs break-words">
            {this.state.error.message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm"
        >
          Reload
        </button>
      </div>
    )
  }
}
