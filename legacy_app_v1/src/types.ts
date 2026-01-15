export interface Session {
    id: string;
    timestamp: number; // Date.now()
    duration: number; // in seconds
    status: 'completed' | 'interrupted';
    isBillable: boolean; // 収益対象かどうか
}

export interface Settings {
    hourlyRate: number; // JPY
    goalAmount: number; // JPY per month
    workDuration: number; // minutes
    breakDuration: number; // minutes
    language: 'en' | 'ja';
}

export const DEFAULT_SETTINGS: Settings = {
    hourlyRate: 1500,
    goalAmount: 100000,
    workDuration: 25,
    breakDuration: 5,
    language: 'ja',
};
