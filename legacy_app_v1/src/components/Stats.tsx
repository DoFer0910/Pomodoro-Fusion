import React, { useMemo, useState } from 'react';
import type { Session, Settings } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { t } from '../utils/i18n';
import { FaTrash, FaCheckSquare, FaRegSquare } from 'react-icons/fa';

interface Props {
    sessions: Session[];
    settings: Settings;
    isBillable: boolean;
    onDeleteSession: (sessionId: string) => void;
    onDeleteSessions: (sessionIds: string[]) => void;
}

export const Stats: React.FC<Props> = ({ sessions, settings, isBillable, onDeleteSession, onDeleteSessions }) => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);
    const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

    // Calculate stats
    const { displayValue, displayLabel, displayUnit, monthProgress, goalLabel, remainingText, monthSessions } = useMemo(() => {
        // Filter sessions for current month
        const mSessions = sessions.filter(s =>
            s.timestamp >= currentMonthStart.getTime() &&
            s.timestamp <= currentMonthEnd.getTime()
        );

        if (isBillable) {
            // Money Mode
            const billableSeconds = mSessions
                .filter(s => s.isBillable && s.status === 'completed')
                .reduce((acc, s) => acc + s.duration, 0);

            const earnings = (billableSeconds / 3600) * settings.hourlyRate;
            const progress = Math.min((earnings / settings.goalAmount) * 100, 100);

            // Calculate remaining
            const remainingAmount = Math.max(0, settings.goalAmount - earnings);
            const remainingHours = remainingAmount / settings.hourlyRate;
            const remainingLabel = remainingAmount <= 0
                ? t('goalReached', settings.language)
                : `${t('remaining', settings.language)}${remainingHours.toFixed(1)}h`;

            return {
                displayValue: Math.floor(earnings).toLocaleString(),
                displayLabel: t('earnings', settings.language),
                displayUnit: '¥',
                monthProgress: progress,
                goalLabel: `Goal: ¥${settings.goalAmount.toLocaleString()}`,
                remainingText: remainingLabel,
                monthSessions: mSessions
            };
        } else {
            // Time Mode (Non-billable / Focus)
            const totalSeconds = mSessions
                .filter(s => s.status === 'completed')
                .reduce((acc, s) => acc + s.duration, 0);

            const hours = totalSeconds / 3600;

            return {
                displayValue: hours.toFixed(1),
                displayLabel: t('hours', settings.language),
                displayUnit: 'h',
                monthProgress: 0,
                goalLabel: '',
                remainingText: '',
                monthSessions: mSessions
            };
        }
    }, [sessions, settings, currentMonthStart, currentMonthEnd, isBillable]);

    // Calendar Logic
    const calendarDays = useMemo(() => {
        // Get all days to display (including padding for start of week)
        const start = startOfWeek(currentMonthStart);
        const end = endOfWeek(currentMonthEnd);
        return eachDayOfInterval({ start, end });
    }, [currentMonthStart, currentMonthEnd]);

    const getIntensity = (day: Date) => {
        const daySessions = sessions.filter(s => isSameDay(new Date(s.timestamp), day) && s.status === 'completed');
        const totalDuration = daySessions.reduce((acc, s) => acc + s.duration, 0); // seconds
        const minutes = totalDuration / 60;

        if (minutes === 0) return 0;
        if (minutes < 25) return 1;
        if (minutes < 100) return 2;
        if (minutes < 200) return 3;
        return 4;
    };

    const getCellColor = (intensity: number) => {
        if (intensity === 0) return 'var(--color-bg-elevated)';

        if (isBillable) {
            // Gold Theme
            switch (intensity) {
                case 1: return '#665c00'; // Dark Gold
                case 2: return '#998a00';
                case 3: return '#cca800';
                case 4: return '#ffd700'; // Bright Gold
                default: return 'var(--color-bg-elevated)';
            }
        } else {
            // Green Theme (Standard GitHub)
            switch (intensity) {
                case 1: return '#0e4429';
                case 2: return '#006d32';
                case 3: return '#26a641';
                case 4: return '#39d353';
                default: return 'var(--color-bg-elevated)';
            }
        }
    };

    const sortedHistory = useMemo(() => {
        return [...monthSessions].sort((a, b) => b.timestamp - a.timestamp);
    }, [monthSessions]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedSessionIds(sortedHistory.map(s => s.id));
        } else {
            setSelectedSessionIds([]);
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedSessionIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        if (window.confirm(`${t('deleteSelected', settings.language)}? (${selectedSessionIds.length})`)) {
            onDeleteSessions(selectedSessionIds);
            setSelectedSessionIds([]);
        }
    };

    return (
        <div style={{
            marginTop: 'var(--spacing-2xl)',
            width: '100%', maxWidth: '800px',
            margin: '48px auto',
            padding: 'var(--spacing-lg)',
            background: 'var(--color-bg-secondary)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            {/* Header Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        {format(today, 'MMMM yyyy')} {displayLabel}
                    </h2>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-accent)', lineHeight: 1.2 }}>
                        {displayUnit}{displayValue}
                    </div>
                    {isBillable && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {goalLabel}
                        </div>
                    )}
                </div>
                {/* Progress Bar */}
                {isBillable && (
                    <div style={{ width: '200px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--color-text-muted)' }}>
                            <span>{t('progress', settings.language)}</span>
                            <span>{Math.round(monthProgress)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--color-bg-elevated)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                            <div style={{
                                width: `${monthProgress}%`,
                                height: '100%',
                                background: 'var(--color-accent)',
                                transition: 'width 0.5s ease'
                            }} />
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#ffd700', fontWeight: 600 }}>
                            {remainingText}
                        </div>
                    </div>
                )}
            </div>

            {/* Calendar Grid */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{d}</div>
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {calendarDays.map((day, idx) => {
                        const intensity = getIntensity(day);
                        const isCurrentMonth = day.getMonth() === today.getMonth();
                        return (
                            <div
                                key={idx}
                                title={`${format(day, 'yyyy-MM-dd')}: Level ${intensity}`}
                                style={{
                                    aspectRatio: '1',
                                    background: getCellColor(intensity),
                                    borderRadius: '4px',
                                    opacity: isCurrentMonth ? 1 : 0.3,
                                    transition: 'transform 0.2s',
                                    cursor: 'default'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            />
                        );
                    })}
                </div>
            </div>

            {/* History List */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-bg-elevated)', paddingBottom: '8px' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                        {t('history', settings.language)}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {sortedHistory.length > 0 && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedSessionIds.length === sortedHistory.length && sortedHistory.length > 0}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    style={{ cursor: 'pointer' }}
                                />
                                {t('selectAll', settings.language)}
                            </label>
                        )}
                        {selectedSessionIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                style={{
                                    background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: '4px',
                                    padding: '4px 12px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <FaTrash size={12} /> {t('deleteSelected', settings.language)}
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                    {sortedHistory.length === 0 ? (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', padding: '8px 0' }}>No sessions yet.</div>
                    ) : sortedHistory.map(session => (
                        <div key={session.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px', background: 'var(--color-bg-elevated)', borderRadius: '8px',
                            border: selectedSessionIds.includes(session.id) ? '1px solid var(--color-accent)' : '1px solid transparent'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedSessionIds.includes(session.id)}
                                    onChange={() => handleToggleSelect(session.id)}
                                    style={{ cursor: 'pointer' }}
                                />
                                <div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                        {format(new Date(session.timestamp), 'MM/dd HH:mm')}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        {Math.round(session.duration / 60)} min
                                        {session.isBillable && (
                                            <span style={{ marginLeft: '8px', color: '#ffd700' }}>
                                                (+¥{Math.floor((session.duration / 3600) * settings.hourlyRate).toLocaleString()})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (window.confirm(t('delete', settings.language) + '?')) {
                                        onDeleteSession(session.id);
                                    }
                                }}
                                style={{
                                    background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer',
                                    padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                title={t('delete', settings.language)}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4d4f'; e.currentTarget.style.background = 'rgba(255, 77, 79, 0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                            >
                                <FaTrash />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
