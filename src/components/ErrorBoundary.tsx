import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold mb-2">حدث خطأ غير متوقع</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            حدث خطأ أثناء تحميل هذه الصفحة. يمكنك تحديث الصفحة للمحاولة مرة أخرى.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            تحديث الصفحة
          </button>
          <details className="mt-4 text-xs text-muted-foreground">
            <summary className="cursor-pointer">تفاصيل الخطأ</summary>
            <pre className="mt-2 text-left bg-muted p-2 rounded overflow-auto max-h-32">
              {this.state.error?.message}
            </pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}
