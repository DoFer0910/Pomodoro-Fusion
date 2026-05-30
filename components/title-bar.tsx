"use client"

import { useState, useEffect } from "react"
import { Minus, Square, X, MonitorPlay } from "lucide-react" // MonitorPlay logic is separate
import { cn } from "@/lib/utils"

interface TitleBarProps {
    className?: string
}

export function TitleBar({ className }: TitleBarProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Only render if we are in Electron and mounted to prevent hydration mismatch
    const isElectron = mounted && typeof window !== 'undefined' && (window as any).electron

    if (!isElectron) return null

    const handleMinimize = () => {
        (window as any).electron.minimize()
    }

    const handleMaximize = () => {
        (window as any).electron.maximize()
    }

    const handleClose = () => {
        (window as any).electron.close()
    }

    return (
        <div className={cn("h-8 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border select-none", className)}>
            {/* Drag Region */}
            <div className="flex-1 h-full app-region-drag flex items-center px-4">
                <span className="text-xs font-medium text-muted-foreground">Yield</span>
            </div>

            {/* Window Controls (No Drag) */}
            <div className="flex items-center h-full app-region-no-drag">
                <button
                    onClick={handleMinimize}
                    className="h-full px-4 hover:bg-muted/50 transition-colors focus:outline-hidden"
                    title="Minimize"
                >
                    <Minus className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full px-4 hover:bg-muted/50 transition-colors focus:outline-hidden"
                    title="Maximize"
                >
                    <Square className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                    onClick={handleClose}
                    className="h-full px-4 hover:bg-red-500/10 hover:text-red-500 transition-colors focus:outline-hidden"
                    title="Close"
                >
                    <X className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                </button>
            </div>
        </div>
    )
}
