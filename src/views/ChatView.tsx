import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  FileText,
  Activity,
  Calendar,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ScanLine,
} from 'lucide-react';
import {
  ChatMessage,
  ChatOcrAttachmentPayload,
  RunnerProfile,
  RunLog,
  Shoe,
} from '../types.ts';
import { optimizeImageForVision } from '../utils/imageCompressor.ts';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, attachment?: ChatOcrAttachmentPayload) => Promise<void>;
  isLoading: boolean;
  profile: RunnerProfile;
  lastRun: RunLog | null;
  shoes: Shoe[];
}

const QUICK_QUESTIONS = [
  'Czy moje tętno w Strefie 2 jest prawidłowe?',
  'Jak płynnie zwiększyć kadencję do 180 spm?',
  'Co zjeść 2h przed długim wybieganiem?',
  'Kiedy wymienić zużyte buty biegowe?',
  'Jak zapobiegać bólom piszczeli (shin splints)?',
];

// Helper to generate a realistic sample image (Canvas -> DataURL) so users can also test real Tesseract OCR with 1 click
function createSampleOcrDocumentImage(type: 'medical' | 'training_plan', runnerName: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // High-contrast white laboratory / coaching sheet for crisp OCR recognition
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px Arial, sans-serif';

  if (type === 'medical') {
    ctx.fillText('WYNIKI BADAN LABORATORYJNYCH - MORFOLOGIA I BIOCHEMIA', 36, 56);
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(`Pacjent: ${runnerName || 'Biegacz'}   Data badania: ${new Date().toLocaleDateString('sv-SE')}`, 36, 88);

    ctx.font = 'bold 18px Arial, sans-serif';
    const rows = [
      'Hemoglobina (HGB): 14.8 g/dl   [13.0 - 17.5]',
      'Ferrytyna: 34.5 ng/ml          [30.0 - 300.0]',
      'Hematokryt (HCT): 43.2 %       [38.0 - 50.0]',
      'Erytrocyty (RBC): 4.85 mln/ul  [4.10 - 5.80]',
      'Leukocyty (WBC): 5.6 tys/ul    [4.0 - 10.0]',
      'Zelazo (Fe): 92 ug/dl          [60 - 170]',
      'Witamina D3 (25-OH): 29.0 ng/ml [40.0 - 65.0]',
      'Kinaza kreatynowa (CK): 340 U/l [30 - 200]',
      'Magnez (Mg): 2.05 mg/dl        [1.80 - 2.60]',
      'TSH: 1.65 uIU/ml               [0.40 - 2.80]',
    ];
    rows.forEach((row, idx) => {
      ctx.fillText(row, 36, 132 + idx * 32);
    });
  } else {
    ctx.fillText('PLAN TRENINGOWY - MIKROCYKL BIEGOWY 7 DNI', 36, 56);
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(`Zawodnik: ${runnerName || 'Biegacz'}   Cel: Poprawa wyniku 5K i 10K`, 36, 88);

    ctx.font = 'bold 18px Arial, sans-serif';
    const rows = [
      'Poniedzialek: Wolne / Rolowanie i mobilnosc bioder',
      'Wtorek: Bieg spokojny 8 km w tempie 5:35/km (Strefa 2)',
      'Sroda: Regeneracja / Cwiczenia silowe Core',
      'Czwartek: Interwaly 5x1000m w tempie 4:35/km (razem 9 km)',
      'Piatek: Wolne / Regeneracja pasma ITBS',
      'Sobota: Bieg spokojny 6 km + 4x100m rytmy (tempo 5:30/km)',
      'Niedziela: Bieg dlugi (Long Run) 14 km w tempie 5:45/km',
    ];
    rows.forEach((row, idx) => {
      ctx.fillText(row, 36, 136 + idx * 42);
    });
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

// Helper to render formatted markdown-like bold text and line breaks cleanly
function renderFormattedText(rawText: string) {
  const lines = (rawText || '').split('\n');
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={lineIdx} className="h-1.5" />;
    }

    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={lineIdx} className="leading-relaxed">
        {parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-black text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <React.Fragment key={pIdx}>{part}</React.Fragment>;
        })}
      </p>
    );
  });
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isLoading,
  profile,
  lastRun,
}) => {
  const [input, setInput] = useState<string>('');
  const [stagedImageBase64, setStagedImageBase64] = useState<string | null>(null);
  const [stagedFileName, setStagedFileName] = useState<string>('');
  const [stagedDocType, setStagedDocType] = useState<'auto' | 'medical' | 'training_plan'>('auto');
  const [isCompressingImage, setIsCompressingImage] = useState<boolean>(false);
  const [expandedOcrIds, setExpandedOcrIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, stagedImageBase64]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    presetCategory: 'auto' | 'medical' | 'training_plan' = 'auto'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    try {
      const optimized = await optimizeImageForVision(file, 1600, 0.85);
      setStagedImageBase64(optimized.base64Image);
      setStagedFileName(file.name || 'dokument-ocr.jpg');
      setStagedDocType(presetCategory);
      if (!input.trim()) {
        if (presetCategory === 'medical') {
          setInput('Przeanalizuj przez OCR moje wyniki badań krwi pod kątem biegania i regeneracji.');
        } else if (presetCategory === 'training_plan') {
          setInput('Przeanalizuj przez OCR mój plan treningowy i dopasuj tempa do mojego VO2max.');
        } else {
          setInput('Odczytaj tekst przez OCR i przeanalizuj ten dokument pod kątem mojej fizjologii.');
        }
      }
    } catch (err) {
      console.error('OCR image preparation error:', err);
    } finally {
      setIsCompressingImage(false);
      e.target.value = '';
    }
  };

  const handleRunSampleOcr = async (sampleType: 'medical' | 'training_plan') => {
    if (isLoading || isCompressingImage) return;
    const sampleDataUrl = createSampleOcrDocumentImage(sampleType, profile.name);
    if (!sampleDataUrl) return;

    const promptText =
      sampleType === 'medical'
        ? '🩸 Przeanalizuj tekstowo przez OCR moje wyniki badań krwi (Morfologia, Ferrytyna, Witamina D3, CK)'
        : '📅 Przeanalizuj tekstowo przez OCR zdjęcie mojego 7-dniowego planu treningowego';

    await onSendMessage(promptText, {
      imageBase64: sampleDataUrl,
      mimeType: 'image/jpeg',
      documentType: sampleType,
      fileName: sampleType === 'medical' ? 'morfologia-biegacza.jpg' : 'plan-treningowy.jpg',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !stagedImageBase64) || isLoading || isCompressingImage) return;

    const msg = input.trim();
    const currentAttachment: ChatOcrAttachmentPayload | undefined = stagedImageBase64
      ? {
          imageBase64: stagedImageBase64,
          mimeType: 'image/jpeg',
          documentType: stagedDocType,
          fileName: stagedFileName,
        }
      : undefined;

    setInput('');
    setStagedImageBase64(null);
    setStagedFileName('');
    setStagedDocType('auto');

    await onSendMessage(msg, currentAttachment);
  };

  const handleChipClick = async (q: string) => {
    if (isLoading) return;
    await onSendMessage(q);
  };

  const toggleExpandOcrText = (msgId: string) => {
    setExpandedOcrIds((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleCopyOcrText = (msgId: string, textToCopy: string) => {
    navigator.clipboard?.writeText(textToCopy).catch(() => {});
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-175px)] max-h-[680px] px-1 sm:px-2">
      {/* Context & OCR Scanner Banner */}
      <div className="liquid-glass p-3 mb-2.5 shrink-0 space-y-2 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧑‍⚕️</span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider accent-text flex items-center gap-1">
                <span>Fizjolog AI + Skaner OCR</span>
              </span>
              <h2 className="text-xs font-bold txt-main leading-tight">
                Analiza Tekstowa Badań Krwi i Planów Treningowych
              </h2>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 live-pulse" title="Silnik OCR pol+eng aktywny" />
        </div>

        <div className="text-[10px] txt-muted flex flex-wrap gap-x-3 gap-y-1 border-t border-white/5 pt-1.5">
          <span>Waga: <strong className="txt-sub">{profile.weight} kg</strong></span>
          <span>VO2max: <strong className="txt-sub">{profile.vo2max}</strong></span>
          <span>HRmax: <strong className="txt-sub">{profile.hrMax} bpm</strong></span>
          <span>5K: <strong className="txt-sub">{profile.time5k}</strong></span>
          {lastRun && (
            <span>Ostatni bieg: <strong className="txt-sub">{lastRun.distanceKm} km ({lastRun.avgHr} bpm)</strong></span>
          )}
        </div>

        {/* Dedicated OCR Upload Buttons (Medical Results & Training Plans) */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <label className="cursor-pointer rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 px-2.5 py-2 flex items-center gap-2 transition-all active:scale-95">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'medical')}
              disabled={isLoading || isCompressingImage}
              className="hidden"
            />
            <Activity className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-black text-rose-200 leading-tight truncate">
                Wyniki Badań (OCR)
              </div>
              <div className="text-[8.5px] text-rose-300/80 truncate">
                Morfologia, Ferrytyna, D3
              </div>
            </div>
          </label>

          <label className="cursor-pointer rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 px-2.5 py-2 flex items-center gap-2 transition-all active:scale-95">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'training_plan')}
              disabled={isLoading || isCompressingImage}
              className="hidden"
            />
            <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-black text-sky-200 leading-tight truncate">
                Plan Treningowy (OCR)
              </div>
              <div className="text-[8.5px] text-sky-300/80 truncate">
                Zdjęcie rozpiski / tabeli
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const isOcrExpanded = Boolean(expandedOcrIds[m.id]);

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-ios`}
            >
              <div className="text-[10px] txt-muted mb-1 px-1 flex items-center gap-1.5">
                <span>{isUser ? profile.name : 'Fizjolog AI'} • {m.timestamp}</span>
                {m.ocrResult && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[8.5px] font-black uppercase">
                    OCR Zweryfikowano
                  </span>
                )}
              </div>

              <div
                className={`max-w-[92%] p-3.5 rounded-2xl text-xs space-y-2.5 ${
                  isUser
                    ? 'accent-bg text-black font-semibold rounded-br-none shadow-md'
                    : 'liquid-glass txt-main rounded-bl-none border border-white/10'
                }`}
              >
                {/* User Attached Image Preview */}
                {m.imageAttachmentUrl && (
                  <div className="rounded-xl overflow-hidden border border-black/20 bg-black/20 mb-2">
                    <img
                      src={m.imageAttachmentUrl}
                      alt="Przesłany dokument do analizy OCR"
                      className="w-full max-h-44 object-contain bg-slate-950"
                    />
                    <div className="px-2.5 py-1 bg-black/60 text-white text-[9px] font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ScanLine className="w-3 h-3 text-emerald-400" />
                        <span>Dokument przekazany do silnika OCR</span>
                      </span>
                      <span className="text-emerald-300">pol+eng</span>
                    </div>
                  </div>
                )}

                {/* Structured OCR Result Card (for Physiologist AI response) */}
                {m.ocrResult && (
                  <div className="rounded-xl bg-slate-950/80 border border-emerald-500/30 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-1.5">
                        <ScanLine className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                            Raport Rozpoznawania Tekstu OCR
                          </div>
                          <div className="text-[11px] font-black text-white">
                            {m.ocrResult.categoryLabel}
                          </div>
                        </div>
                      </div>
                      {m.ocrResult.confidence && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black shrink-0">
                          OCR {m.ocrResult.confidence}%
                        </span>
                      )}
                    </div>

                    {/* Extracted Biomarkers / Plan Metrics */}
                    {m.ocrResult.detectedParameters && m.ocrResult.detectedParameters.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider">
                          Wykryte parametry i wskaźniki ({m.ocrResult.detectedParameters.length}):
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {m.ocrResult.detectedParameters.map((param, idx) => {
                            const badgeStyle =
                              param.status === 'norma'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : param.status === 'niski'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : param.status === 'wysoki'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-sky-500/20 text-sky-300 border-sky-500/40';

                            const statusLabel =
                              param.status === 'norma'
                                ? 'W normie'
                                : param.status === 'niski'
                                ? 'Obniżony'
                                : param.status === 'wysoki'
                                ? 'Podwyższony'
                                : 'Odczytano';

                            return (
                              <div
                                key={`${param.name}-${idx}`}
                                className="p-2 rounded-lg bg-slate-900/90 border border-white/5 flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10.5px] font-bold text-slate-200">
                                    {param.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs font-black text-white font-mono">
                                      {param.value} {param.unit || ''}
                                    </span>
                                    <span
                                      className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${badgeStyle}`}
                                    >
                                      {param.status === 'norma' && <CheckCircle2 className="w-2.5 h-2.5" />}
                                      {(param.status === 'niski' || param.status === 'wysoki') && (
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                      )}
                                      {param.status === 'info' && <Info className="w-2.5 h-2.5" />}
                                      <span>{statusLabel}</span>
                                    </span>
                                  </div>
                                </div>
                                {param.referenceRange && (
                                  <div className="text-[9px] text-slate-400">
                                    Zakres odniesienia: <span className="text-slate-300">{param.referenceRange}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Raw OCR Extracted Text Viewer */}
                    {m.ocrResult.extractedText && (
                      <div className="pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => toggleExpandOcrText(m.id)}
                            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>
                              {isOcrExpanded
                                ? 'Ukryj surowy tekst odczytany przez OCR'
                                : 'Pokaż pełny tekst odczytany przez OCR'}
                            </span>
                            {isOcrExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyOcrText(m.id, m.ocrResult!.extractedText)}
                            className="text-[9.5px] text-slate-400 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5"
                            title="Kopiuj odczytany tekst OCR"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                                <span className="text-emerald-400">Skopiowano</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-2.5 h-2.5" />
                                <span>Kopiuj OCR</span>
                              </>
                            )}
                          </button>
                        </div>

                        {isOcrExpanded && (
                          <pre className="mt-1.5 p-2.5 rounded-lg bg-black/70 border border-white/10 text-[10px] text-slate-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                            {m.ocrResult.extractedText}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Main Message Text */}
                <div className="space-y-1">{isUser ? m.text : renderFormattedText(m.text)}</div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="liquid-glass p-3 rounded-2xl border border-emerald-500/30 flex items-center gap-2.5 text-xs txt-main animate-pulse">
            <ScanLine className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
            <div>
              <div className="font-black text-emerald-300 text-[11px]">
                Przetwarzanie przez Fizjologa AI & Silnik OCR...
              </div>
              <div className="text-[10px] txt-muted">
                Rozpoznawanie znaków (pol+eng) i analiza parametrów fizjologicznych
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Staged OCR Image Preview Drawer (when user selects a photo before sending) */}
      {stagedImageBase64 && (
        <div className="mt-2 p-2.5 rounded-2xl bg-slate-900/95 border border-emerald-500/40 space-y-2 shrink-0 animate-ios">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={stagedImageBase64}
                alt="Podgląd OCR"
                className="w-12 h-12 rounded-xl object-cover border border-white/15 shrink-0 bg-black"
              />
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                  <ScanLine className="w-3 h-3" />
                  <span>Gotowe do analizy OCR</span>
                </div>
                <div className="text-xs font-bold txt-main truncate">
                  {stagedFileName || 'Zdjęcie dokumentu'}
                </div>
                <div className="text-[9.5px] txt-muted">
                  Wybierz typ dokumentu i kliknij „Skanuj OCR ›”
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setStagedImageBase64(null);
                setStagedFileName('');
              }}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 shrink-0"
              aria-label="Usuń załącznik OCR"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Document Category Selector Pills */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'auto', label: '🔍 Auto-detekcja' },
              { id: 'medical', label: '🩸 Wyniki Badań Krwi' },
              { id: 'training_plan', label: '📅 Plan Treningowy' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setStagedDocType(cat.id as any)}
                className={`px-2 py-1 rounded-lg text-[9.5px] font-black border transition-all ${
                  stagedDocType === cat.id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950/70 text-slate-300 border-white/10 hover:border-white/25'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Prompts & 1-Click OCR Demo Chips */}
      <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => handleRunSampleOcr('medical')}
          disabled={isLoading || isCompressingImage}
          className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-200 text-[10px] font-black whitespace-nowrap hover:bg-rose-500/30 transition-all shrink-0 flex items-center gap-1"
          title="Przetestuj analizę OCR na przykładowych wynikach badań krwi biegacza"
        >
          <Sparkles className="w-3 h-3 text-rose-400" />
          <span>🧪 Demo OCR: Morfologia i Ferrytyna</span>
        </button>

        <button
          type="button"
          onClick={() => handleRunSampleOcr('training_plan')}
          disabled={isLoading || isCompressingImage}
          className="px-2.5 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-200 text-[10px] font-black whitespace-nowrap hover:bg-sky-500/30 transition-all shrink-0 flex items-center gap-1"
          title="Przetestuj analizę OCR na przykładowym zdjęciu planu treningowego"
        >
          <Sparkles className="w-3 h-3 text-sky-400" />
          <span>📋 Demo OCR: Plan 7-dniowy</span>
        </button>

        {QUICK_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleChipClick(q)}
            disabled={isLoading}
            className="liquid-pill px-2.5 py-1 text-[10px] font-bold txt-sub whitespace-nowrap hover:accent-text hover:border-[var(--accent)] transition-all shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input row with Camera/OCR File Picker */}
      <form onSubmit={handleSubmit} className="shrink-0 flex items-center gap-1.5 pt-0.5">
        <label
          title="Prześlij zdjęcie planu treningowego lub wyników badań do analizy OCR"
          className={`cursor-pointer liquid-pill w-10 h-10 flex items-center justify-center shrink-0 transition-all hover:border-emerald-400 ${
            stagedImageBase64
              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
              : 'txt-main'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, 'auto')}
            disabled={isLoading || isCompressingImage}
            className="hidden"
          />
          <Camera className="w-4 h-4 text-emerald-400" />
        </label>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            stagedImageBase64
              ? 'Dodaj pytanie do skanu OCR (opcjonalnie)...'
              : 'Zapytaj fizjologa lub prześlij zdjęcie (OCR)...'
          }
          className="flex-1 liquid-pill px-3.5 py-2.5 txt-main font-medium outline-none text-xs focus:border-[var(--accent)]"
        />

        <button
          type="submit"
          disabled={(!input.trim() && !stagedImageBase64) || isLoading || isCompressingImage}
          aria-label="Wyślij wiadomość lub skanuj dokument OCR"
          className="liquid-active px-3.5 py-2.5 text-xs font-black shrink-0 disabled:opacity-40 hover:brightness-110 flex items-center gap-1"
        >
          {stagedImageBase64 ? (
            <>
              <ScanLine className="w-3.5 h-3.5" />
              <span>Skanuj OCR ›</span>
            </>
          ) : (
            <span>Wyślij ›</span>
          )}
        </button>
      </form>
    </div>
  );
};
