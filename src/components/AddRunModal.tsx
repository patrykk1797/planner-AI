import React, { useState } from 'react';
import { Shoe, RunLog, RunnerProfile } from '../types.ts';

interface AddRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoes: Shoe[];
  profile: RunnerProfile;
  onSubmitRun: (runData: Omit<RunLog, 'id' | 'coachFeedback'>) => Promise<void>;
  isSubmitting: boolean;
}

export const AddRunModal: React.FC<AddRunModalProps> = ({
  isOpen,
  onClose,
  shoes,
  profile,
  onSubmitRun,
  isSubmitting,
}) => {
  const [distanceKm, setDistanceKm] = useState<string>('6.5');
  const [durationMin, setDurationMin] = useState<string>('36');
  const [avgHr, setAvgHr] = useState<string>('148');
  const [avgCadence, setAvgCadence] = useState<string>('176');
  const [gctMs, setGctMs] = useState<string>('232');
  const [verticalOscillationCm, setVerticalOscillationCm] = useState<string>('8.0');
  const [shoeName, setShoeName] = useState<string>(shoes[0]?.name || 'Asics Novablast 4');
  const [notes, setNotes] = useState<string>('Bieg w Strefie 2, dobra sprężystość.');

  if (!isOpen) return null;

  // Calculate pace live
  const dist = parseFloat(distanceKm) || 0;
  const dur = parseFloat(durationMin) || 0;
  let paceStr = '--:--';
  if (dist > 0 && dur > 0) {
    const paceTotalSec = Math.round((dur * 60) / dist);
    const pMin = Math.floor(paceTotalSec / 60);
    const pSec = paceTotalSec % 60;
    paceStr = `${pMin}:${pSec < 10 ? '0' : ''}${pSec}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dist <= 0 || dur <= 0) return;

    await onSubmitRun({
      date: new Date().toISOString().split('T')[0],
      distanceKm: dist,
      durationMin: dur,
      avgPace: paceStr,
      avgHr: parseInt(avgHr, 10) || 150,
      avgCadence: parseInt(avgCadence, 10) || 175,
      gctMs: parseInt(gctMs, 10) || 232,
      verticalOscillationCm: parseFloat(verticalOscillationCm) || 8.0,
      groundContactBalancePercent: '50.1% L / 49.9% P',
      verticalRatioPercent: 7.6,
      shoeName,
      notes,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-ios"
    >
      <div className="liquid-glass w-full max-w-sm p-5 space-y-4 animate-ios-modal max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase accent-text">
              Zero-Click Coaching AI
            </span>
            <h3 className="text-base font-bold txt-main">Dodaj Ukończony Bieg</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij formularz"
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub text-xs font-bold hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="text-[11px] txt-sub leading-snug">
          Po zapisaniu, silnik <strong>Zero-Click AI</strong> natychmiast przeanalizuje Twoje tętno ({avgHr} bpm) i kadencję ({avgCadence} spm), dostosowując resztę tygodnia w planie.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="run-distance" className="text-[10px] txt-muted block mb-1">Dystans (km)</label>
              <input
                id="run-distance"
                type="number"
                step="0.01"
                min="0.1"
                required
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
              />
            </div>
            <div>
              <label htmlFor="run-duration" className="text-[10px] txt-muted block mb-1">Czas trwania (minuty)</label>
              <input
                id="run-duration"
                type="number"
                step="0.1"
                min="1"
                required
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
              />
            </div>
            <div>
              <label htmlFor="run-hr" className="text-[10px] txt-muted block mb-1">Średnie Tętno (bpm)</label>
              <input
                id="run-hr"
                type="number"
                required
                value={avgHr}
                onChange={(e) => setAvgHr(e.target.value)}
                className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
              />
            </div>
            <div>
              <label htmlFor="run-cadence" className="text-[10px] txt-muted block mb-1">Średnia Kadencja (spm)</label>
              <input
                id="run-cadence"
                type="number"
                required
                value={avgCadence}
                onChange={(e) => setAvgCadence(e.target.value)}
                className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
              />
            </div>
            <div>
              <label htmlFor="run-gtc" className="text-[10px] txt-muted block mb-1">Czas Kontaktu GTC (ms)</label>
              <input
                id="run-gtc"
                type="number"
                value={gctMs}
                onChange={(e) => setGctMs(e.target.value)}
                className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                placeholder="232"
              />
            </div>
            <div>
              <label htmlFor="run-osc" className="text-[10px] txt-muted block mb-1">Odchylenie Pionowe (cm)</label>
              <input
                id="run-osc"
                type="number"
                step="0.1"
                value={verticalOscillationCm}
                onChange={(e) => setVerticalOscillationCm(e.target.value)}
                className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                placeholder="8.0"
              />
            </div>
          </div>

          {/* Computed pace preview */}
          <div className="liquid-pill px-3 py-2 flex items-center justify-between text-xs">
            <span className="txt-muted">Wyliczone tempo:</span>
            <span className="font-black accent-text text-sm ios-num">
              {paceStr} min/km
            </span>
          </div>

          <div>
            <label className="text-[10px] txt-muted block mb-1">Użyte obuwie ze Szafy</label>
            <select
              value={shoeName}
              onChange={(e) => setShoeName(e.target.value)}
              className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none text-xs"
            >
              {shoes.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.mileageKm}/{s.maxMileageKm} km)
                </option>
              ))}
              <option value="Inne obuwie treningowe">Inne obuwie treningowe</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] txt-muted block mb-1">Odczucia i warunki</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="np. Bieg w lesie, lekki deszcz, wysoki komfort nóg..."
              className="w-full liquid-pill px-3 py-2 txt-main outline-none text-xs resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-full accent-bg text-black font-black text-xs hover:brightness-110 flex items-center justify-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">⟳</span>
                  <span>Zero-Click Coaching w toku...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Zapisz bieg & Przelicz tydzień AI</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
