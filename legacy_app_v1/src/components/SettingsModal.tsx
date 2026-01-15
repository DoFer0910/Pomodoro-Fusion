import React, { useState } from 'react';
import type { Settings } from '../types';
import { t } from '../utils/i18n';

interface Props {
    settings: Settings;
    onSave: (s: Settings) => void;
    onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ settings, onSave, onClose }) => {
    const [formData, setFormData] = useState(settings);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-bg-elevated)',
        color: 'var(--color-text-primary)',
        borderRadius: '8px',
        marginTop: '6px',
        fontSize: '1rem'
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            animation: 'fadeIn 0.2s ease'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--color-bg-secondary)', padding: '32px', borderRadius: '24px',
                width: '400px', maxWidth: '90%',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)'
            }} onClick={e => e.stopPropagation()}>
                <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '1.5rem' }}>{t('settings', settings.language)}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                        {t('language', settings.language)}
                        <select
                            value={formData.language}
                            onChange={e => setFormData({ ...formData, language: e.target.value as 'en' | 'ja' })}
                            style={inputStyle}
                        >
                            <option value="en">English</option>
                            <option value="ja">日本語</option>
                        </select>
                    </label>

                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                        {t('hourlyRate', settings.language)}
                        <input
                            type="number"
                            value={formData.hourlyRate}
                            onChange={e => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                            style={inputStyle}
                        />
                    </label>

                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                        {t('monthlyGoal', settings.language)}
                        <input
                            type="number"
                            value={formData.goalAmount}
                            onChange={e => setFormData({ ...formData, goalAmount: Number(e.target.value) })}
                            style={inputStyle}
                        />
                    </label>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-secondary)', flex: 1 }}>
                            {t('workDuration', settings.language)}
                            <input
                                type="number"
                                value={formData.workDuration}
                                onChange={e => setFormData({ ...formData, workDuration: Number(e.target.value) })}
                                style={inputStyle}
                            />
                        </label>

                        <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text-secondary)', flex: 1 }}>
                            {t('breakDuration', settings.language)}
                            <input
                                type="number"
                                value={formData.breakDuration}
                                onChange={e => setFormData({ ...formData, breakDuration: Number(e.target.value) })}
                                style={inputStyle}
                            />
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} style={{ padding: '12px 20px', color: 'var(--color-text-muted)' }}>{t('cancel', settings.language)}</button>
                        <button type="submit" style={{
                            padding: '12px 32px',
                            background: 'var(--color-accent)',
                            color: 'black',
                            borderRadius: '12px',
                            fontWeight: 600,
                            transition: 'transform 0.1s'
                        }}>{t('save', settings.language)}</button>
                    </div>
                </form>
            </div>
            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
        </div>
    );
};
