import React, { useEffect } from 'react';

interface Props {
    amount: number;
    onComplete: () => void;
}

export const MoneyOverlay: React.FC<Props> = ({ amount, onComplete }) => {
    // If we wanted multiple floating numbers we'd manage a list, but simple is fine.

    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div style={{
            position: 'fixed', inset: 0,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            pointerEvents: 'none', zIndex: 9999
        }}>
            <div style={{
                fontSize: '5rem', fontWeight: 800, color: 'var(--color-accent)',
                textShadow: '0 0 30px var(--color-accent-glow), 0 4px 10px rgba(0,0,0,0.5)',
                animation: 'floatUp 2s ease-out forwards'
            }}>
                + ¥{amount.toLocaleString()}
            </div>
            <style>{`
         @keyframes floatUp {
           0% { transform: translateY(40px) scale(0.5); opacity: 0; }
           15% { transform: translateY(0) scale(1.1); opacity: 1; }
           80% { opacity: 1; }
           100% { transform: translateY(-150px) scale(1); opacity: 0; }
         }
       `}</style>
        </div>
    );
};
