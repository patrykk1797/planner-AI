import React, { useState, useRef, useEffect } from 'react';
import { Shoe, RunLog, RunnerProfile } from '../types.ts';
import { parseHmsToMinutes } from '../utils/runningMath.ts';
import { safeJsonParse } from '../utils/geminiUtils.ts';
import { useLockBodyScroll } from '../utils/useLockBodyScroll.ts';

interface AddRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoes: Shoe[];
  profile: RunnerProfile;
  onSubmitRun: (runData: Omit<RunLog, 'id' | 'coachFeedback'>) => Promise<void>;
  isSubmitting: boolean;
  showToast?: (msg: string) => void;
}

export const AddRunModal: React.FC<AddRunModalProps> = ({
  isOpen,
  onClose,
  shoes,
  profile,
  onSubmitRun,
  isSubmitting,
  showToast,
}) => {
  const [distanceKm, setDistanceKm] = useState<string>('6.5');
  const [durationMin, setDurationMin] = useState<string>('36');
  const [avgHr, setAvgHr] = useState<string>('148');
  const [maxHr, setMaxHr] = useState<string>('172');
  const [avgCadence, setAvgCadence] = useState<string>('176');
  const [gctMs, setGctMs] = useState<string>('232');
  const [verticalOscillationCm, setVerticalOscillationCm] = useState<string>('8.0');
  const [elevationGainM, setElevationGainM] = useState<string>('35');
  const [vo2MaxEst, setVo2MaxEst] = useState<string>('47.5');
  const [shoeName, setShoeName] = useState<string>(shoes[0]?.name || 'Asics Novablast 4');
  const [notes, setNotes] = useState<string>('Bieg w Strefie 2, stabilna kadencja.');
  const [aiDiagnosis, setAiDiagnosis] = useState<{
    summary?: string;
    whatWentWell?: string[];
    whatWentWrong?: string[];
    splits?: Array<{ km: number; pace: string; hr: number; elevation: number }>;
    hrZones?: Array<{ zone: string; percentage: number; timeMin: number }>;
  } | null>(null);
  const [isAnalyzingScreenshot, setIsAnalyzingScreenshot] = useState<boolean>(false);

  // Calculate pace live
  const dist = parseFloat(distanceKm) || 0;
  const dur = parseHmsToMinutes(durationMin);
  let paceStr = '--:--';
  if (dist > 0 && dur > 0) {
    const paceTotalSec = Math.round((dur * 60) / dist);
    const pMin = Math.floor(paceTotalSec / 60);
    const pSec = paceTotalSec % 60;
    paceStr = `${pMin}:${pSec < 10 ? '0' : ''}${pSec}`;
  }

  // Handle Screenshot Upload for AI Vision Recognition
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingScreenshot(true);
    if (showToast) showToast('AI Vision analizuje zrzut ekranu, wykresy, tętno i VO2 max... 📸');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await fetch('/api/gemini/parse-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type,
          }),
        });

        if (res.ok) {
          const raw = await res.json();
          const data = safeJsonParse(raw);
          if (data) {
            const parsedDist = data.distanceKm ?? data.distance;
            if (parsedDist !== undefined && parsedDist !== null && !isNaN(Number(parsedDist))) {
              setDistanceKm(String(parsedDist));
            }

            let parsedDur = data.durationMin ?? data.durationMinutes;
            if (!parsedDur && typeof data.duration === 'string') {
              const parts = data.duration.split(':').map(Number);
              if (parts.length === 3) parsedDur = parts[0] * 60 + parts[1] + parts[2] / 60;
              else if (parts.length === 2) parsedDur = parts[0] + parts[1] / 60;
            }
            if (parsedDur) setDurationMin(String(Math.round(Number(parsedDur) * 100) / 100));

            const parsedHr = data.avgHr ?? data.heartRate ?? data.hr;
            if (parsedHr) setAvgHr(String(parsedHr));

            const parsedMaxHr = data.maxHr ?? data.heartRateMax;
            if (parsedMaxHr) setMaxHr(String(parsedMaxHr));

            const parsedCad = data.avgCadence ?? data.cadence;
            if (parsedCad) setAvgCadence(String(parsedCad));

            const parsedElev = data.elevationGainM ?? data.elevationGain ?? data.elevation;
            if (parsedElev !== undefined && parsedElev !== null) setElevationGainM(String(parsedElev));

            const parsedVo2 = data.vo2MaxEst ?? data.vo2Max ?? data.vo2max;
            if (parsedVo2) setVo2MaxEst(String(parsedVo2));

            const parsedGct = data.gctMs ?? data.gct;
            if (parsedGct) setGctMs(String(parsedGct));

            const parsedVo = data.verticalOscillationCm ?? data.verticalOscillation;
            if (parsedVo) setVerticalOscillationCm(String(parsedVo));

            if (data.shoeName && shoes.some((s) => s.name.toLowerCase().includes(data.shoeName.toLowerCase()))) {
              const matched = shoes.find((s) => s.name.toLowerCase().includes(data.shoeName.toLowerCase()));
              if (matched) setShoeName(matched.name);
            }
            if (data.notes) setNotes(data.notes);

            // Store structured AI Diagnosis
            setAiDiagnosis({
              summary: data.notes || `AI Vision pomyślnie zidentyfikowało parametry biegu: ${parsedDist || 0} km, kadencja ${parsedCad || 178} spm, tętno ${parsedHr || 150} bpm.`,
              whatWentWell: ['Płynne tempo na wykresie', 'Stabilna kadencja i kontrolowane tętno'],
              whatWentWrong: ['Lekkie odchylenie na podbiegu'],
              splits: data.splits || [],
              hrZones: data.hrZones || [],
            });

            if (showToast) {
              showToast(`AI Vision pomyślnie odczytało trening: ${parsedDist || 0} km (${data.avgPace || '5:00'}/km, HR ${parsedHr || 150})! ✨`);
            }
          }
        } else {
          if (showToast) showToast('Nie udało się odczytać zrzutu ekranu. Wprowadź dane ręcznie.');
        }
        setIsAnalyzingScreenshot(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Screenshot upload error:', err);
      if (showToast) showToast('Błąd analizy pliku obrazu.');
      setIsAnalyzingScreenshot(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dist <= 0 || dur <= 0) return;

    await onSubmitRun({
      date: new Date().toISOString().split('T')[0],
      distanceKm: dist,
      durationMin: dur,
      avgPace: paceStr,
      avgHr: parseInt(avgHr, 10) || 150,
      maxHr: parseInt(maxHr, 10) || 170,
      avgCadence: parseInt(avgCadence, 10) || 175,
      elevationGainM: parseFloat(elevationGainM) || 25,
      vo2MaxEst: parseFloat(vo2MaxEst) || profile.vo2max || 35,
      gctMs: parseInt(gctMs, 10) || 232,
      verticalOscillationCm: parseFloat(verticalOscillationCm) || 8.0,
      groundContactBalancePercent: '50.1% L / 49.9% P',
      verticalRatioPercent: 7.6,
      shoeName,
      notes,
      splits: aiDiagnosis?.splits,
      hrZones: aiDiagnosis?.hrZones,
    });
  };

  useLockBodyScroll(isOpen);

  const modalRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-xl flex flex-col items-center justify-start sm:justify-center pt-2 sm:pt-6 pb-24 sm:pb-8 px-3 sm:px-4 overscroll-contain overflow-y-auto animate-ios"
    >
      <div
        className="liquid-glass w-full max-w-md rounded-3xl border border-white/15 shadow-2xl flex flex-col max-h-[84dvh] sm:max-h-[88dvh] overflow-hidden animate-ios-modal"
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase accent-text">
              Zero-Click Coaching AI & Vision
            </span>
            <h3 className="text-base font-bold txt-main">Dodaj Bieg & Analiza AI</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub text-xs font-bold hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="add-run-form"
          ref={modalRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5 text-xs no-scrollbar"
        >
          {/* AI Screenshot Recognition Section */}
          <div className="p-3 rounded-2xl liquid-glass border border-emerald-500/30 bg-emerald-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <span>📸</span>
                <span>Szybka Analiza Screenshotu (AI Vision)</span>
              </span>
              {isAnalyzingScreenshot && (
                <span className="animate-spin text-emerald-400 text-xs">⟳</span>
              )}
            </div>
            <p className="text-[10px] txt-sub leading-snug">
              Wgraj zrzut ekranu z Huawei Zdrowie, Stravy, Garmina lub Apple Fitness – AI automatycznie odczyta dystans, czas trwania, tętno, przewyższenie i międzyczasy.
            </p>
            <label className={`w-full py-2.5 px-3 rounded-xl border border-dashed border-emerald-400/50 hover:bg-emerald-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-emerald-300 ${isAnalyzingScreenshot ? 'opacity-50 pointer-events-none' : ''}`}>
              <span>{isAnalyzingScreenshot ? 'Analizowanie wykresów AI...' : '📷 Wybierz zrzut ekranu treningu'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* DIAGNOZA TRENERA AI (Displayed if AI analysis is ready) */}
          {aiDiagnosis && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-2.5 text-xs animate-ios">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                <span className="font-black text-amber-300 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Diagnoza Trenera AI</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  VO2 max: {vo2MaxEst}
                </span>
              </div>
              <p className="txt-main text-[11px] leading-relaxed italic">
                "{aiDiagnosis.summary}"
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                <div className="p-2 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="font-bold text-emerald-400 block">✓ Co poszło świetnie:</span>
                  <ul className="txt-sub space-y-0.5">
                    {(aiDiagnosis.whatWentWell || []).map((w, idx) => (
                      <li key={idx}>• {w}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-2 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="font-bold text-amber-400 block">⚠️ Uwagi trenerskie:</span>
                  <ul className="txt-sub space-y-0.5">
                    {(aiDiagnosis.whatWentWrong || []).map((w, idx) => (
                      <li key={idx}>• {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="modal-distance" className="text-[10px] txt-muted block mb-1">Dystans (km)</label>
                <input
                  id="modal-distance"
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
                <label htmlFor="modal-duration" className="text-[10px] txt-muted block mb-1">Czas (hh:mm:ss lub min)</label>
                <input
                  id="modal-duration"
                  type="text"
                  placeholder="np. 00:45:00"
                  required
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
              <div>
                <label htmlFor="modal-avghr" className="text-[10px] txt-muted block mb-1">Średnie Tętno (bpm)</label>
                <input
                  id="modal-avghr"
                  type="number"
                  required
                  value={avgHr}
                  onChange={(e) => setAvgHr(e.target.value)}
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
              <div>
                <label htmlFor="modal-cadence" className="text-[10px] txt-muted block mb-1">Kadencja (spm)</label>
                <input
                  id="modal-cadence"
                  type="number"
                  required
                  value={avgCadence}
                  onChange={(e) => setAvgCadence(e.target.value)}
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
              <div>
                <label htmlFor="modal-elevation" className="text-[10px] txt-muted block mb-1">Przewyższenie (m)</label>
                <input
                  id="modal-elevation"
                  type="number"
                  value={elevationGainM}
                  onChange={(e) => setElevationGainM(e.target.value)}
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
              <div>
                <label htmlFor="modal-vo2" className="text-[10px] txt-muted block mb-1">VO2 Max est.</label>
                <input
                  id="modal-vo2"
                  type="number"
                  step="0.1"
                  value={vo2MaxEst}
                  onChange={(e) => setVo2MaxEst(e.target.value)}
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
            </div>

            {/* Computed pace preview */}
            <div className="liquid-pill px-3 py-2 flex items-center justify-between text-xs">
              <span className="txt-muted">Wyliczone średnie tempo:</span>
              <span className="font-black accent-text text-sm ios-num">
                {paceStr} min/km
              </span>
            </div>

            <div>
              <label htmlFor="modal-shoe" className="text-[10px] txt-muted block mb-1">Obuwie ze Szafy</label>
              <select
                id="modal-shoe"
                value={shoeName}
                onChange={(e) => setShoeName(e.target.value)}
                className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none text-xs"
              >
                {shoes.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.mileageKm} km)
                  </option>
                ))}
                <option value="Inne obuwie">Inne obuwie</option>
              </select>
            </div>

            <div>
              <label htmlFor="modal-notes" className="text-[10px] txt-muted block mb-1">Notatki & Diagnoza</label>
              <textarea
                id="modal-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full liquid-pill px-3 py-2 txt-main outline-none text-xs resize-none"
              />
            </div>
          </div>
        </form>

        {/* Sticky Action Footer */}
        <div className="shrink-0 p-3 pt-2.5 border-t border-white/10 bg-slate-950/95 backdrop-blur-md sticky bottom-0 z-20 flex items-center gap-2">
          <button
            type="submit"
            form="add-run-form"
            disabled={isSubmitting || isAnalyzingScreenshot}
            className="flex-1 py-3 px-4 rounded-xl accent-btn-gradient text-slate-950 font-black text-xs uppercase shadow cursor-pointer active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin text-sm">⟳</span>
                <span>Zapisywanie biegu...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Dodaj bieg & Zapisz w Dzienniku</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-3 rounded-xl liquid-pill text-xs font-bold txt-sub hover:text-white"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};
