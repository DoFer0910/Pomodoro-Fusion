import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';

export type TimerMode = 'work' | 'break';

export const usePomodoro = (settings: Settings, onWorkComplete: () => void) => {
    const [mode, setMode] = useState<TimerMode>('work');
    const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
    const [isActive, setIsActive] = useState(false);

    // Initialize/Reset timer when settings change or mode changes
    // Note: We only reset if not currently running to avoid disrupting active sessions if settings change background?
    // Actually usually settings change should apply next time or immediately if user saves.
    // For simplicity, we trust the component to call specific reset if needed, but here we sync if not active.
    const getDuration = useCallback((m: TimerMode) => {
        return (m === 'work' ? settings.workDuration : settings.breakDuration) * 60;
    }, [settings]);

    // Reset timer when settings change or mode changes.
    // We remove isActive from dependency array to allow pausing without reset.
    useEffect(() => {
        setTimeLeft(getDuration(mode));
    }, [getDuration, mode]);

    useEffect(() => {
        let interval: number | undefined;

        if (isActive && timeLeft > 0) {
            interval = window.setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (isActive && timeLeft === 0) {
            // Timer finished
            setIsActive(false);
            if (mode === 'work') {
                onWorkComplete();
            }
            // Auto-switch logic could go here, but maybe manual is better for user control?
            // Let's stop and let user switch or start break.
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode, onWorkComplete]);

    const toggleTimer = () => {
        if (!isActive && timeLeft === 0) {
            setTimeLeft(getDuration(mode));
        }
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(getDuration(mode));
    };

    const switchMode = (newMode: TimerMode) => {
        setMode(newMode);
        setIsActive(false);
        // Timer will be updated by the useEffect linked to mode change
        // But since useEffect runs after render, we might see a flash? 
        // Actually setTimeLeft(getDuration(newMode)) here ensures immediate update.
        setTimeLeft(getDuration(newMode));
    };

    return {
        timeLeft,
        isActive,
        mode,
        progress: 1 - (timeLeft / getDuration(mode)),
        toggleTimer,
        resetTimer,
        switchMode
    };
};
