import { Component, type ReactNode } from 'react'
import { Button, Wordmark } from './ui'

interface Props {
  children: ReactNode
  /** Clears the error when this changes (for example the route). */
  resetKey?: string
  /** Full-screen version for errors outside the app shell. */
  fullScreen?: boolean
}

/** Shows a friendly "something went wrong" screen instead of a blank page. */
export class ErrorBoundary extends Component<Props, { error: Error | null; resetKey?: string }> {
  state: { error: Error | null; resetKey?: string } = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: { error: Error | null; resetKey?: string }) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey }
    return null
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div
        role="alert"
        className={`mx-auto flex w-full max-w-md flex-col items-center justify-center px-6 text-center ${this.props.fullScreen ? 'min-h-dvh' : 'pt-20'}`}
      >
        {this.props.fullScreen && <Wordmark className="mb-10 text-2xl" />}
        <h1 className="text-2xl font-black tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-muted">
          Reloading usually fixes it. Your workout in progress is saved on this phone, so nothing is lost.
        </p>
        <Button className="mt-6 w-full" onClick={() => window.location.reload()}>
          Reload
        </Button>
        <p className="mt-4 text-xs break-all text-muted/70">{error.message}</p>
      </div>
    )
  }
}
