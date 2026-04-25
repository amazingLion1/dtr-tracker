import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * React Error Boundary — catches rendering errors and shows a friendly recovery screen
 * instead of a white screen of death.
 *
 * Usage: <ErrorBoundary><App /></ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={30} className="text-red-400" />
            </div>

            <h1 className="text-text-primary text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              An unexpected error occurred. Your data is safe — try refreshing the page or click below to recover.
            </p>

            {this.state.error && (
              <div className="bg-surface border border-border rounded-xl p-4 mb-6 text-left">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Error Details</p>
                <p className="text-red-400 text-xs font-mono break-all leading-relaxed">
                  {this.state.error.message || 'Unknown error'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary border border-border hover:border-border-bright transition-colors"
              >
                <RotateCcw size={14} />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-hover transition-colors shadow-lg shadow-accent/10"
              >
                Reload Page
              </button>
            </div>

            <p className="text-text-secondary/30 text-[10px] mt-8">
              DTR Tracker · If this keeps happening, contact your supervisor
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
