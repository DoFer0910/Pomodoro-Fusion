import { PomodoroApp } from "@/components/pomodoro-app"
import { ErrorBoundary } from "@/components/error-boundary"

export default function Home() {
  return (
    <ErrorBoundary>
      <PomodoroApp />
    </ErrorBoundary>
  )
}
