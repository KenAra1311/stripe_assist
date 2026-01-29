'use client';

type Mode = 'simulation' | 'actual';

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-btn simulation ${mode === 'simulation' ? 'active' : ''}`}
        onClick={() => onChange('simulation')}
      >
        <i className="bi bi-shield-check me-1"></i>
        シミュレーション
      </button>
      <button
        className={`mode-btn actual ${mode === 'actual' ? 'active' : ''}`}
        onClick={() => onChange('actual')}
      >
        <i className="bi bi-lightning-charge me-1"></i>
        実行
      </button>
    </div>
  );
}
