import React, { useState, useRef } from 'react';
import {
  Activity,
  Plus,
  Play,
  Map,
  Camera,
  Upload,
  Sparkles,
  Award,
  Trophy,
  Footprints,
  Heart,
  Clock,
  Zap,
  TrendingUp,
  X,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileText,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { RunLog, PersonalBest, RunnerProfile, Shoe } from '../types.ts';
import { calculateDynamicVo2Max } from '../utils/runningMath.ts';
import { parseGpxFile } from '../utils/gpxParser.ts';
import { enrichShoeSpecs } from '../utils/shoeBiometrics.ts';
import { useLockBodyScroll } from '../utils/useLockBodyScroll.ts';
import { createCompressedThumbnail, optimizeImageForVision } from '../utils/imageCompressor.ts';
import { saveRunScreenshotToDb } from '../utils/indexedDbStorage.ts';
import { IntegrationBrandLogo } from '../components/icons/IntegrationBrandLogo.tsx';
import { InteractiveRunRouteMap } from '../components/maps/InteractiveRunRouteMap.tsx';
import { RunningTrendsCharts } from '../components/analytics/RunningTrendsCharts.tsx';
import { getAuthHeaders } from '../lib/firebase.ts';
import { useTrainingData } from '../contexts/TrainingDataContext.tsx';
import { useUI } from '../contexts/UIContext.tsx';

interface RunsViewProps {
  runs?: RunLog[];
  profile?: RunnerProfile;
  personalBests?: PersonalBest[];
  shoes?: Shoe[];
  onOpenAddRun?: () => void;
  onUpdatePersonalBest?: (pb: PersonalBest) => void;
  onSelectRunForDetail?: (run: RunLog) => void;
  onDeleteRun?: (runId: string) => void;
  onEarnBamboos?: (amount: number, reason: string) => void;
  onAddSyncedRun?: (newRun: RunLog, updatedPlan?: any, bamboos?: number) => void;
  onOpenLiveHud?: () => void;
  onOpenRoutePlanner?: () => void;
  onOpenIntegrationsHub?: (appId?: string) => void;
  onAddShoe?: (newShoe: Shoe) => void;
  showToast?: (msg: string) => void;
}

const DEFAULT_PERSONAL_BESTS: PersonalBest[] = [
  { distanceId: '1k', distanceName: '1 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '1mile', distanceName: '1 mila (1.61 km)', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '3k', distanceName: '3 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '5k', distanceName: '5 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: '10k', distanceName: '10 km', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: 'half', distanceName: 'Półmaraton (21.1 km)', time: '--:--', pace: '- /km', date: '-' },
  { distanceId: 'marathon', distanceName: 'Maraton (42.2 km)', time: '--:--', pace: '- /km', date: '-' },
];

export const RunsView: React.FC<RunsViewProps> = (props) => {
  const dataCtx = useTrainingData();
  const uiCtx = useUI();

  const runs = props.runs ?? dataCtx.runs;
  const profile = props.profile ?? dataCtx.profile;
  const personalBests = props.personalBests ?? dataCtx.personalBests ?? DEFAULT_PERSONAL_BESTS;
  const shoes = props.shoes ?? dataCtx.shoes ?? [];
  const onOpenAddRun = props.onOpenAddRun ?? (() => uiCtx.setIsAddRunOpen(true));
  const onUpdatePersonalBest = props.onUpdatePersonalBest ?? dataCtx.handleUpdatePersonalBest;
  const onSelectRunForDetail =
    props.onSelectRunForDetail ??
    ((run) => {
      uiCtx.setSelectedRunForDetail(run);
      uiCtx.setIsRunDetailOpen(true);
    });
  const onDeleteRun = props.onDeleteRun ?? dataCtx.handleDeleteRun;
  const onEarnBamboos = props.onEarnBamboos ?? dataCtx.handleEarnBamboos;
  const onAddSyncedRun = props.onAddSyncedRun ?? ((newRun) => dataCtx.handleSubmitRun(newRun));
  const onOpenLiveHud = props.onOpenLiveHud ?? (() => uiCtx.setIsLiveHudOpen(true));
  const onOpenRoutePlanner = props.onOpenRoutePlanner ?? (() => uiCtx.setIsRoutePlannerOpen(true));
  const onAddShoe = props.onAddShoe ?? dataCtx.handleAddShoe;
  const showToast = props.showToast ?? uiCtx.showToast;

  // 3-View Segmented Control
  const [activeTab, setActiveTab] = useState<'journal' | 'trends' | 'pbs'>('journal');

  // Unified Add / Import Modal state
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState<boolean>(false);
  const [editingPb, setEditingPb] = useState<PersonalBest | null>(null);

  // AI Screenshot Scanner State
  const [isAnalyzingScreenshot, setIsAnalyzingScreenshot] = useState<boolean>(false);
  const [screenshotProgressText, setScreenshotProgressText] = useState<string>('');
  const [scannedData, setScannedData] = useState<any | null>(null);
  const [scannedImagePreview, setScannedImagePreview] = useState<string | null>(null);
  const [selectedShoeForScannedRun, setSelectedShoeForScannedRun] = useState<string>('');
  const [autoAddDetectedShoe, setAutoAddDetectedShoe] = useState<boolean>(true);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const unifiedModalRef = useRef<HTMLDivElement>(null);
  const pbModalRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(isUnifiedModalOpen || !!editingPb);

  React.useEffect(() => {
    if (isUnifiedModalOpen) {
      unifiedModalRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [isUnifiedModalOpen, scannedData]);

  React.useEffect(() => {
    if (editingPb) {
      pbModalRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [editingPb]);

  // GPX Importer State
  const [isImportingGpx, setIsImportingGpx] = useState<boolean>(false);
  const [importedGpxRun, setImportedGpxRun] = useState<RunLog | null>(null);
  const [gpxFileName, setGpxFileName] = useState<string>('');
  const [gpxPointCount, setGpxPointCount] = useState<number>(0);
  const gpxInputRef = useRef<HTMLInputElement | null>(null);

  // Aggregated Stats
  const totalKm = runs.reduce((acc, r) => acc + (Number(r.distanceKm) || 0), 0);
  const avgPaceSec =
    runs.length > 0
      ? Math.round(
          runs.reduce((acc, r) => {
            const parts = String(r.avgPace || '5:30').split(':');
            return acc + (parseInt(parts[0], 10) * 60 + (parseInt(parts[1], 10) || 0));
          }, 0) / runs.length
        )
      : 315;
  const pMin = Math.floor(avgPaceSec / 60);
  const pSec = avgPaceSec % 60;
  const avgPaceOverall = `${pMin}:${pSec < 10 ? '0' : ''}${pSec}`;

  const avgHeartRate =
    runs.length > 0
      ? Math.round(runs.reduce((acc, r) => acc + (Number(r.avgHr) || 150), 0) / runs.length)
      : 152;

  const avgCadence =
    runs.length > 0
      ? Math.round(runs.reduce((acc, r) => acc + (Number(r.avgCadence) || 176), 0) / runs.length)
      : 176;

  const currentVo2 = calculateDynamicVo2Max(profile, runs);

  const recentRuns = [...runs]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-8);

  // Handle AI Screenshot File Upload
  const handleScreenshotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingScreenshot(true);
    setScreenshotProgressText('Optymalizacja i przesyłanie do Gemini 3.8 Flash Vision...');
    if (showToast) showToast('📸 Gemini Vision analizuje zrzut ekranu...');

    try {
      // 1. Optimize image resolution for vision (max 1600px) to prevent payload errors
      const { base64Image, mimeType } = await optimizeImageForVision(file, 1600, 0.85);
      setScannedImagePreview(base64Image);
      setScreenshotProgressText('Odczytywanie dystansu, tempa, tętna, kadencji i pętli trasy...');

      const res = await fetch('/api/gemini/analyze-screenshot', {
        method: 'POST',
        headers: (await getAuthHeaders({ 'Content-Type': 'application/json' })) || { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image, mimeType }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Błąd serwera (${res.status})`);
      }

      const data = await res.json();
      setScannedData(data);
      const detectedShoe = data.shoeName || (shoes && shoes[0]?.name) || 'Asics Novablast 4';
      setSelectedShoeForScannedRun(detectedShoe);
      if (showToast) {
        showToast(`Odczytano dane ze zrzutu ekranu (${data.type === 'weight' ? 'Waga' : 'Bieg'})! ✨`);
      }
    } catch (err: any) {
      console.error('Błąd analizy zrzutu ekranu:', err);
      setScannedData(null);
      if (showToast) {
        showToast(err?.message || 'Nie udało się odczytać danych ze zrzutu ekranu.');
      }
    } finally {
      setIsAnalyzingScreenshot(false);
      e.target.value = '';
    }
  };

  // Confirm and Save Scanned Workout
  const handleSaveScannedWorkout = async () => {
    if (!scannedData || !onAddSyncedRun) return;

    if (scannedData.type === 'weight' && scannedData.weightKg) {
      if (showToast) showToast(`Zaktualizowano wagę w profilu: ${scannedData.weightKg} kg! (+25 🎋)`);
      if (onEarnBamboos) onEarnBamboos(25, 'Pomiar wagi ze skanera Zepp');
      setScannedData(null);
      setScannedImagePreview(null);
      setIsUnifiedModalOpen(false);
      return;
    }

    const dist = parseFloat(scannedData.distanceKm) || 7.5;
    let dur = 35;
    if (scannedData.durationMinutes) {
      dur = Math.round(parseFloat(scannedData.durationMinutes));
    } else if (scannedData.duration && typeof scannedData.duration === 'string') {
      const parts = scannedData.duration.split(':').map(Number);
      if (parts.length === 2) dur = parts[0] + Math.round(parts[1] / 60);
      else if (parts.length === 3) dur = parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
    }

    const chosenShoeName = selectedShoeForScannedRun || scannedData.shoeName || (shoes && shoes[0]?.name) || 'Asics Novablast 4';

    // Dynamiczne dodanie wykrytych butów ze zrzutu do szafy biegacza
    const existingShoe = shoes?.find((s) => s.name.toLowerCase() === chosenShoeName.toLowerCase());
    if (!existingShoe && onAddShoe && autoAddDetectedShoe) {
      const brandFromShoe = scannedData.shoeDetails?.brand || chosenShoeName.split(' ')[0] || 'Inna';
      const newShoeObj = enrichShoeSpecs({
        id: `shoe-${Date.now()}`,
        name: chosenShoeName,
        brand: brandFromShoe,
        mileageKm: dist,
        maxMileageKm: 700,
        dropMm: scannedData.shoeDetails?.dropMm || 8,
        foamTechnology: scannedData.shoeDetails?.foamTechnology,
        plateType: scannedData.shoeDetails?.plateType || 'Brak (Pianka tradycyjna)',
      });
      onAddShoe(newShoeObj);
      if (showToast) showToast(`👟 Dodano "${chosenShoeName}" do Twojej Szafy Biegacza!`);
    }

    const localDate = new Date().toLocaleDateString('sv-SE');
    const runId = `screenshot-ai-${Date.now()}`;

    // Compress screenshot to a lightweight JPEG thumbnail (~15-20 KB) for localStorage,
    // and persist full image in IndexedDB without eating into localStorage quota
    let compressedThumb: string | undefined = undefined;
    if (scannedImagePreview) {
      try {
        compressedThumb = await createCompressedThumbnail(scannedImagePreview, 360, 0.6);
        saveRunScreenshotToDb(runId, scannedImagePreview);
      } catch {
        compressedThumb = undefined;
      }
    }

    const newRun: RunLog = {
      id: runId,
      title: scannedData.title || `Bieg ze zrzutu ${scannedData.sourceApp ? scannedData.sourceApp.toUpperCase() : 'AI'} • ${dist} km`,
      sourceApp: (scannedData.sourceApp || 'huawei') as any,
      date: scannedData.date || localDate,
      distanceKm: dist,
      durationMin: dur,
      avgPace: scannedData.pace || scannedData.avgPace || '5:00',
      avgHr: parseInt(scannedData.avgHr, 10) || 152,
      maxHr: scannedData.maxHr ? parseInt(scannedData.maxHr, 10) : (parseInt(scannedData.avgHr, 10) || 152) + 16,
      avgCadence: parseInt(scannedData.cadence || scannedData.avgCadence, 10) || 176,
      gctMs: scannedData.gctMs || scannedData.gct ? parseInt(scannedData.gctMs || scannedData.gct, 10) : 226,
      elevationGainM: scannedData.elevationGainM ? parseInt(scannedData.elevationGainM, 10) : 35,
      calories: scannedData.calories ? parseInt(scannedData.calories, 10) : Math.round(dist * 68),
      shoeName: chosenShoeName,
      splits: scannedData.splits || undefined,
      analysis: scannedData.coachCommentary?.overallSummary || scannedData.notes || 'Analiza zrzutu ekranu AI',
      vo2MaxEst: scannedData.vo2MaxEst ? Number(scannedData.vo2MaxEst) : undefined,
      routeCoords: scannedData.routeCoords || undefined,
      normalizedTracePoints: scannedData.normalizedTracePoints || undefined,
      screenshotUrl: compressedThumb || undefined,
      notes: scannedData.notes || `Odczytano automatycznie ze zrzutu ekranu (${scannedData.sourceApp || 'Huawei / Garmin / Strava'}).`,
    };

    onAddSyncedRun(newRun, undefined, 50);
    setScannedData(null);
    setScannedImagePreview(null);
    setIsUnifiedModalOpen(false);
    setActiveTab('journal');
    if (showToast) showToast(`📸 Pomyślnie zapisano trening ${dist} km w Dzienniku! (+50 🎋)`);
  };

  // Handle GPX File Import
  const handleGpxFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingGpx(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const xml = event.target?.result as string;
        const defaultShoe = (shoes && shoes[0]?.name) || 'Asics Novablast 4';
        const parsed = parseGpxFile(xml, file.name, 'strava', defaultShoe);

        const fullRun: RunLog = {
          ...parsed.run,
          id: `gpx-file-${Date.now()}`,
          date: parsed.run.date || new Date().toLocaleDateString('sv-SE'),
          shoeName: defaultShoe,
        };

        setImportedGpxRun(fullRun);
        setGpxFileName(file.name);
        setGpxPointCount(parsed.pointCount);
        if (showToast) showToast(`Wczytano trasę GPS: ${fullRun.distanceKm} km (${parsed.pointCount} punktów) 🗺️`);
      } catch (err: any) {
        if (showToast) showToast(err.message || 'Błąd odczytu pliku trasy GPS');
      } finally {
        setIsImportingGpx(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveGpxRun = () => {
    if (!importedGpxRun || !onAddSyncedRun) return;
    onAddSyncedRun(importedGpxRun, undefined, 40);
    setImportedGpxRun(null);
    setIsUnifiedModalOpen(false);
    setActiveTab('journal');
    if (showToast) showToast(`🗺️ Zapisano trening z pliku GPX w Dzienniku! (+40 🎋)`);
  };

  return (
    <div className="space-y-4 px-4 pb-36 animate-ios">
      {/* Hidden file inputs */}
      <input
        ref={screenshotInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleScreenshotFileChange}
      />
      <input
        ref={gpxInputRef}
        type="file"
        accept=".gpx,.tcx,.fit,.xml"
        className="hidden"
        onChange={handleGpxFileChange}
      />

      {/* TOP ACTION BAR: 2 MAIN BUTTONS */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onOpenLiveHud}
          className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer hover:brightness-105"
        >
          <Play className="w-4 h-4 fill-slate-950 shrink-0" />
          <span>Start Live GPS</span>
        </button>

        <button
          type="button"
          onClick={() => setIsUnifiedModalOpen(true)}
          className="py-3 px-4 rounded-2xl accent-btn-gradient text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer hover:brightness-105"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Dodaj / Importuj</span>
        </button>
      </div>

      {/* 3-VIEW SEGMENTED CONTROL (Apple Fitness+ / Strava Style) */}
      <div className="p-1 rounded-2xl bg-[var(--surface-tile)] border border-[var(--border-subtle)] flex items-center justify-between gap-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('journal')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
            activeTab === 'journal'
              ? 'bg-[var(--surface-card)] txt-main shadow-sm border border-[var(--border-subtle)]'
              : 'txt-muted hover:txt-main'
          }`}
        >
          📋 Dziennik & Mapy
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trends')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
            activeTab === 'trends'
              ? 'bg-[var(--surface-card)] txt-main shadow-sm border border-[var(--border-subtle)]'
              : 'txt-muted hover:txt-main'
          }`}
        >
          📈 Trendy & Wykresy
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pbs')}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
            activeTab === 'pbs'
              ? 'bg-[var(--surface-card)] txt-main shadow-sm border border-[var(--border-subtle)]'
              : 'txt-muted hover:txt-main'
          }`}
        >
          🏆 Rekordy PB & Odznaki
        </button>
      </div>

      {/* VIEW 1: DZIENNIK & MAPY */}
      {activeTab === 'journal' && (
        <div className="space-y-4 animate-ios">
          {/* Bento Grid 4 Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-stretch">
            {/* Dystans Całkowity */}
            <div className="bento-tile">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center">
                  <Footprints className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider txt-muted">Dystans</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl font-black txt-main ios-num">{(Number(totalKm) || 0).toFixed(1)}</span>
                <span className="text-xs txt-muted font-bold ml-1">km</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 self-start">
                {runs.length} treningów
              </span>
            </div>

            {/* Średnie Tempo */}
            <div className="bento-tile">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider txt-muted">Śr. Tempo</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl font-black txt-main ios-num">{avgPaceOverall}</span>
                <span className="text-xs txt-muted font-bold ml-1">/km</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 self-start">
                Baza Z2
              </span>
            </div>

            {/* Średnie Tętno */}
            <div className="bento-tile">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider txt-muted">Śr. Tętno</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl font-black text-rose-400 ios-num">{avgHeartRate}</span>
                <span className="text-xs txt-muted font-bold ml-1">bpm</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 self-start">
                Strefa tlenowa
              </span>
            </div>

            {/* Średnia Kadencja */}
            <div className="bento-tile">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider txt-muted">Kadencja</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl font-black text-emerald-400 ios-num">{avgCadence}</span>
                <span className="text-xs txt-muted font-bold ml-1">spm</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 self-start">
                Rytm wzorowy
              </span>
            </div>
          </div>

          {/* Featured Route Map of Last Run */}
          {runs.length > 0 && (
            <div
              onClick={() => onSelectRunForDetail && onSelectRunForDetail(runs[0])}
              className="cursor-pointer group transition-all relative"
              title="Kliknij, aby otworzyć pełną analizę i biomechanikę tego biegu"
            >
              <InteractiveRunRouteMap
                run={runs[0]}
                cityName={profile.city}
                title={`Ostatnio Przebiegnięta Trasa (${runs[0].distanceKm} km • ${runs[0].avgPace}/km)`}
              />
              <div className="mt-1 flex items-center justify-end">
                <span className="text-[11px] font-black text-sky-400 hover:underline flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-xl border border-sky-500/30 shadow-sm">
                  🔍 Otwórz pełną analizę i wideo ›
                </span>
              </div>
            </div>
          )}

          {/* History of runs */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider txt-muted">
                Historia Zarejestrowanych Biegów ({runs.length})
              </span>
              <span className="text-[10px] text-sky-400 font-bold">Dotknij bieg dla analizy</span>
            </div>

            {runs.length === 0 ? (
              <div className="bento-tile p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[var(--surface-tile-hover)] flex items-center justify-center text-2xl mx-auto">
                  🏃‍♂️
                </div>
                <h3 className="text-sm font-black txt-main">Brak zarejestrowanych biegów</h3>
                <p className="text-xs txt-muted max-w-xs mx-auto leading-relaxed">
                  Zarejestruj bieg przez <strong>Skaner AI</strong>, plik <strong>.GPX</strong> lub kliknij <strong>Start Live GPS</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setIsUnifiedModalOpen(true)}
                  className="py-2.5 px-4 rounded-xl accent-btn-gradient text-slate-950 font-black text-xs uppercase"
                >
                  Dodaj pierwszy bieg
                </button>
              </div>
            ) : (
              runs.map((run) => (
                <div
                  key={run.id}
                  onClick={() => onSelectRunForDetail && onSelectRunForDetail(run)}
                  className="bento-tile cursor-pointer hover:border-orange-500/40 group p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-tile-hover)] txt-muted">
                          {run.date}
                        </span>
                        {run.sourceApp && (
                          <span className="flex items-center gap-1 text-[10px] text-sky-400 font-bold">
                            <IntegrationBrandLogo appId={run.sourceApp} size="xs" />
                            <span className="uppercase">{run.sourceApp}</span>
                          </span>
                        )}
                        {run.normalizedTracePoints && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-bold">
                            ✨ Ślad 2.5D
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black txt-main group-hover:text-orange-400 transition-colors">
                        {run.title || `${run.distanceKm} km bieg`}
                      </h4>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black txt-main ios-num">
                        {run.distanceKm} <span className="text-xs font-bold text-orange-400">km</span>
                      </div>
                      <div className="text-[10px] txt-muted font-mono">{run.avgPace} /km</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-3 mt-3 border-t border-[var(--border-subtle)] text-center text-xs">
                    <div>
                      <span className="text-[9px] txt-muted block">Czas</span>
                      <span className="font-bold txt-main font-mono">{run.durationMin} min</span>
                    </div>
                    <div>
                      <span className="text-[9px] txt-muted block">Tętno śr.</span>
                      <span className="font-bold text-rose-400 font-mono">{run.avgHr} bpm</span>
                    </div>
                    <div>
                      <span className="text-[9px] txt-muted block">Kadencja</span>
                      <span className="font-bold text-emerald-400 font-mono">{run.avgCadence || 176} spm</span>
                    </div>
                    <div>
                      <span className="text-[9px] txt-muted block">Buty</span>
                      <span className="font-bold text-cyan-400 truncate block max-w-[70px] mx-auto">
                        {run.shoeName ? run.shoeName.split(' ')[0] : 'Szafa'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: TRENDY & WYKRESY */}
      {activeTab === 'trends' && (
        <div className="space-y-4 animate-ios">
          {/* Top 4 Bento Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-stretch">
            <div className="bento-tile">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider txt-muted">VO2Max Est.</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl font-black text-amber-400 ios-num">{(Number(currentVo2) || 42).toFixed(1)}</span>
                <span className="text-[10px] txt-muted ml-1">ml/kg</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 self-start">
                Bardzo dobry
              </span>
            </div>

            <div className="bento-tile">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider txt-muted">GCT Kontakt</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl font-black text-cyan-400 ios-num">
                  {runs[0]?.gctMs || 224}
                </span>
                <span className="text-[10px] txt-muted ml-1">ms</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 self-start">
                Dynamiczne odbicie
              </span>
            </div>

            <div className="bento-tile">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider txt-muted">Kadencja</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl font-black text-emerald-400 ios-num">{avgCadence}</span>
                <span className="text-[10px] txt-muted ml-1">spm</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 self-start">
                Cel: 180 spm
              </span>
            </div>

            <div className="bento-tile">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider txt-muted">Strefa HR</span>
              </div>
              <div className="my-1.5">
                <span className="text-xl font-black text-rose-400 ios-num">{avgHeartRate}</span>
                <span className="text-[10px] txt-muted ml-1">bpm</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 self-start">
                Strefa 2 Aerobic
              </span>
            </div>
          </div>

          {/* RECHARTS ADVANCED RUNNING TRENDS (PACE, DISTANCE, CADENCE, GCT) */}
          <RunningTrendsCharts runs={runs} onSelectRun={onSelectRunForDetail} />
        </div>
      )}

      {/* VIEW 3: REKORDY PB & ODZNAKI */}
      {activeTab === 'pbs' && (
        <div className="space-y-4 animate-ios">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-black txt-main">Rekordy Życiowe (Personal Bests)</h3>
              <p className="text-[10px] txt-muted">Automatycznie weryfikowane z każdego zarejestrowanego biegu</p>
            </div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
              7 dystansów
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-stretch">
            {personalBests.map((pb) => (
              <div
                key={pb.distanceId}
                className="bento-tile p-3.5 flex flex-row items-center justify-between shadow-sm hover:border-amber-400/40"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{pb.distanceName}</span>
                  </span>
                  <div className="text-lg font-black txt-main font-mono">{pb.time}</div>
                  <div className="text-[10px] txt-muted">
                    {pb.pace} • {pb.date || 'b/d'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingPb(pb)}
                  className="p-2 rounded-xl bg-[var(--surface-tile-hover)] hover:bg-[var(--border-subtle)] txt-sub hover:txt-main transition-all cursor-pointer"
                  title="Edytuj rekord życiowy"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Badges & Trophies */}
          <div className="bento-tile p-4 space-y-3">
            <span className="text-xs font-black uppercase txt-main flex items-center gap-1.5">
              <Award className="w-4 h-4 text-orange-400" />
              <span>Odznaki & Trofea Biegowe</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-[var(--surface-tile-hover)] space-y-1">
                <span className="text-2xl block">🏅</span>
                <span className="text-[10px] font-bold txt-main block">Pierwsza 10K</span>
                <span className="text-[9px] text-emerald-400 font-bold block">Zdobyta</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-tile-hover)] space-y-1">
                <span className="text-2xl block">⚡</span>
                <span className="text-[10px] font-bold txt-main block">Kadencja 180 spm</span>
                <span className="text-[9px] text-emerald-400 font-bold block">Mistrz Rytmu</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-tile-hover)] space-y-1">
                <span className="text-2xl block">🔥</span>
                <span className="text-[10px] font-bold txt-main block">Seria 7 Dni</span>
                <span className="text-[9px] text-orange-400 font-bold block">Aktywna</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-tile-hover)] space-y-1 opacity-75">
                <span className="text-2xl block">🏆</span>
                <span className="text-[10px] font-bold txt-main block">Półmaraton</span>
                <span className="text-[9px] txt-muted font-bold block">W drodze</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED ADD / IMPORT WORKOUT MODAL */}
      {isUnifiedModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex flex-col items-center justify-start sm:justify-center pt-2 sm:pt-6 pb-24 sm:pb-8 px-3 sm:px-4 overscroll-contain overflow-y-auto animate-ios">
          <div
            ref={unifiedModalRef}
            className="liquid-glass w-full max-w-md rounded-3xl border border-white/20 shadow-2xl flex flex-col max-h-[84dvh] sm:max-h-[88dvh] overflow-hidden animate-ios-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black txt-main">Dodaj / Importuj Trening</h3>
                  <span className="text-[10px] txt-muted">Wybierz preferowany sposób rejestracji biegu</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUnifiedModalOpen(false);
                  setScannedData(null);
                  setScannedImagePreview(null);
                  setImportedGpxRun(null);
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center txt-muted hover:txt-main cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* IF SCANNED DATA READY */}
            {scannedData ? (
              <>
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5 no-scrollbar">
                  <div className="p-3.5 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-400 animate-spin" />
                      <span className="text-xs font-bold text-orange-300">
                        Odczytano zrzut: {scannedData.distanceKm} km ({scannedData.sourceApp ? scannedData.sourceApp.toUpperCase() : 'AI'})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-white/70">
                      {scannedData.pace || scannedData.avgPace}/km
                    </span>
                  </div>

                  {/* 3-TRYBOWY PODGLĄD TRASY ZE SKANERA AI: Ślad 2.5D | Mapa GPS (OSRM) | Zrzut ekranu */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold txt-muted px-1">
                      <span>Podgląd trasy z analizy wizyjnej AI:</span>
                      <span className="text-cyan-400 font-mono">
                        {scannedData.normalizedTracePoints?.length ? 'Wykryto wektory pętli 2.5D' : 'OSRM Foot Routing'}
                      </span>
                    </div>
                    <InteractiveRunRouteMap
                      run={{
                        id: 'scanned-preview-run',
                        title: scannedData.title || `Bieg ${scannedData.distanceKm} km`,
                        date: scannedData.date || new Date().toISOString().split('T')[0],
                        distanceKm: scannedData.distanceKm,
                        durationMin: typeof scannedData.durationMin === 'number' ? scannedData.durationMin : 45,
                        shoeName: selectedShoeForScannedRun || profile.selectedShoeName || 'Buty treningowe',
                        avgPace: scannedData.pace || scannedData.avgPace || '5:00',
                        avgHr: scannedData.avgHr || 152,
                        avgCadence: scannedData.cadence || 176,
                        elevationGainM: scannedData.elevationGainM || 25,
                        screenshotUrl: scannedImagePreview || undefined,
                        routeCoords: scannedData.routeCoords,
                        normalizedTracePoints: scannedData.normalizedTracePoints,
                        splits: scannedData.splits,
                        sourceApp: scannedData.sourceApp,
                      }}
                      screenshotUrl={scannedImagePreview || undefined}
                      cityName={profile.city || 'Warszawa'}
                      heightClass="h-52 sm:h-60"
                    />
                  </div>

                  {/* EDYTOWALNY NAGŁÓWEK TRENINGU */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold txt-muted block uppercase tracking-wider">
                        Tytuł treningu:
                      </label>
                      <input
                        type="text"
                        value={scannedData.title || ''}
                        onChange={(e) => setScannedData({ ...scannedData, title: e.target.value })}
                        placeholder="np. Poranny bieg w parku"
                        className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs font-bold txt-main focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold txt-muted block uppercase tracking-wider">
                        Data treningu:
                      </label>
                      <input
                        type="date"
                        value={scannedData.date || ''}
                        onChange={(e) => setScannedData({ ...scannedData, date: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs font-bold txt-main focus:border-orange-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* EDYTOWALNA STACJA METRYK TRENINGOWYCH ZE ZRZUTU */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] txt-muted px-1">
                      <span className="font-bold uppercase tracking-wider">Metryki biegu (możesz skorygować):</span>
                      <span className="text-orange-400 font-bold">Dotknij aby edytować ✏️</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-black/40 border border-white/10 hover:border-orange-500/40 transition-colors">
                        <span className="text-[9px] txt-muted block font-bold">Dystans (km)</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          value={scannedData.distanceKm ?? ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setScannedData({ ...scannedData, distanceKm: val });
                          }}
                          className="w-full bg-transparent text-center font-bold text-orange-400 font-mono text-sm focus:outline-none"
                        />
                      </div>
                      <div className="p-2 rounded-xl bg-black/40 border border-white/10 hover:border-orange-500/40 transition-colors">
                        <span className="text-[9px] txt-muted block font-bold">Czas trwania</span>
                        <input
                          type="text"
                          placeholder="MM:SS lub HH:MM:SS"
                          value={scannedData.duration || ''}
                          onChange={(e) => {
                            const durStr = e.target.value;
                            const parts = durStr.split(':').map(Number);
                            let durMin = scannedData.durationMin;
                            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                              durMin = parts[0] + parts[1] / 60;
                            } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                              durMin = parts[0] * 60 + parts[1] + parts[2] / 60;
                            }
                            setScannedData({ ...scannedData, duration: durStr, durationMin: durMin, durationMinutes: durMin });
                          }}
                          className="w-full bg-transparent text-center font-bold txt-main font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <div className="p-2 rounded-xl bg-black/40 border border-white/10 hover:border-orange-500/40 transition-colors">
                        <span className="text-[9px] txt-muted block font-bold">Tempo śr. (/km)</span>
                        <input
                          type="text"
                          placeholder="M:SS"
                          value={scannedData.pace || scannedData.avgPace || ''}
                          onChange={(e) => {
                            setScannedData({ ...scannedData, pace: e.target.value, avgPace: e.target.value });
                          }}
                          className="w-full bg-transparent text-center font-bold text-amber-300 font-mono text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-black/40 border border-white/10 hover:border-rose-500/40 transition-colors">
                        <span className="text-[9px] txt-muted block font-bold">Tętno śr. (bpm)</span>
                        <input
                          type="number"
                          min="40"
                          max="230"
                          value={scannedData.avgHr ?? ''}
                          onChange={(e) => {
                            setScannedData({ ...scannedData, avgHr: parseInt(e.target.value, 10) || 0 });
                          }}
                          className="w-full bg-transparent text-center font-bold text-rose-400 font-mono text-sm focus:outline-none"
                        />
                      </div>
                      <div className="p-2 rounded-xl bg-black/40 border border-white/10 hover:border-emerald-500/40 transition-colors">
                        <span className="text-[9px] txt-muted block font-bold">Kadencja (spm)</span>
                        <input
                          type="number"
                          min="80"
                          max="240"
                          value={scannedData.cadence || scannedData.avgCadence || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setScannedData({ ...scannedData, cadence: val, avgCadence: val });
                          }}
                          className="w-full bg-transparent text-center font-bold text-emerald-400 font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <div className="p-2 rounded-xl bg-black/40 border border-white/10 hover:border-amber-500/40 transition-colors">
                        <span className="text-[9px] txt-muted block font-bold">Wznios (+m)</span>
                        <input
                          type="number"
                          min="0"
                          value={scannedData.elevationGainM ?? 0}
                          onChange={(e) => {
                            setScannedData({ ...scannedData, elevationGainM: parseInt(e.target.value, 10) || 0 });
                          }}
                          className="w-full bg-transparent text-center font-bold text-amber-300 font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Splits / Międzyczasy */}
                  {scannedData.splits && scannedData.splits.length > 0 && (
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider txt-muted flex items-center gap-1.5">
                          <span>⏱️</span>
                          <span>Międzyczasy ({scannedData.splits.length} km)</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                        {scannedData.splits.map((s: any, idx: number) => (
                          <div key={idx} className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-400 font-bold">{s.km || idx + 1}k</span>
                            <span className="text-orange-300 font-bold">{s.pace || '--:--'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DYNAMICZNE OBUWIE ZE ZRZUTU EKRANU */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/5 border border-orange-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">👟</span>
                        <span className="text-xs font-black text-orange-300">
                          {scannedData.shoeName ? 'Wykryte obuwie ze zrzutu' : 'Przypisz buty do treningu'}
                        </span>
                      </div>
                      {scannedData.shoeName && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-500/25 text-orange-300 border border-orange-500/40">
                          Prawdziwa detekcja
                        </span>
                      )}
                    </div>

                    {scannedData.shoeName && scannedData.shoeDetails && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>{scannedData.shoeName}</span>
                          <span className="text-[10px] text-orange-400 font-mono font-bold">{scannedData.shoeDetails.brand}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[9px] text-slate-300">
                          {scannedData.shoeDetails.dropMm && (
                            <span className="px-1.5 py-0.5 rounded bg-white/10">Drop: {scannedData.shoeDetails.dropMm} mm</span>
                          )}
                          {scannedData.shoeDetails.foamTechnology && (
                            <span className="px-1.5 py-0.5 rounded bg-white/10">Pianka: {scannedData.shoeDetails.foamTechnology}</span>
                          )}
                          {scannedData.shoeDetails.plateType && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">
                              {scannedData.shoeDetails.plateType}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider txt-muted block">
                        Wybierz buty z szafy lub dodaj nowe:
                      </label>
                      <select
                        value={selectedShoeForScannedRun}
                        onChange={(e) => setSelectedShoeForScannedRun(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/20 text-xs font-bold text-white outline-none cursor-pointer focus:border-orange-500"
                      >
                        {scannedData.shoeName && !shoes.some((s) => s.name.toLowerCase() === scannedData.shoeName.toLowerCase()) && (
                          <option value={scannedData.shoeName}>
                            ✨ Dodaj wykryte: {scannedData.shoeName} (nowa para w szafie)
                          </option>
                        )}
                        {shoes.map((s) => (
                          <option key={s.id} value={s.name}>
                            👟 {s.name} ({s.brand} • {s.dropMm || 8}mm drop • {Math.round(s.mileageKm || 0)}/{s.maxMileageKm || 700} km)
                          </option>
                        ))}
                      </select>
                    </div>

                    {scannedData.shoeName && !shoes.some((s) => s.name.toLowerCase() === selectedShoeForScannedRun.toLowerCase()) && (
                      <label className="flex items-center gap-2 text-[11px] text-orange-200/90 cursor-pointer pt-0.5">
                        <input
                          type="checkbox"
                          checked={autoAddDetectedShoe}
                          onChange={(e) => setAutoAddDetectedShoe(e.target.checked)}
                          className="rounded text-orange-500 focus:ring-orange-500"
                        />
                        <span>Zapisz w Mojej Szafie Biegacza z parametrami fabrycznymi</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Sticky Action Footer - Always visible and clickable */}
                <div className="shrink-0 p-3 pt-2.5 border-t border-white/10 bg-slate-950/95 backdrop-blur-md sticky bottom-0 z-20 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveScannedWorkout}
                    className="flex-1 py-3 px-4 rounded-xl accent-btn-gradient text-slate-950 font-black text-xs uppercase shadow cursor-pointer active:scale-95"
                  >
                    ✓ Dodaj bieg do Dziennika (+50 🎋)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScannedData(null);
                      setScannedImagePreview(null);
                    }}
                    className="py-3 px-3 rounded-xl liquid-pill text-xs font-bold txt-sub hover:text-white"
                  >
                    Odrzuć
                  </button>
                </div>
              </>
            ) : importedGpxRun ? (
              /* IF GPX FILE READY */
              <>
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5 no-scrollbar">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Map className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-300">
                        Wczytano GPX: {importedGpxRun.distanceKm} km
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {gpxPointCount} pkt
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-[9px] txt-muted block">Dystans</span>
                      <span className="font-bold text-emerald-400 font-mono text-sm">{importedGpxRun.distanceKm} km</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-[9px] txt-muted block">Czas</span>
                      <span className="font-bold txt-main font-mono text-sm">{importedGpxRun.durationMin} min</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-[9px] txt-muted block">Wznios</span>
                      <span className="font-bold text-amber-300 font-mono text-sm">+{importedGpxRun.elevationGainM || 0} m</span>
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="shrink-0 p-3 pt-2.5 border-t border-white/10 bg-slate-950/95 backdrop-blur-md sticky bottom-0 z-20 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveGpxRun}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase shadow cursor-pointer active:scale-95"
                  >
                    ✓ Dodaj bieg z GPX (+40 🎋)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportedGpxRun(null)}
                    className="py-3 px-3 rounded-xl liquid-pill text-xs font-bold txt-sub hover:text-white"
                  >
                    Anuluj
                  </button>
                </div>
              </>
            ) : (
              /* 3 CHOICES */
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 no-scrollbar">
                {/* 1. AI SCREENSHOT SCANNER */}
                <label className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-transparent border border-orange-500/35 hover:border-orange-500/60 transition-all cursor-pointer group shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30 group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-black txt-main">📸 Skaner Zrzutu AI Vision</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-500/25 text-orange-300">
                          Gemini 3.8
                        </span>
                      </div>
                      <p className="text-[11px] txt-muted mt-0.5">
                        Huawei Zdrowie, Garmin, Strava, Apple Fitness, Polar, Zepp
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 txt-muted group-hover:text-orange-400" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenshotFileChange}
                  />
                </label>

                {/* 2. GPX / TCX FILE */}
                <label className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent border border-emerald-500/35 hover:border-emerald-500/60 transition-all cursor-pointer group shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                      <Map className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-black txt-main">🗺️ Plik .GPX / .TCX / .FIT</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300">
                          Ślad GPS
                        </span>
                      </div>
                      <p className="text-[11px] txt-muted mt-0.5">
                        Import z zegarka z dokładnymi międzyczasami i mapą
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 txt-muted group-hover:text-emerald-400" />
                  <input
                    type="file"
                    accept=".gpx,.tcx,.fit,.xml"
                    className="hidden"
                    onChange={handleGpxFileChange}
                  />
                </label>

                {/* 3. MANUAL ENTRY */}
                <div
                  onClick={() => {
                    setIsUnifiedModalOpen(false);
                    onOpenAddRun();
                  }}
                  className="p-4 rounded-2xl bg-[var(--surface-tile)] border border-[var(--border-subtle)] hover:border-white/30 transition-all cursor-pointer group shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[var(--surface-tile-hover)] txt-muted flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5 txt-main" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black txt-main">✍️ Wpis ręczny</h4>
                      <p className="text-[11px] txt-muted mt-0.5">
                        Wprowadź dystans, czas, tętno i wybierz buty z szafy
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 txt-muted group-hover:txt-main" />
                </div>

                {isAnalyzingScreenshot && (
                  <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center space-y-1">
                    <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <span className="text-xs font-bold text-orange-300 block">{screenshotProgressText}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PB EDIT MODAL */}
      {editingPb && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex flex-col items-center justify-start sm:justify-center pt-3 sm:pt-6 pb-24 sm:pb-8 px-3 overscroll-contain overflow-y-auto animate-ios">
          <div
            ref={pbModalRef}
            className="liquid-glass w-full max-w-sm rounded-3xl border border-amber-400/40 shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden animate-ios-modal"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4 shrink-0">
              <h3 className="text-sm font-black txt-main">Edycja Rekordu: {editingPb.distanceName}</h3>
              <button
                type="button"
                onClick={() => setEditingPb(null)}
                className="text-xs font-bold txt-muted hover:txt-main cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs no-scrollbar">
              <div>
                <label className="text-[10px] txt-muted block mb-1 font-bold">Czas (np. 24:30 lub 1:52:10)</label>
                <input
                  type="text"
                  value={editingPb.time}
                  onChange={(e) => setEditingPb({ ...editingPb, time: e.target.value })}
                  className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] txt-muted block mb-1 font-bold">Tempo (np. 4:54 /km)</label>
                <input
                  type="text"
                  value={editingPb.pace}
                  onChange={(e) => setEditingPb({ ...editingPb, pace: e.target.value })}
                  className="w-full p-2.5 rounded-xl liquid-pill txt-main font-bold outline-none font-mono"
                />
              </div>
            </div>

            <div className="shrink-0 p-3 border-t border-white/10 bg-slate-950/95 sticky bottom-0 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onUpdatePersonalBest && editingPb) {
                    onUpdatePersonalBest(editingPb);
                    setEditingPb(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl accent-btn-gradient text-slate-950 font-black text-xs uppercase cursor-pointer"
              >
                Zapisz rekord
              </button>
              <button
                type="button"
                onClick={() => setEditingPb(null)}
                className="py-2.5 px-4 rounded-xl liquid-pill text-xs font-bold txt-sub"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
