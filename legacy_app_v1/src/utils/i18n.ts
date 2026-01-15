export type Language = 'en' | 'ja';

export const translations = {
    en: {
        focus: 'Focus',
        break: 'Break',
        billable: 'BILLABLE',
        off: 'OFF',
        hourlyRate: 'Hourly Rate (JPY)',
        monthlyGoal: 'Monthly Goal (JPY)',
        workDuration: 'Work (min)',
        breakDuration: 'Break (min)',
        language: 'Language',
        save: 'Save',
        cancel: 'Cancel',
        settings: 'Settings',
        earnings: 'Earnings',
        hours: 'Hours',
        goal: 'Goal',
        progress: 'Progress',
        title: 'POMODORO FUSION',
        remaining: 'Remaining: ',
        goalReached: 'Goal Reached!',
        history: 'History',
        delete: 'Delete',
        deleteSelected: 'Delete Selected',
        selectAll: 'Select All',
    },
    ja: {
        focus: '集中',
        break: '休憩',
        billable: '稼ぐ',
        off: '没頭',
        hourlyRate: '時給 (円)',
        monthlyGoal: '月間目標 (円)',
        workDuration: '作業時間 (分)',
        breakDuration: '休憩時間 (分)',
        language: '言語',
        save: '保存',
        cancel: 'キャンセル',
        settings: '設定',
        earnings: '今月の収益',
        hours: '作業時間',
        goal: '目標',
        progress: '達成率',
        title: 'ポモドーロ・フュージョン',
        remaining: 'あと ',
        goalReached: '目標達成！',
        history: '作業履歴',
        delete: '削除',
        deleteSelected: '選択した項目を削除',
        selectAll: 'すべて選択',
    }
};

export const t = (key: keyof typeof translations['en'], lang: Language): string => {
    return translations[lang][key] || translations['en'][key];
};
