"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ResizeBordersProps {
    enabled: boolean
}

type Direction = 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export function ResizeBorders({ enabled }: ResizeBordersProps) {
    const isResizing = useRef(false)
    const direction = useRef<Direction | null>(null)
    const startPos = useRef({ x: 0, y: 0 })
    const startBounds = useRef({ x: 0, y: 0, width: 0, height: 0 })

    useEffect(() => {
        if (!enabled) return

        const handleMouseMove = async (e: MouseEvent) => {
            if (!isResizing.current || !direction.current) return

            const deltaX = e.screenX - startPos.current.x
            const deltaY = e.screenY - startPos.current.y

            const newBounds = { ...startBounds.current }
            const minWidth = 400
            const minHeight = 300

            // Apply deltas based on direction
            const dir = direction.current

            if (dir.includes('right')) {
                newBounds.width = Math.max(minWidth, startBounds.current.width + deltaX)
            }
            if (dir.includes('bottom')) {
                newBounds.height = Math.max(minHeight, startBounds.current.height + deltaY)
            }
            if (dir.includes('left')) {
                const tentativeWidth = startBounds.current.width - deltaX
                if (tentativeWidth >= minWidth) {
                    newBounds.x = startBounds.current.x + deltaX
                    newBounds.width = tentativeWidth
                }
            }
            if (dir.includes('top')) {
                const tentativeHeight = startBounds.current.height - deltaY
                if (tentativeHeight >= minHeight) {
                    newBounds.y = startBounds.current.y + deltaY
                    newBounds.height = tentativeHeight
                }
            }

            if ((window as any).electron) {
                // Throttle? setBounds is usually fast enough
                await (window as any).electron.setBounds(newBounds)
            }
        }

        const handleMouseUp = () => {
            isResizing.current = false
            direction.current = null
            document.body.style.cursor = 'default'
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }

        const startResize = (e: React.MouseEvent, dir: Direction) => {
            if (!enabled) return
            e.preventDefault()
            e.stopPropagation() // Prevent event bubbling to avoid triggering other things

            isResizing.current = true
            direction.current = dir

            // Capture initial state
            startPos.current = { x: e.screenX, y: e.screenY }
            startBounds.current = {
                x: window.screenX,
                y: window.screenY,
                width: window.outerWidth,
                height: window.outerHeight
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)

            // Set body cursor
            let cursor = 'default'
            if (dir === 'top' || dir === 'bottom') cursor = 'ns-resize'
            else if (dir === 'left' || dir === 'right') cursor = 'ew-resize'
            else if (dir === 'top-left' || dir === 'bottom-right') cursor = 'nwse-resize'
            else if (dir === 'top-right' || dir === 'bottom-left') cursor = 'nesw-resize'

            document.body.style.cursor = cursor
        }

        // Expose startResize to the render function via closure if needed, 
        // but here we attach it directly in JSX
        (window as any).__startResize = startResize

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [enabled])

    if (!enabled) return null

    const handleMouseDown = (e: React.MouseEvent, dir: Direction) => {
        (window as any).__startResize?.(e, dir)
    }

    // Border thickness
    const thickness = "4px"
    const cornerSize = "12px"
    const hoverClass = "hover:bg-primary/30 transition-colors"

    return (
        <div className="fixed inset-0 pointer-events-none z-[60]">
            {/* Edges - using pointer-events-auto to capture clicks */}

            {/* Top */}
            <div
                className={cn("absolute left-0 right-0 top-0 h-1 cursor-ns-resize pointer-events-auto", hoverClass)}
                style={{ height: thickness }}
                onMouseDown={(e) => handleMouseDown(e, 'top')}
            />
            {/* Bottom */}
            <div
                className={cn("absolute left-0 right-0 bottom-0 h-1 cursor-ns-resize pointer-events-auto", hoverClass)}
                style={{ height: thickness }}
                onMouseDown={(e) => handleMouseDown(e, 'bottom')}
            />
            {/* Left */}
            <div
                className={cn("absolute top-0 bottom-0 left-0 w-1 cursor-ew-resize pointer-events-auto", hoverClass)}
                style={{ width: thickness }}
                onMouseDown={(e) => handleMouseDown(e, 'left')}
            />
            {/* Right */}
            <div
                className={cn("absolute top-0 bottom-0 right-0 w-1 cursor-ew-resize pointer-events-auto", hoverClass)}
                style={{ width: thickness }}
                onMouseDown={(e) => handleMouseDown(e, 'right')}
            />

            {/* Corners - Higher Z-Index */}
            {/* Top Left */}
            <div
                className={cn("absolute top-0 left-0 cursor-nwse-resize pointer-events-auto z-10", hoverClass)}
                style={{ width: cornerSize, height: cornerSize }}
                onMouseDown={(e) => handleMouseDown(e, 'top-left')}
            />
            {/* Top Right */}
            <div
                className={cn("absolute top-0 right-0 cursor-nesw-resize pointer-events-auto z-10", hoverClass)}
                style={{ width: cornerSize, height: cornerSize }}
                onMouseDown={(e) => handleMouseDown(e, 'top-right')}
            />
            {/* Bottom Left */}
            <div
                className={cn("absolute bottom-0 left-0 cursor-nesw-resize pointer-events-auto z-10", hoverClass)}
                style={{ width: cornerSize, height: cornerSize }}
                onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
            />
            {/* Bottom Right */}
            <div
                className={cn("absolute bottom-0 right-0 cursor-nwse-resize pointer-events-auto z-10", hoverClass)}
                style={{ width: cornerSize, height: cornerSize }}
                onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
            />
        </div>
    )
}
