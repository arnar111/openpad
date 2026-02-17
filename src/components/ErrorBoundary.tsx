import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackLabel?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-office-bg p-8">
          <div className="text-4xl mb-4">💥</div>
          <h2 className="font-pixel text-[10px] text-red-400 mb-2">
            {this.props.fallbackLabel || 'Something went wrong'}
          </h2>
          <p className="font-pixel text-[7px] text-gray-500 mb-4 max-w-md text-center">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="font-pixel text-[8px] px-4 py-2 rounded-lg border border-office-accent/40 text-office-accent hover:bg-office-accent/10 transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
