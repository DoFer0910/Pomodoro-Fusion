"use client"

import React from "react"

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

/**
 * エラーバウンダリ: キャッチされない例外でアプリ全体がクラッシュするのを防ぐ。
 * エラー発生時にフォールバックUIを表示し、リロードで復帰可能にする。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[ErrorBoundary] キャッチされたエラー:", error, errorInfo)
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null })
        window.location.reload()
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-8">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="text-6xl">⚠️</div>
                        <h2 className="text-xl font-bold text-foreground">
                            エラーが発生しました
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            予期しないエラーが発生しました。再試行またはリロードしてください。
                        </p>
                        {this.state.error && (
                            <details className="text-left text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                                <summary className="cursor-pointer font-medium">詳細</summary>
                                <pre className="mt-2 whitespace-pre-wrap break-words">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                            >
                                再試行
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors text-sm font-medium"
                            >
                                リロード
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
