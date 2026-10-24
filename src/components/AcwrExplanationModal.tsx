import React from 'react';
import { useLockBodyScroll } from '../utils/useLockBodyScroll.ts';

interface AcwrExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAcwr?: number;
}

export const AcwrExplanationModal: React.FC<AcwrExplanationModalProps> = ({
  isOpen,
  onClose,
  currentAcwr = 1.08,
}) => {
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  // Evaluate ACWR Status
  let statusName = '🟢 Złoty Środek (Sweet Spot)';
  let statusColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  let statusBadge = 'Optymalne Obciążenie';
  let adviceText =
    'Obciążenie z tego tygodnia jest o 8% wyższe od Twojej średniej z ostatnich 4 tygodni. To idealne tempo budowania formy bez przeciążania stawów i ścięgien.';

  if (currentAcwr > 1.5) {
    statusName = '🔴 Strefa Przeciążenia (Danger Zone)';
    statusColor = 'text-rose-400 border-rose-500/40 bg-rose-500/10';
    statusBadge = 'Wysokie Ryzyko Kontuzji';
    adviceText =
      'Uwaga! Kilometraż wzrósł zbyt gwałtownie (>50% w stosunku do średniej). Zwiększone ryzyko kontuzji – zalecamy zmniejszenie dystansu lub dodatkową regenerację.';
  } else if (currentAcwr > 1.3) {
    statusName = '🟡 Strefa Wysokiej Intensywności';
    statusColor = 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    statusBadge = 'Szybki Skok Formy';
    adviceText =
      'Intensywność treningu mocno rośnie. Forma rośnie szybko, ale monitoruj reakcję aparatu ruchu (kolana, ścięgno Achillesa).';
  } else if (currentAcwr < 0.8) {
    statusName = '🔵 Strefa Spadku Obciążenia (Regeneracja)';
    statusColor = 'text-sky-400 border-sky-500/40 bg-sky-500/10';
    statusBadge = 'Odpoczynek / Tapering';
    adviceText =
      'Bieżący kilometraż jest niższy od średniej. Dobre na tydzień regeneracyjny lub okres wypoczynku przed startem w zawodach.';
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-4 overscroll-contain h-[100dvh] w-screen overflow-y-auto animate-ios">
      <div className="liquid-glass w-full max-w-lg p-6 space-y-4 border border-emerald-500/30 shadow-2xl rounded-3xl relative my-auto max-h-[90dvh] overflow-y-auto no-scrollbar">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-sm transition-all"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-2xl flex items-center justify-center shadow-lg shrink-0">
            📈
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Fizjologia & Bezpieczeństwo AI
            </span>
            <h2 className="text-base font-black txt-main mt-0.5">
              Czym jest Wskaźnik Obciążenia ACWR?
            </h2>
          </div>
        </div>

        {/* Current Score Banner */}
        <div className={`p-3.5 rounded-2xl border text-left space-y-1.5 ${statusColor}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider">
              Twój Wynik: ACWR {currentAcwr.toFixed(2)}
            </span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-black/40 border border-current">
              {statusBadge}
            </span>
          </div>
          <div className="text-sm font-bold">{statusName}</div>
          <p className="text-xs leading-relaxed opacity-90">{adviceText}</p>
        </div>

        {/* Simple Plain-Polish Explanation */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 text-xs">
          <h3 className="text-xs font-black txt-main uppercase tracking-wider flex items-center gap-1.5">
            <span>💡</span>
            <span>Co oznacza ten skrót w prostych słowach?</span>
          </h3>

          <p className="txt-sub leading-relaxed">
            <strong>ACWR (Acute-to-Chronic Workload Ratio)</strong> to uznany na świecie wskaźnik medycyny sportowej, który porównuje Twój <strong>kilometraż z ostatniego tygodnia</strong> do Twojej <strong>średniej z ostatnich 4 tygodni</strong>.
          </p>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="text-[11px] font-bold txt-main flex items-center justify-between">
              <span>Wzór matematyczny:</span>
              <span className="font-mono accent-text">Ostatni Tydzień ÷ Średnia 4 Tygodni</span>
            </div>
            <div className="text-[11px] txt-muted">
              Przykład: 28.5 km (ten tydzień) ÷ 26.4 km (średnia) = <strong>1.08</strong>
            </div>
          </div>
        </div>

        {/* Safety Zones Legend */}
        <div className="space-y-2 text-xs">
          <div className="text-[10px] font-black uppercase tracking-wider txt-muted">
            Prosta Legenda Stref Bezpieczeństwa:
          </div>

          <div className="grid grid-cols-1 gap-1.5 text-[11px]">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300">
              <span className="font-bold">🟢 0.80 - 1.30 • Złoty Środek (Sweet Spot)</span>
              <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-black">
                Idealny Przyrost Formy
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300">
              <span className="font-bold">🟡 1.31 - 1.50 • Strefa Ostrzegawcza</span>
              <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded font-black">
                Szybki Skok
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300">
              <span className="font-bold">🔴 &gt; 1.50 • Strefa Kontuzji</span>
              <span className="text-[10px] bg-rose-500/20 px-2 py-0.5 rounded font-black">
                Ryzyko Urazu 4x Wyższe
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-2xl accent-btn-gradient text-xs font-black uppercase tracking-wider shadow-xl active:scale-95 transition-all"
        >
          Rozumiem • Zamknij i Wróć do Treningu
        </button>
      </div>
    </div>
  );
};
