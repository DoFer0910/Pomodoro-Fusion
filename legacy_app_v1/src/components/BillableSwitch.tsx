import React from 'react';

interface Props {
    isBillable: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
    language: 'en' | 'ja';
}

export const BillableSwitch: React.FC<Props> = ({ isBillable, onChange, disabled, language }) => {
    // Determine labels based on language
    const labelBillable = language === 'ja' ? '稼ぐ' : 'BILLABLE';
    const labelOff = language === 'ja' ? '没頭' : 'OFF';

    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, userSelect: 'none' }}>
            <input
                type="checkbox"
                checked={isBillable}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                style={{ display: 'none' }}
            />
            <div style={{
                width: '48px', height: '28px',
                background: isBillable ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                borderRadius: '99px',
                position: 'relative',
                transition: 'background var(--transition-normal)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
            }}>
                <div style={{
                    position: 'absolute',
                    left: isBillable ? '22px' : '2px',
                    top: '2px',
                    width: '24px', height: '24px',
                    borderRadius: '50%',
                    background: isBillable ? '#000' : '#fff',
                    transition: 'left var(--transition-normal), background var(--transition-fast)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }} />
            </div>
            <span style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: isBillable ? 'var(--color-accent)' : 'var(--color-text-muted)',
                transition: 'color var(--transition-fast)'
            }}>
                {isBillable ? labelBillable : labelOff}
            </span>
        </label>
    );
};
