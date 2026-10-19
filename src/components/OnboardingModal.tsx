import React, { useState } from 'react';
import { RunnerProfile, Shoe } from '../types.ts';
import { calculateAge, estimateVO2MaxFrom5k } from '../utils/runningMath.ts';
import { PATRYK_PRESET, BEGINNER_PRESET, CLEAN_PRESET } from '../utils/defaults.ts';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RunnerProfile;
  shoes: Shoe[];
  onSaveProfile: (profile: RunnerProfile) => void;
  onGeneratePlanAI: (customProfile?: RunnerProfile) => Promise<void>;
  showToast: (msg: string) => void;
}

const ALL_DAYS = [
  { short: 'Pon', name: 'Poniedziałek' },
  { short: 'Wt', name: 'Wtorek' },
  { short: 'Śr', name: 'Środa' },
  { short: 'Czw', name: 'Czwartek' },
  { short: 'Pt', name: 'Piątek' },
  { short: 'Sob', name: 'Sobota' },
  { short: 'Niedz', name: 'Niedziela' },
];

const GOAL_OPTIONS = [
  'Sub-25 min na 5 km i redukcja masy',
  'Debiut na 5 km bez zatrzymania',
  '10 km poniżej 50 minut',
  'Półmaraton (21.1 km) poniżej 1h 45m',
  'Maraton (42.2 km) - ukończenie w zdrowiu',
  'Spalanie tłuszczu i strefa tlenowa Z2',
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  profile,
  shoes,
  onSaveProfile,
  onGeneratePlanAI,
  showToast,
}) => {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<RunnerProfile>({ ...profile });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentAge = calculateAge(formData.birthdate);
  const currentVO2 = estimateVO2MaxFrom5k(formData.time5k);

  const handleDayToggle = (dayShort: string) => {
    setFormData((prev) => {
      const exists = prev.selectedDays.includes(dayShort);
      const newDays = exists
        ? prev.selectedDays.filter((d) => d !== dayShort)
        : [...prev.selectedDays, dayShort];
      return { ...prev, selectedDays: newDays };
    });
  };

  const handleFinish = async (generateAI: boolean) => {
    const updated: RunnerProfile = {
      ...formData,
      vo2max: currentVO2,
    };
    onSaveProfile(updated);

    if (generateAI) {
      setIsGenerating(true);
      try {
        await onGeneratePlanAI(updated);
        showToast('Nowy 7-dniowy plan AI wygenerowany pomyślnie! ✨');
      } catch {
        showToast('Plan wygenerowany algorytmicznie.');
      } finally {
        setIsGenerating(false);
        onClose();
      }
    } else {
      showToast('Profil biegacza zaktualizowany! ✅');
      onClose();
    }
  };

  const loadPreset = (preset: RunnerProfile, label: string) => {
    setFormData({ ...preset });
    showToast(`Załadowano preset: ${label}`);
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
              Kalibracja Kondycji AI & API
            </span>
            <h3 className="text-base font-bold txt-main">Kreator Profilu Biegacza</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij kreator"
            className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub text-xs font-bold hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => loadPreset(CLEAN_PRESET, 'Czyste Konto')}
            className="liquid-pill py-1.5 px-2 text-[10px] font-bold txt-sub border border-white/10 hover:text-white hover:bg-white/10"
          >
            🆕 Czyste Konto
          </button>
          <button
            type="button"
            onClick={() => loadPreset(PATRYK_PRESET, 'Patryk')}
            className="liquid-pill py-1.5 px-2 text-[10px] font-bold accent-text accent-soft-border accent-soft-bg hover:brightness-110"
          >
            Profil: Patryk
          </button>
          <button
            type="button"
            onClick={() => loadPreset(BEGINNER_PRESET, 'Debiutant 5K')}
            className="liquid-pill py-1.5 px-2 text-[10px] font-bold txt-sub hover:bg-white/10"
          >
            Debiutant 5K
          </button>
        </div>

        {/* Step dots */}
        <div className="grid grid-cols-4 gap-1.5">
          <div className={`h-1.5 rounded-full ${step >= 1 ? 'accent-bg' : 'liquid-pill'}`}></div>
          <div className={`h-1.5 rounded-full ${step >= 2 ? 'accent-bg' : 'liquid-pill'}`}></div>
          <div className={`h-1.5 rounded-full ${step >= 3 ? 'accent-bg' : 'liquid-pill'}`}></div>
          <div className={`h-1.5 rounded-full ${step >= 4 ? 'accent-bg' : 'liquid-pill'}`}></div>
        </div>

        {/* STEP 1: Biometrics & Birthdate */}
        {step === 1 && (
          <div className="space-y-3 text-xs animate-ios">
            <div className="font-bold txt-main flex items-center justify-between">
              <span>Krok 1/4: Metryka & Data Urodzenia</span>
              <span className="accent-text">Wiek: {currentAge} lat</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] txt-muted block mb-1">Imię</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="np. Patryk"
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] txt-muted block mb-1">Miasto bazowe (GPS)</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="np. Zgierz"
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] txt-muted block mb-1">Płeć</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                >
                  <option value="M">Mężczyzna</option>
                  <option value="F">Kobieta</option>
                  <option value="Other">Inna</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] txt-muted block mb-1">Data Urodzenia (DD.MM.RRRR)</label>
                <input
                  type="text"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                  placeholder="14.05.1995"
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] txt-muted block mb-1">Waga aktualna (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 70 })}
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] txt-muted block mb-1">Waga docelowa (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.targetWeight}
                  onChange={(e) => setFormData({ ...formData, targetWeight: parseFloat(e.target.value) || 68 })}
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Running baseline & Training Days */}
        {step === 2 && (
          <div className="space-y-3 text-xs animate-ios">
            <div className="font-bold txt-main flex items-center justify-between">
              <span>Krok 2/4: Kondycja & Harmonogram Dni</span>
              <span className="accent-text">VO2max: ~{currentVO2}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] txt-muted block mb-1">Kilometraż (km/tydz.)</label>
                <input
                  type="number"
                  value={formData.weeklyKm}
                  onChange={(e) => setFormData({ ...formData, weeklyKm: parseInt(e.target.value, 10) || 20 })}
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] txt-muted block mb-1">Czas na 5 km (mm:ss)</label>
                <input
                  type="text"
                  value={formData.time5k}
                  onChange={(e) => setFormData({ ...formData, time5k: e.target.value })}
                  placeholder="26:43"
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] txt-muted block mb-1">Tętno Max (HRmax)</label>
                <input
                  type="number"
                  value={formData.hrMax}
                  onChange={(e) => setFormData({ ...formData, hrMax: parseInt(e.target.value, 10) || 185 })}
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] txt-muted block mb-1">Tętno Spoczynkowe (RHR)</label>
                <input
                  type="number"
                  value={formData.rhr}
                  onChange={(e) => setFormData({ ...formData, rhr: parseInt(e.target.value, 10) || 60 })}
                  className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] txt-muted block mb-1.5">
                Zaznacz dni treningowe w tygodniu (AI zaplanuje odpoczynek w pozostałe):
              </label>
              <div className="grid grid-cols-7 gap-1">
                {ALL_DAYS.map((d) => {
                  const isChecked = formData.selectedDays.includes(d.short);
                  return (
                    <button
                      key={d.short}
                      type="button"
                      onClick={() => handleDayToggle(d.short)}
                      className={`py-2 text-[10px] font-bold rounded-lg transition-all ${
                        isChecked ? 'accent-bg text-black font-black' : 'liquid-pill txt-sub hover:text-white'
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Goal & Shoe selection */}
        {step === 3 && (
          <div className="space-y-3 text-xs animate-ios">
            <div className="font-bold txt-main">Krok 3/4: Cel i Główne Obuwie</div>
            <div>
              <label className="text-[10px] txt-muted block mb-1">Wybierz cel biegowy</label>
              <select
                value={formData.targetGoal}
                onChange={(e) => setFormData({ ...formData, targetGoal: e.target.value })}
                className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none text-xs"
              >
                {GOAL_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] txt-muted block mb-1">Główny model buta na treningi</label>
              <select
                value={formData.selectedShoeId}
                onChange={(e) => setFormData({ ...formData, selectedShoeId: e.target.value })}
                className="w-full liquid-pill px-3 py-2 txt-main font-bold outline-none text-xs"
              >
                {shoes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.dropMm} mm drop, {s.cushion.slice(0, 25)}...)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* STEP 4: Summary & Generate AI Plan */}
        {step === 4 && (
          <div className="space-y-3 text-xs animate-ios">
            <div className="font-bold txt-main">Krok 4/4: Podsumowanie Danych Biegacza</div>
            <div className="liquid-pill p-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="txt-muted">Zawodnik:</span>
                <span className="font-bold txt-main">
                  {formData.name} ({currentAge} lat, {formData.weight} kg)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="txt-muted">Kondycja & VO2:</span>
                <span className="font-bold accent-text">
                  5K w {formData.time5k} • VO2max {currentVO2}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="txt-muted">Dni biegania:</span>
                <span className="font-bold txt-main">
                  {formData.selectedDays.join(', ') || 'Brak'} ({formData.weeklyKm} km/tydz.)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="txt-muted">Tętno:</span>
                <span className="font-bold txt-main">
                  HRmax {formData.hrMax} bpm • RHR {formData.rhr} bpm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="txt-muted">Cel:</span>
                <span className="font-bold txt-main truncate max-w-[180px]">{formData.targetGoal}</span>
              </div>
            </div>

            <p className="text-[10px] txt-muted leading-relaxed">
              Kliknięcie <strong>✨ Zakończ i Generuj Plan AI</strong> prześle powyższą telemetrię do silnika Gemini 3 Flash, generując spersonalizowany 7-dniowy mikrocykl.
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="py-2.5 px-4 rounded-full liquid-pill font-bold text-xs txt-sub hover:text-white"
            >
              Wróć
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex-1 py-2.5 rounded-full liquid-active font-bold text-xs"
            >
              Dalej ›
            </button>
          ) : (
            <div className="flex-1 flex gap-2">
              <button
                type="button"
                onClick={() => handleFinish(false)}
                className="py-2.5 px-3 rounded-full liquid-pill font-bold text-xs txt-sub hover:text-white"
              >
                Tylko Zapisz
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleFinish(true)}
                className="flex-1 py-2.5 rounded-full accent-bg text-black font-black text-xs hover:brightness-110 flex items-center justify-center gap-1 shadow-lg"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin text-sm">⟳</span>
                    <span>Generowanie AI...</span>
                  </>
                ) : (
                  <span>✨ Generuj Plan AI</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
