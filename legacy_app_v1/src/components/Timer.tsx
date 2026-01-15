import React from 'react';
import { usePomodoro } from '../hooks/usePomodoro';
import type { Settings } from '../types';
import { BillableSwitch } from './BillableSwitch';
import { t } from '../utils/i18n';
import { FaPlay, FaPause, FaRedo, FaCoffee, FaBriefcase } from 'react-icons/fa';

interface Props {
    settings: Settings;
    onComplete: (data: { duration: number }) => void;
    isBillable: boolean;
    onChangeBillable: (val: boolean) => void;
}

export const Timer: React.FC<Props> = ({ settings, onComplete, isBillable, onChangeBillable }) => {

    const handleWorkComplete = () => {
        // Play sound?
        onComplete({
            duration: settings.workDuration * 60
        });
    };

    const { timeLeft, isActive, mode, progress, toggleTimer, resetTimer, switchMode } = usePomodoro(
        settings,
        handleWorkComplete
    );

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const strokeDasharray = 283; // 2 * pi * 45
    const strokeDashoffset = strokeDasharray * (1 - progress);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: 'var(--spacing-xl)',
            background: 'var(--color-bg-secondary)',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.05)',
            width: '100%', maxWidth: '400px',
            margin: '0 auto'
        }}>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--spacing-lg)', background: 'var(--color-bg-elevated)', padding: '4px', borderRadius: '12px' }}>
                <button
                    onClick={() => switchMode('work')}
                    style={{
                        padding: '8px 16px', borderRadius: '8px',
                        background: mode === 'work' ? 'var(--color-bg-primary)' : 'transparent',
                        color: mode === 'work' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '0.9rem',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    <FaBriefcase size={14} /> {t('focus', settings.language)}
                </button>
                <button
                    onClick={() => switchMode('break')}
                    style={{
                        padding: '8px 16px', borderRadius: '8px',
                        background: mode === 'break' ? 'var(--color-bg-primary)' : 'transparent',
                        color: mode === 'break' ? 'var(--color-success)' : 'var(--color-text-muted)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '0.9rem',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    <FaCoffee size={14} /> {t('break', settings.language)}
                </button>
            </div>

            {/* Timer Circle */}
            <div style={{ position: 'relative', width: '280px', height: '280px', marginBottom: 'var(--spacing-lg)' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                    {/* Background Circle */}
                    <circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke="var(--color-bg-elevated)"
                        strokeWidth="3"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke={mode === 'work' ? 'var(--color-accent)' : 'var(--color-success)'}
                        strokeWidth="3"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                </svg>

                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        fontFamily: 'monospace', fontSize: '4rem', fontWeight: 700,
                        color: isActive ? (mode === 'work' ? 'var(--color-accent)' : 'var(--color-success)') : 'var(--color-text-muted)',
                        textShadow: isActive ? `0 0 20px ${mode === 'work' ? 'var(--color-accent-glow)' : 'rgba(76,175,80,0.4)'}` : 'none',
                        transition: 'color 0.3s'
                    }}>
                        {formatTime(timeLeft)}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                        {mode === 'work' && (
                            <BillableSwitch
                                isBillable={isBillable}
                                onChange={onChangeBillable}
                                disabled={isActive}
                                language={settings.language}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <button
                    onClick={toggleTimer}
                    style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'var(--color-text-primary)',
                        color: 'var(--color-bg-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem',
                        boxShadow: '0 4px 12px rgba(255,255,255,0.2)',
                        transition: 'transform 0.1s'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {isActive ? <FaPause /> : <FaPlay style={{ marginLeft: '4px' }} />}
                </button>

                <button
                    onClick={resetTimer}
                    style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: 'var(--color-bg-elevated)',
                        color: 'var(--color-text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem',
                        transition: 'all 0.2s'
                    }}
                    title="Reset"
                >
                    <FaRedo />
                </button>
            </div>

        </div>
    );
};
