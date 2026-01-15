import type { Session, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const STORAGE_KEYS = {
    SESSIONS: 'pomodoro_sessions',
    SETTINGS: 'pomodoro_settings',
};

export const loadSessions = (): Session[] => {
    try {
        const item = localStorage.getItem(STORAGE_KEYS.SESSIONS);
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
};

export const saveSession = (session: Session) => {
    const sessions = loadSessions();
    const updated = [...sessions, session];
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
    return updated;
};

export const saveSessions = (sessions: Session[]) => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    return sessions;
};

export const loadSettings = (): Settings => {
    try {
        const item = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return item ? { ...DEFAULT_SETTINGS, ...JSON.parse(item) } : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
};

export const saveSettings = (settings: Settings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};
