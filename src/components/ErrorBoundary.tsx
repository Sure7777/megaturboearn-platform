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
        <div className="flex flex-col items-center justify-center min-h-[350px] p-8 text-center bg-[#0d0d0f] text-white rounded-2xl border border-white/10 my-4 shadow-2xl font-['Cairo']">
          <div className="rounded-full bg-[#FFD700]/10 p-4 mb-4 border border-[#FFD700]/20">
            <svg className="h-8 w-8 text-[#FFD700]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-extrabold mb-2 text-[#FFD700]">حدث خطأ غير متوقع</h3>
          <p className="text-sm text-white/70 mb-6 max-w-md leading-relaxed">
            حدث خطأ أثناء تحميل هذا العنصر. يمكنك محاولة العودة أو إعادة تحميل الصفحة.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
              }}
              className="px-5 py-2.5 bg-[#FFD700] text-[#0d0d0f] rounded-xl text-sm font-bold hover:bg-[#FFD700]/90 transition-all cursor-pointer shadow-lg shadow-[#FFD700]/10"
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-all cursor-pointer border border-white/10"
            >
              تحديث الصفحة
            </button>
          </div>
          {this.state.error && (
            <details className="mt-6 text-xs text-white/50 w-full max-w-md text-right">
              <summary className="cursor-pointer hover:text-white/80 transition-colors">تفاصيل الخطأ الفني</summary>
              <pre className="mt-2 text-left bg-[#161618] p-3 rounded-xl border border-white/10 overflow-auto max-h-32 text-amber-200/80 font-mono text-[11px] dir-ltr">
                {this.state.error?.message || String(this.state.error)}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export function DefaultErrorComponent({ error, reset }: { error?: Error; reset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-[#0d0d0f] text-white rounded-2xl border border-white/10 my-8 max-w-lg mx-auto shadow-2xl font-['Cairo']">
      <div className="rounded-full bg-[#FFD700]/10 p-4 mb-4 border border-[#FFD700]/20">
        <svg className="h-8 w-8 text-[#FFD700]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-xl font-black mb-2 text-[#FFD700]">عذراً، حدث خطأ في الصفحة</h3>
      <p className="text-sm text-white/70 mb-6 max-w-md leading-relaxed">
        حدث خطأ أثناء معالجة الطلب. يمكنك إعادة المحاولة أو العودة للصفحة الرئيسية.
      </p>
      <div className="flex items-center justify-center gap-3">
        {reset && (
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-[#FFD700] text-[#0d0d0f] rounded-xl text-sm font-bold hover:bg-[#FFD700]/90 transition-all cursor-pointer shadow-lg shadow-[#FFD700]/10"
          >
            إعادة المحاولة
          </button>
        )}
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-all cursor-pointer border border-white/10"
        >
          تحديث الصفحة
        </button>
      </div>
      {error && (
        <details className="mt-6 text-xs text-white/50 w-full text-right">
          <summary className="cursor-pointer hover:text-white/80 transition-colors">تفاصيل الخطأ</summary>
          <pre className="mt-2 text-left bg-[#161618] p-3 rounded-xl border border-white/10 overflow-auto max-h-32 text-amber-200/80 font-mono text-[11px] dir-ltr">
            {error?.message || String(error)}
          </pre>
        </details>
      )}
    </div>
  )
}

