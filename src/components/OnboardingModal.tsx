import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Check,
  RotateCcw,
  User,
  Target,
  Activity,
  Footprints,
  Flag,
  Mountain,
  Heart,
  Timer,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Flame,
  Award
} from 'lucide-react';
import { RunnerProfile, Shoe } from '../types.ts';
import {
  calculateAge,
  calculateAgeCategory,
  calculateJackDanielsVdot,
  timeStringToSeconds,
} from '../utils/physiologicalEngine.ts';
import { CLEAN_PRESET } from '../utils/defaults.ts';
import { useLockBodyScroll } from '../utils/useLockBodyScroll.ts';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstRun?: boolean;
  profile: RunnerProfile;
  shoes?: Shoe[];
  onSaveProfile: (profile: RunnerProfile, firstShoe?: Shoe) => void;
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

const SHOE_CATALOG = [
  { name: 'Asics Novablast 4', brand: 'Asics', dropMm: 8, cushion: 'Maksymalna (FF Blast+ ECO)', footType: 'Neutralna' as const },
  { name: 'Nike Pegasus 41', brand: 'Nike', dropMm: 10, cushion: 'Średnia (ReactX + Zoom Air)', footType: 'Neutralna' as const },
  { name: 'Saucony Endorphin Speed 4', brand: 'Saucony', dropMm: 8, cushion: 'Sprężysta (PWRRUN PB)', footType: 'Neutralna' as const },
  { name: 'Hoka Clifton 9', brand: 'Hoka', dropMm: 5, cushion: 'Maksymalna (CMEVA)', footType: 'Neutralna' as const },
  { name: 'Puma Deviate Nitro 2', brand: 'Puma', dropMm: 6, cushion: 'Dynamiczna + Carbon (Nitro Elite)', footType: 'Neutralna' as const },
  { name: 'Adidas Boston 12', brand: 'Adidas', dropMm: 6.5, cushion: 'Treningowo-startowa (Lightstrike Pro)', footType: 'Neutralna' as const },
  { name: 'Asics Gel-Kayano 30', brand: 'Asics', dropMm: 10, cushion: 'Wsparcie Pronacji (4D Guidance)', footType: 'Pronująca' as const },
];

const GOAL_OPTIONS = [
  { id: 'fitness', title: 'Ogólna kondycja i redukcja wagi', desc: 'Spalanie tłuszczu, regularność i zdrowie serca w Strefie 2' },
  { id: 'sub25_5k', title: 'Sub-25 min na 5 km', desc: 'Budowa tempa progowego i szybkości z mocnym finiszem' },
  { id: 'sub50_10k', title: 'Ukończenie 10 km (Sub-50 min)', desc: 'Ekonomia biegu i wydłużenie dystansu w komforcie tlenowym' },
  { id: 'sub2h_half', title: 'Półmaraton (21.1 km) poniżej 2h', desc: 'Wytrzymałość tempowa, długie wybiegania i strategia żywieniowa' },
  { id: 'marathon', title: 'Maraton (42.2 km)', desc: 'Solidny fundament objętościowy, periodyzacja i tapering startowy' },
  { id: 'trail', title: 'Biegi Górskie & Trail', desc: 'Przewyższenia, siła biegowa na podbiegach i stabilność stawów' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  isFirstRun = false,
  profile,
  onSaveProfile,
  onGeneratePlanAI,
  showToast,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Form State - empty by default for real user onboarding
  const [name, setName] = useState<string>(profile.name || '');
  const [gender, setGender] = useState<'M' | 'F' | 'Other'>(profile.gender || 'M');
  const [birthdate, setBirthdate] = useState<string>(profile.birthdate || '');
  const [heightStr, setHeightStr] = useState<string>(profile.height ? String(profile.height) : '');
  const [weightStr, setWeightStr] = useState<string>(profile.weight ? String(profile.weight) : '');
  const [targetWeightStr, setTargetWeightStr] = useState<string>(profile.targetWeight ? String(profile.targetWeight) : '');

  // Step 2: Experience & Physiology
  const [experience, setExperience] = useState<string>(profile.runningExperience || '1-3 lata regularnego biegania');
  const [fitnessTestMode, setFitnessTestMode] = useState<'5k' | 'cooper'>('5k');
  const [time5kStr, setTime5kStr] = useState<string>(profile.time5k || '');
  const [cooperMeters, setCooperMeters] = useState<number>(profile.cooperTestDistanceMeters || 2200);
  const [hrMaxStr, setHrMaxStr] = useState<string>(profile.hrMax ? String(profile.hrMax) : '');
  const [rhrStr, setRhrStr] = useState<string>(profile.rhr ? String(profile.rhr) : '');

  // Step 3: Shoes, Foot, Injury, Cadence
  const [selectedShoeCatalogName, setSelectedShoeCatalogName] = useState<string>('Asics Novablast 4');
  const [customShoeName, setCustomShoeName] = useState<string>('');
  const [footType, setFootType] = useState<'Neutralna' | 'Pronująca' | 'Supinująca'>('Neutralna');
  const [injuryProne, setInjuryProne] = useState<string>('Brak kontuzji');
  const [cadence, setCadence] = useState<number>(profile.currentCadence || 172);

  // Step 4: Goals & Days
  const [selectedGoal, setSelectedGoal] = useState<string>(profile.targetGoal || 'Sub-25 min na 5 km');
  const [customGoalText, setCustomGoalText] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<string[]>(
    profile.selectedDays && profile.selectedDays.length > 0 ? profile.selectedDays : ['Wt', 'Czw', 'Sob', 'Niedz']
  );
  // Dynamic live calculations
  const age = calculateAge(birthdate);
  const ageCategory = calculateAgeCategory(gender, birthdate);

  const numWeight = parseFloat(weightStr.replace(',', '.')) || 70;
  const numTargetWeight = parseFloat(targetWeightStr.replace(',', '.')) || 68;
  const numHeight = parseFloat(heightStr.replace(',', '.')) || 178;
  const bmi = numHeight > 0 ? (numWeight / Math.pow(numHeight / 100, 2)).toFixed(1) : '22.8';

  const numHrMax = parseInt(hrMaxStr, 10) || 185;
  const numRhr = parseInt(rhrStr, 10) || 60;
  const hrr = Math.max(20, numHrMax - numRhr);
  const z2Min = Math.round(numRhr + hrr * 0.6);
  const z2Max = Math.round(numRhr + hrr * 0.7);

  // Dynamic VDOT
  const effective5kSec =
    fitnessTestMode === '5k'
      ? timeStringToSeconds(time5kStr) || 1600
      : Math.round((5000 / Math.max(1000, cooperMeters)) * 720); // 12 min Cooper extrapolated
  const dynamicVdot = calculateJackDanielsVdot(5000, effective5kSec);

  const handleDayToggle = (dayShort: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayShort)
        ? prev.length > 1
          ? prev.filter((d) => d !== dayShort)
          : prev
        : [...prev, dayShort]
    );
  };

  const handleTanakaHrMax = () => {
    // Tanaka formula: 208 - 0.7 * age
    const tanaka = Math.round(208 - 0.7 * age);
    setHrMaxStr(String(tanaka));
    showToast(`Ustawiono HRmax wg wzoru Tanaka: ${tanaka} bpm`);
  };

  const handleFinish = async (generateAI: boolean) => {
    const finalShoeName = customShoeName.trim() || selectedShoeCatalogName;
    const finalGoal = customGoalText.trim() || selectedGoal;

    const catalogShoe = SHOE_CATALOG.find((s) => s.name === finalShoeName);
    const newShoeObj: Shoe = {
      id: `shoe-${Date.now()}`,
      name: finalShoeName,
      brand: catalogShoe?.brand || 'Własna Marka',
      dropMm: catalogShoe?.dropMm || 8,
      mileageKm: 0,
      maxMileageKm: 800,
      weightG: 260,
      cushion: catalogShoe?.cushion || 'Standardowa pianka treningowa',
      footType,
      idealFor: 'Treningi codzienne i wybiegania',
      energyReturn: 7,
      cushionRating: 8,
      stabilityRating: footType === 'Pronująca' ? 9 : 7,
    };

    const updatedProfile: RunnerProfile = {
      ...profile,
      name: name.trim() || 'Biegacz',
      gender,
      birthdate,
      height: numHeight,
      weight: numWeight,
      targetWeight: numTargetWeight,
      runningExperience: experience,
      time5k: fitnessTestMode === '5k' ? time5kStr : `${Math.floor(effective5kSec / 60)}:${(effective5kSec % 60).toString().padStart(2, '0')}`,
      cooperTestDistanceMeters: cooperMeters,
      hrMax: numHrMax,
      rhr: numRhr,
      vo2max: dynamicVdot,
      footType,
      injuryProne,
      currentCadence: cadence,
      selectedShoeName: finalShoeName,
      selectedShoeId: newShoeObj.id,
      targetGoal: finalGoal,
      selectedDays,
      weeklyKm: Math.round(selectedDays.length * 7.5),
      bamboos: Math.max(50, profile.bamboos || 50),
      levelXp: Math.max(100, profile.levelXp || 100),
      activePandaGear: profile.activePandaGear || {
        gear: 'Czapeczka Biegowa',
        skin: 'Klasyczna Panda',
        bg: 'Park Miejski',
      },
      coachTone: profile.coachTone || 'naukowy',
      accentColor: profile.accentColor || 'orange',
      theme: profile.theme || 'dark',
    };

    // Save to localStorage as treda_user_profile
    localStorage.setItem('treda_user_profile', JSON.stringify(updatedProfile));
    localStorage.setItem('runner_profile_v2', JSON.stringify(updatedProfile));

    onSaveProfile(updatedProfile, newShoeObj);

    if (generateAI) {
      setIsGenerating(true);
      try {
        await onGeneratePlanAI(updatedProfile);
        showToast('Plan treningowy AI (@google/genai) wygenerowany pomyślnie!');
      } catch {
        showToast('Plan wygenerowany algorytmicznie.');
      } finally {
        setIsGenerating(false);
        onClose();
      }
    } else {
      showToast('Witaj w TREDA Running! Twój profil jest gotowy.');
      onClose();
    }
  };

  const resetToCleanForm = () => {
    setName('');
    setGender('M');
    setBirthdate('');
    setHeightStr('');
    setWeightStr('');
    setTargetWeightStr('');
    setTime5kStr('');
    setHrMaxStr('');
    setRhrStr('');
    setSelectedGoal(GOAL_OPTIONS[0].title);
    setSelectedDays(['Wt', 'Czw', 'Sob']);
    showToast('Wyczyszczono formularz');
  };

  useLockBodyScroll(isOpen);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [isOpen, step]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-4 overscroll-contain h-[100dvh] w-screen animate-ios overflow-y-auto"
    >
      <div
        ref={modalRef}
        className="liquid-glass w-full max-w-lg p-5 space-y-4 animate-ios-modal max-h-[90dvh] overflow-y-auto no-scrollbar border border-white/15 shadow-2xl my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 text-slate-950 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                TREDA Running • Kreator Rozruchu (Krok {step} z 4)
              </span>
              <h2 className="text-base font-black txt-main">
                {step === 1 && '1. Dane Biometryczne & Wiek'}
                {step === 2 && '2. Staż, Czas 5 km & Fizjologia'}
                {step === 3 && '3. Obuwie, Typ Stopy & Kadencja'}
                {step === 4 && '4. Cel Sezonu & Dni Treningowe'}
              </h2>
            </div>
          </div>

          {!isFirstRun && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Zamknij kreator"
              className="w-8 h-8 rounded-full liquid-pill flex items-center justify-center txt-sub hover:text-white transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-4 gap-1.5 py-1">
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`h-1.5 rounded-full transition-all ${
                step >= s ? 'bg-gradient-to-r from-emerald-400 to-sky-400' : 'bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Form actions row */}
        <div className="flex items-center justify-between gap-2 text-[11px] pt-1">
          <span className="txt-muted">Formularz biegacza:</span>
          <button
            type="button"
            onClick={resetToCleanForm}
            className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/15 font-bold hover:bg-white/20 active:scale-95"
          >
            Wyczyść pola
          </button>
        </div>

        {/* STEP 1: Imię, Płeć, Data urodzenia, Wzrost, Waga aktualna i docelowa */}
        {step === 1 && (
          <div className="space-y-3.5 animate-ios">
            <div>
              <label className="text-[11px] font-bold txt-sub block mb-1">Imię lub Nick biegacza</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Patryk"
                className="w-full liquid-pill px-3.5 py-2 text-xs txt-main focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold txt-sub block mb-1">Płeć zawodnika</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'M', label: 'Mężczyzna' },
                  { id: 'F', label: 'Kobieta' },
                  { id: 'Other', label: 'Inna' },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGender(g.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      gender === g.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-sm'
                        : 'bg-white/5 border-white/10 txt-sub hover:bg-white/10'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold txt-sub">Dokładna data urodzenia (DD.MM.YYYY)</label>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {age} lat • Kategoria {ageCategory}
                </span>
              </div>
              <input
                type="text"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                placeholder="np. 14.05.1995"
                className="w-full liquid-pill px-3.5 py-2 text-xs txt-main focus:outline-none focus:border-emerald-400"
              />
              <p className="text-[10px] txt-muted mt-1">
                Kategoria wiekowa i strefy tętna wyliczają się w 100% dynamicznie z daty urodzenia.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold txt-sub block mb-1">Wzrost (cm)</label>
                <input
                  type="text"
                  value={heightStr}
                  onChange={(e) => setHeightStr(e.target.value)}
                  placeholder="180"
                  className="w-full liquid-pill px-3 py-2 text-xs txt-main text-center font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold txt-sub block mb-1">Waga aktualna (kg)</label>
                <input
                  type="text"
                  value={weightStr}
                  onChange={(e) => setWeightStr(e.target.value)}
                  placeholder="74.5"
                  className="w-full liquid-pill px-3 py-2 text-xs txt-main text-center font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold txt-sub block mb-1">Waga docelowa (kg)</label>
                <input
                  type="text"
                  value={targetWeightStr}
                  onChange={(e) => setTargetWeightStr(e.target.value)}
                  placeholder="70.0"
                  className="w-full liquid-pill px-3 py-2 text-xs txt-main text-center font-bold"
                />
              </div>
            </div>

            {/* Live BMI Badge */}
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-between text-xs">
              <span className="txt-sub">Wskaźnik masy ciała (BMI):</span>
              <span className="font-black text-sky-300">
                {bmi} kg/m² {parseFloat(bmi) < 25 ? '• W normie ✅' : '• Nadwaga lekka ⚖️'}
              </span>
            </div>
          </div>
        )}

        {/* STEP 2: Staż biegowy, obecny czas na 5 km lub Test Coopera, HRmax, RHR */}
        {step === 2 && (
          <div className="space-y-3.5 animate-ios">
            <div>
              <label className="text-[11px] font-bold txt-sub block mb-1">Staż biegowy</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  'Początkujący (od zera)',
                  'Poniżej 1 roku',
                  '1-3 lata regularnie',
                  'Ponad 3 lata (Doświadczony)',
                ].map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setExperience(exp)}
                    className={`p-2 rounded-xl text-left font-bold border transition-all ${
                      experience === exp
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                        : 'bg-white/5 border-white/10 txt-sub hover:bg-white/10'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            {/* Fitness Test Switch */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold txt-sub">Wskaźnik wydolności startowej</label>
                <div className="flex items-center gap-1 text-[10px] p-0.5 rounded-lg bg-black/40 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setFitnessTestMode('5k')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      fitnessTestMode === '5k' ? 'bg-emerald-500 text-slate-950' : 'txt-sub'
                    }`}
                  >
                    Czas na 5 km
                  </button>
                  <button
                    type="button"
                    onClick={() => setFitnessTestMode('cooper')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                      fitnessTestMode === 'cooper' ? 'bg-emerald-500 text-slate-950' : 'txt-sub'
                    }`}
                  >
                    Test Coopera (12 min)
                  </button>
                </div>
              </div>

              {fitnessTestMode === '5k' ? (
                <div>
                  <input
                    type="text"
                    value={time5kStr}
                    onChange={(e) => setTime5kStr(e.target.value)}
                    placeholder="np. 26:43"
                    className="w-full liquid-pill px-3.5 py-2 text-xs txt-main focus:outline-none focus:border-emerald-400 font-mono"
                  />
                  <div className="flex items-center justify-between text-[10px] txt-muted mt-1">
                    <span>Format MM:SS (np. 25:00 to 5:00/km)</span>
                    <span className="font-bold text-amber-300">Jack Daniels VDOT: ~{dynamicVdot} ml/kg</span>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="number"
                    value={cooperMeters}
                    onChange={(e) => setCooperMeters(parseInt(e.target.value, 10) || 2000)}
                    placeholder="np. 2400"
                    step="50"
                    className="w-full liquid-pill px-3.5 py-2 text-xs txt-main focus:outline-none focus:border-emerald-400 font-mono"
                  />
                  <div className="flex items-center justify-between text-[10px] txt-muted mt-1">
                    <span>Przebiegnięty dystans w 12 minut (metry)</span>
                    <span className="font-bold text-amber-300">Szacowany VDOT: ~{dynamicVdot}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Heart Rate Parameters (Karvonen) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold txt-sub">HRmax (bpm)</label>
                  <button
                    type="button"
                    onClick={handleTanakaHrMax}
                    className="text-[9px] font-bold text-sky-400 hover:underline"
                    title="Oblicz z formuły Tanaka 208 - 0.7*wiek"
                  >
                    Wzór Tanaka
                  </button>
                </div>
                <input
                  type="text"
                  value={hrMaxStr}
                  onChange={(e) => setHrMaxStr(e.target.value)}
                  placeholder="188"
                  className="w-full liquid-pill px-3 py-2 text-xs txt-main text-center font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold txt-sub block mb-1">RHR (Spoczynkowe bpm)</label>
                <input
                  type="text"
                  value={rhrStr}
                  onChange={(e) => setRhrStr(e.target.value)}
                  placeholder="58"
                  className="w-full liquid-pill px-3 py-2 text-xs txt-main text-center font-bold"
                />
              </div>
            </div>

            {/* Karvonen Zone 2 Preview */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>Strefa 2 (Tlenowa) wg Karvonena:</span>
                </span>
                <span className="font-black text-emerald-300 ios-num">
                  {z2Min} - {z2Max} bpm
                </span>
              </div>
              <p className="text-[10px] txt-muted">
                Formuła: ((HRmax - RHR) * 60-70%) + RHR. W tym przedziale budujesz bazę tlenową i spalasz tłuszcze.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: Główne buty z katalogu lub własne, typ stopy, podatność na kontuzje, obecna kadencja */}
        {step === 3 && (
          <div className="space-y-3.5 animate-ios">
            <div>
              <label className="text-[11px] font-bold txt-sub block mb-1">Główne buty biegowe</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs max-h-36 overflow-y-auto no-scrollbar pr-1">
                {SHOE_CATALOG.map((shoe) => (
                  <button
                    key={shoe.name}
                    type="button"
                    onClick={() => {
                      setSelectedShoeCatalogName(shoe.name);
                      setCustomShoeName('');
                      setFootType(shoe.footType);
                    }}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      selectedShoeCatalogName === shoe.name && !customShoeName
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                        : 'bg-white/5 border-white/10 txt-sub hover:bg-white/10'
                    }`}
                  >
                    <div className="font-bold truncate text-[11px]">{shoe.name}</div>
                    <div className="text-[9px] txt-muted truncate">{shoe.dropMm}mm drop • {shoe.footType}</div>
                  </button>
                ))}
              </div>

              <div className="mt-2">
                <input
                  type="text"
                  value={customShoeName}
                  onChange={(e) => setCustomShoeName(e.target.value)}
                  placeholder="...lub wpisz własny model buta (np. Hoka Speedgoat 5)"
                  className="w-full liquid-pill px-3 py-1.5 text-xs txt-main focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold txt-sub block mb-1">Typ stopy / przetaczania</label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: 'Neutralna', desc: 'Prawidłowe przetaczanie' },
                  { id: 'Pronująca', desc: 'Przetaczanie do wewnątrz' },
                  { id: 'Supinująca', desc: 'Lądowanie na zewnątrz' },
                ].map((ft) => (
                  <button
                    key={ft.id}
                    type="button"
                    onClick={() => setFootType(ft.id as any)}
                    className={`p-2 rounded-xl text-center border font-bold transition-all ${
                      footType === ft.id
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                        : 'bg-white/5 border-white/10 txt-sub hover:bg-white/10'
                    }`}
                  >
                    <div className="text-[11px]">{ft.id}</div>
                    <div className="text-[9px] txt-muted font-normal mt-0.5">{ft.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold txt-sub block mb-1">Podatność na kontuzje / wrażliwe stawy</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  'Brak kontuzji',
                  'Kolano biegacza (ITBS)',
                  'Ścięgno Achillesa',
                  'Rozcięgno podeszwowe',
                  'Piszczele (Shin Splints)',
                  'Odcinek lędźwiowy pleców',
                ].map((inj) => (
                  <button
                    key={inj}
                    type="button"
                    onClick={() => setInjuryProne(inj)}
                    className={`p-2 rounded-xl text-left border text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                      injuryProne === inj
                        ? 'bg-rose-500/20 text-rose-300 border-rose-400'
                        : 'bg-white/5 border-white/10 txt-sub hover:bg-white/10'
                    }`}
                  >
                    <ShieldAlert className="w-3 h-3 shrink-0" />
                    <span className="truncate">{inj}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold txt-sub">Obecna kadencja biegu (kroki/min)</label>
                <span className="text-xs font-black text-sky-300">{cadence} spm</span>
              </div>
              <input
                type="range"
                min="150"
                max="195"
                step="1"
                value={cadence}
                onChange={(e) => setCadence(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] txt-muted mt-1">
                <span>155 (Ciężki krok)</span>
                <span className="text-emerald-400 font-bold">175-180 (Optimum ekonomii)</span>
                <span>190+ (Sprint)</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Wybór celu lub "Ogólna kondycja" oraz zaznaczenie dni tygodnia Pn-Ndz */}
        {step === 4 && (
          <div className="space-y-3.5 animate-ios">
            <div>
              <label className="text-[11px] font-bold txt-sub block mb-1">Główny cel biegowy</label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto no-scrollbar pr-1">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setSelectedGoal(g.title);
                      setCustomGoalText('');
                    }}
                    className={`w-full p-2.5 rounded-xl text-left border transition-all ${
                      selectedGoal === g.title && !customGoalText
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-sm'
                        : 'bg-white/5 border-white/10 txt-sub hover:bg-white/10'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{g.title}</span>
                      {selectedGoal === g.title && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="text-[10px] txt-muted mt-0.5">{g.desc}</div>
                  </button>
                ))}
              </div>

              <div className="mt-2">
                <input
                  type="text"
                  value={customGoalText}
                  onChange={(e) => setCustomGoalText(e.target.value)}
                  placeholder="...lub wpisz własny cel (np. Ukończenie Biegu Rzeźnika)"
                  className="w-full liquid-pill px-3.5 py-2 text-xs txt-main focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold txt-sub">
                  Dni treningowe w tygodniu ({selectedDays.length} dni)
                </label>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {selectedDays.length >= 3 ? 'Optymalna regularność' : 'Min. 3 dni zalecane'}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {ALL_DAYS.map((d) => {
                  const isSel = selectedDays.includes(d.short);
                  return (
                    <button
                      key={d.short}
                      type="button"
                      onClick={() => handleDayToggle(d.short)}
                      className={`py-2 rounded-xl text-center text-xs font-black transition-all border ${
                        isSel
                          ? 'bg-gradient-to-b from-emerald-400 to-teal-500 text-slate-950 border-emerald-400 shadow-md scale-105'
                          : 'bg-white/5 border-white/10 txt-sub hover:bg-white/10'
                      }`}
                      title={d.name}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary preview */}
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1.5 text-xs">
              <div className="font-black text-emerald-400 text-[11px] uppercase tracking-wider">
                Podsumowanie konfiguracji:
              </div>
              <div className="text-slate-300 text-[11px] space-y-0.5">
                <div>Zawodnik: <strong className="text-white">{name}</strong> ({age} lat, {gender}, Kat. {ageCategory})</div>
                <div>Parametry: {numWeight} kg / {numHeight} cm (BMI: {bmi}) • HRmax: {numHrMax} bpm</div>
                <div>Obuwie: <strong className="text-sky-300">{customShoeName || selectedShoeCatalogName}</strong> ({footType})</div>
                <div>Cel: <strong className="text-amber-300">{customGoalText || selectedGoal}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="border-t border-white/10 pt-3 flex items-center justify-between gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="py-2.5 px-4 rounded-xl liquid-pill text-xs font-bold txt-sub hover:text-white flex items-center gap-1 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Wstecz</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1 hover:brightness-110 active:scale-95 shadow-md ml-auto"
            >
              <span>Dalej (Krok {step + 1})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleFinish(false)}
                className="py-2.5 px-3.5 rounded-xl liquid-pill border border-emerald-400/40 text-emerald-300 font-bold text-xs hover:bg-emerald-500/20 active:scale-95 transition-all"
              >
                Zapisz Profil
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleFinish(true)}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 text-slate-950 font-black text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 shadow-lg"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Generowanie Planu AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generuj Plan AI ›</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
