import { useState, useEffect } from 'react';
import { Timer } from './components/Timer';
import { Stats } from './components/Stats';
import { MoneyOverlay } from './components/MoneyOverlay';
import { SettingsModal } from './components/SettingsModal';
import { loadSessions, saveSession, saveSessions, loadSettings, saveSettings as persistSettings } from './utils/storage';
import type { Session, Settings } from './types';
import { DEFAULT_SETTINGS } from './types';
import { FaCog } from 'react-icons/fa';
import { t } from './utils/i18n';
import './App.css';

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [earnedAmount, setEarnedAmount] = useState<number | null>(null);
  const [isBillable, setIsBillable] = useState(true);

  useEffect(() => {
    setSessions(loadSessions());
    // Load settings or use defaults with language 'ja'
    const s = loadSettings();
    if (s && !s.language) s.language = 'ja'; // Migration for old settings
    setSettings(s || DEFAULT_SETTINGS);
  }, []);

  // Update theme based on Mode (Billable status)
  useEffect(() => {
    const root = document.documentElement;
    if (isBillable) {
      // Gold Theme (Earning Mode)
      root.style.setProperty('--color-accent', '#ffd700');
      root.style.setProperty('--color-accent-glow', 'rgba(255, 215, 0, 0.5)');
    } else {
      // Green Theme (Focus Mode)
      root.style.setProperty('--color-accent', '#39d353');
      root.style.setProperty('--color-accent-glow', 'rgba(57, 211, 83, 0.5)');
    }
  }, [isBillable]);

  const handleSessionComplete = (data: { duration: number }) => {
    if (!settings) return;

    const newSession: Session = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      duration: data.duration,
      status: 'completed',
      isBillable: isBillable
    };

    const updated = saveSession(newSession);
    setSessions(updated);

    if (isBillable) {
      const earnings = (data.duration / 3600) * settings.hourlyRate;
      setEarnedAmount(Math.floor(earnings));
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    saveSessions(updated);
  };

  const handleDeleteSessions = (sessionIds: string[]) => {
    const updated = sessions.filter(s => !sessionIds.includes(s.id));
    setSessions(updated);
    saveSessions(updated);
  };

  const handleSaveSettings = (newSettings: Settings) => {
    persistSettings(newSettings);
    setSettings(newSettings);
  };

  if (!settings) return null; // Loading

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', marginTop: '20px' }}>
        <h1 style={{
          margin: 0,
          fontSize: '1.2rem',
          fontWeight: 800,
          letterSpacing: '2px',
          backgroundImage: isBillable ? 'linear-gradient(to right, #ffd700, #fff)' : 'linear-gradient(to right, #39d353, #fff)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent', // Fallback
          display: 'inline-block' // Ensure background wraps text
        }}>
          {t('title', settings.language)}
        </h1>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            color: 'var(--color-text-secondary)', padding: '8px',
            transition: 'color 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
        >
          <FaCog size={20} />
        </button>
      </header>

      <main style={{ paddingBottom: '40px' }}>
        <Timer
          settings={settings}
          onComplete={handleSessionComplete}
          isBillable={isBillable}
          onChangeBillable={setIsBillable}
        />
        <Stats
          sessions={sessions}
          settings={settings}
          isBillable={isBillable}
          onDeleteSession={handleDeleteSession}
          onDeleteSessions={handleDeleteSessions}
        />
      </main>

      {earnedAmount !== null && (
        <MoneyOverlay
          amount={earnedAmount}
          onComplete={() => setEarnedAmount(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
