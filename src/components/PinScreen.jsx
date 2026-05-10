import { useState, useEffect, useRef } from 'react';
import { getStore, updateStore, hashPin, setStore } from '../store/libraryStore';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function PinScreen({ onUnlock }) {
  const hasPin = !!getStore().pin;

  const [mode, setMode] = useState(hasPin ? 'enter' : 'setup');
  const [digits, setDigits] = useState([]);
  const [tempPin, setTempPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState(0);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const lockoutRef = useRef(null);
  const processPinRef = useRef(null);

  useEffect(() => {
    if (lockout > 0) {
      lockoutRef.current = setInterval(() => {
        setLockout((prev) => {
          if (prev <= 1) {
            clearInterval(lockoutRef.current);
            setAttempts(0);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(lockoutRef.current);
  }, [lockout]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleDigit = (d) => {
    if (lockout > 0 || digits.length >= 4) return;
    const newDigits = [...digits, d];
    setDigits(newDigits);
    setError('');
    if (newDigits.length === 4) {
      setTimeout(() => processPinRef.current(newDigits.join('')), 120);
    }
  };

  const handleBack = () => {
    if (lockout > 0) return;
    setDigits((prev) => prev.slice(0, -1));
  };

  const processPin = (pin) => {
    if (mode === 'setup') {
      setTempPin(pin);
      setDigits([]);
      setMode('confirm');
    } else if (mode === 'confirm') {
      if (pin === tempPin) {
        const hashed = hashPin(pin);
        updateStore({ pin: hashed });
        onUnlock();
      } else {
        triggerShake();
        setDigits([]);
        setTempPin('');
        setMode('setup');
        setError("PINs don't match. Start over.");
      }
    } else {
      const hashed = hashPin(pin);
      const stored = getStore();
      if (hashed === stored.pin) {
        onUnlock();
      } else {
        const next = attempts + 1;
        setAttempts(next);
        triggerShake();
        setDigits([]);
        if (next >= MAX_ATTEMPTS) {
          setLockout(LOCKOUT_SECONDS);
          setError(`Too many attempts. Try again in ${LOCKOUT_SECONDS}s.`);
        } else {
          setError(`Wrong PIN — ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} left.`);
        }
      }
    }
  };

  useEffect(() => {
    processPinRef.current = processPin;
  });

  const handleReset = () => {
    setStore({});
    setMode('setup');
    setDigits([]);
    setTempPin('');
    setAttempts(0);
    setLockout(0);
    setError('');
    setConfirmReset(false);
  };

  const subtitle = {
    setup: 'Set a 4-digit PIN to secure your library',
    confirm: 'Confirm your PIN',
    enter: 'Enter your PIN to continue',
  }[mode];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] px-6">
      <div className="w-full max-w-[320px] flex flex-col items-center gap-8">

        {/* Header */}
        <div className="text-center">
          <div className="text-5xl mb-3 select-none">📚</div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-h)]">
            SR Library
          </h1>
          <p className="text-sm text-[var(--text)] mt-1 leading-snug">{subtitle}</p>
        </div>

        {/* PIN dots */}
        <div className={shake ? 'pin-shake' : ''}>
          <div className="flex gap-5 justify-center">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  i < digits.length
                    ? 'bg-[var(--accent)] border-[var(--accent)] scale-110'
                    : 'bg-transparent border-[var(--border)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Error / lockout */}
        <div className="h-5 text-center -mt-4">
          {lockout > 0 ? (
            <p className="text-sm text-red-500 font-medium">
              Locked — {lockout}s remaining
            </p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : null}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handleDigit(String(n))}
              disabled={lockout > 0}
              className="h-16 rounded-2xl bg-[var(--code-bg)] text-[var(--text-h)] text-xl font-medium
                         flex items-center justify-center select-none
                         transition-all active:scale-90 active:bg-[var(--accent-bg)]
                         hover:bg-[var(--accent-bg)] hover:border hover:border-[var(--accent-border)]
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {n}
            </button>
          ))}

          {/* empty slot */}
          <div />

          <button
            onClick={() => handleDigit('0')}
            disabled={lockout > 0}
            className="h-16 rounded-2xl bg-[var(--code-bg)] text-[var(--text-h)] text-xl font-medium
                       flex items-center justify-center select-none
                       transition-all active:scale-90 active:bg-[var(--accent-bg)]
                       hover:bg-[var(--accent-bg)] hover:border hover:border-[var(--accent-border)]
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            0
          </button>

          <button
            onClick={handleBack}
            disabled={lockout > 0 || digits.length === 0}
            className="h-16 rounded-2xl text-[var(--text)] text-2xl
                       flex items-center justify-center select-none
                       transition-all active:scale-90
                       disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Backspace"
          >
            ⌫
          </button>
        </div>

        {/* Mode hint */}
        {mode === 'enter' && (
          <p className="text-xs text-[var(--text)] opacity-50 text-center">
            PIN is secured with SHA-256
          </p>
        )}

        {/* Reset data */}
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="text-xs text-[var(--text)] opacity-40 hover:opacity-70 transition-opacity underline underline-offset-2 mt-2"
          >
            Clear all local data
          </button>
        ) : (
          <div className="flex flex-col items-center gap-2 mt-2">
            <p className="text-xs text-red-500 font-medium text-center">
              This will erase all data &amp; PIN. Continue?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReset(false)}
                className="px-4 py-1.5 rounded-xl text-xs bg-[var(--code-bg)] text-[var(--text)] hover:opacity-80 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-1.5 rounded-xl text-xs bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Yes, clear all
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
