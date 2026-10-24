import React, { useState, useEffect } from 'react';
import { RunLog, RunnerProfile, AchievementBadge, AchievementCategory, AchievementTier } from '../types.ts';
import {
  computeAchievements,
  getNewlyUnlockedBadges,
  markBadgesAsSeen,
} from '../utils/achievementEngine.ts';
import { AchievementCelebrationModal } from './AchievementCelebrationModal.tsx';
import { soundEngine } from '../utils/defaults.ts';

interface AchievementsViewProps {
  runs: RunLog[];
  profile: RunnerProfile;
  onEarnBamboos?: (amount: number, reason: string) => void;
  showToast?: (msg: string) => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  runs,
  profile,
  onEarnBamboos,
  showToast,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [celebratingBadge, setCelebratingBadge] = useState<AchievementBadge | null>(null);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [selectedBadgeForDetail, setSelectedBadgeForDetail] = useState<AchievementBadge | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Compute achievements and streak dynamically
  const {
    badges,
    streak,
    totalKm,
    totalRuns,
    unlockedCount,
    totalBadgesCount,
    totalPoints,
  } = computeAchievements(runs, profile);

  // Auto-detect newly unlocked badges and celebrate
  useEffect(() => {
    if (runs.length === 0) return;
    const newlyUnlocked = getNewlyUnlockedBadges(badges);
    if (newlyUnlocked.length > 0) {
      const badgeToCelebrate = newlyUnlocked[0];
      setCelebratingBadge(badgeToCelebrate);
      setIsCelebrationOpen(true);
      markBadgesAsSeen([badgeToCelebrate.id]);

      if (onEarnBamboos && badgeToCelebrate.rewardBamboos > 0) {
        onEarnBamboos(badgeToCelebrate.rewardBamboos, `Odznaka: ${badgeToCelebrate.title}`);
      }
      if (showToast) {
        showToast(`🎉 Odblokowano: ${badgeToCelebrate.title}! (+${badgeToCelebrate.rewardBamboos} 🎋)`);
      }
    }
  }, [runs, badges, onEarnBamboos, showToast]);

  const handleBadgeClick = (badge: AchievementBadge) => {
    soundEngine.playClick(true);
    if (badge.isUnlocked) {
      setCelebratingBadge(badge);
      setIsCelebrationOpen(true);
    } else {
      setSelectedBadgeForDetail(badge);
    }
  };

  const handleClaimReward = (bamboos: number) => {
    if (celebratingBadge) {
      markBadgesAsSeen([celebratingBadge.id]);
    }
    if (onEarnBamboos && bamboos > 0) {
      onEarnBamboos(bamboos, `Nagroda za odznakę: ${celebratingBadge?.title || 'Osiągnięcie'}`);
    }
    if (showToast) {
      showToast(`Odebrano +${bamboos} 🎋 bambusów!`);
    }
    setIsCelebrationOpen(false);
  };

  // Find next distance milestone
  const distanceMilestones = [
    { target: 1, label: 'Pierwszy Krok (1 bieg)' },
    { target: 50, label: 'Baza 50 KM' },
    { target: 100, label: 'Setka Pękła (100 KM Total)' },
    { target: 250, label: 'Mistrz Szosy 250 KM' },
    { target: 500, label: 'Biegowy Tytan 500 KM' },
  ];
  const safeTotalKm = Number(totalKm) || 0;
  const nextMilestone = distanceMilestones.find((m) => safeTotalKm < m.target) || {
    target: 1000,
    label: 'Klub Tysiąca (1000 KM)',
  };
  const kmToNextMilestone = Math.max(0, Number((nextMilestone.target - safeTotalKm).toFixed(1)));
  const milestoneProgress = Math.min(100, Math.round((safeTotalKm / nextMilestone.target) * 100));

  // Filtered badges list
  const filteredBadges = badges.filter((b) => {
    if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
    if (statusFilter === 'unlocked' && !b.isUnlocked) return false;
    if (statusFilter === 'locked' && b.isUnlocked) return false;
    return true;
  });

  const tierMeta: Record<AchievementTier, { label: string; tagClass: string; borderClass: string; iconBg: string }> = {
    bronze: {
      label: 'Brąz',
      tagClass: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
      borderClass: 'border-amber-700/40 hover:border-amber-500/70',
      iconBg: 'bg-amber-950/40 text-amber-200',
    },
    silver: {
      label: 'Srebro',
      tagClass: 'bg-slate-800/40 text-slate-200 border-slate-500/40',
      borderClass: 'border-slate-500/40 hover:border-slate-300/70',
      iconBg: 'bg-slate-800/50 text-slate-100',
    },
    gold: {
      label: 'Złoto',
      tagClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      borderClass: 'border-yellow-500/45 hover:border-yellow-400/80 shadow-yellow-500/5',
      iconBg: 'bg-amber-900/40 text-yellow-300',
    },
    platinum: {
      label: 'Platyna',
      tagClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
      borderClass: 'border-cyan-400/45 hover:border-cyan-300/80 shadow-cyan-500/5',
      iconBg: 'bg-cyan-950/50 text-cyan-200',
    },
    diamond: {
      label: 'Diament',
      tagClass: 'bg-purple-500/20 text-purple-200 border-purple-400/50',
      borderClass: 'border-purple-400/50 hover:border-purple-300/80 shadow-purple-500/10',
      iconBg: 'bg-purple-950/50 text-purple-200',
    },
  };

  return (
    <div className="space-y-3 animate-ios">
      {/* 1. COMPACT HERO BAR: STREAKS & KEY MILESTONE SUMMARY */}
      <div className="liquid-glass p-3.5 rounded-2xl relative overflow-hidden border border-white/10 space-y-3">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider accent-text flex items-center gap-1">
              <span>🎖️</span>
              <span>OSIĄGNIĘCIA & SERIE</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {unlockedCount} / {totalBadgesCount} zdobyte
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const demoBadge = badges.find((b) => b.isUnlocked) || badges[0];
              setCelebratingBadge(demoBadge);
              setIsCelebrationOpen(true);
            }}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-[10px] font-black text-white flex items-center gap-1 active:scale-95 transition-all"
            title="Podgląd uroczystej animacji z konfetti"
          >
            <span>🎉</span>
            <span>Celebracja</span>
          </button>
        </div>

        {/* 3 Compact Metric Pills */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/25">
            <div className="text-base font-black text-orange-400 flex items-center justify-center gap-1 ios-num">
              <span>🔥</span>
              <span>{streak.currentStreakDays}</span>
              <span className="text-[10px] font-bold text-orange-300/80">dni</span>
            </div>
            <div className="text-[9px] font-bold uppercase text-orange-300/90 truncate">
              Seria (Rekord: {streak.longestStreakDays}d)
            </div>
          </div>

          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/25">
            <div className="text-base font-black text-sky-400 flex items-center justify-center gap-1 ios-num">
              <span>⚡</span>
              <span>{safeTotalKm.toFixed(1)}</span>
              <span className="text-[10px] font-bold text-sky-300/80">km</span>
            </div>
            <div className="text-[9px] font-bold uppercase text-sky-300/90 truncate">
              Łączny Przebieg
            </div>
          </div>

          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
            <div className="text-base font-black text-emerald-400 flex items-center justify-center gap-1 ios-num">
              <span>🎋</span>
              <span>+{totalPoints}</span>
            </div>
            <div className="text-[9px] font-bold uppercase text-emerald-300/90 truncate">
              Punkty Bamboos
            </div>
          </div>
        </div>

        {/* Compact Next Milestone Slim Bar */}
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs">🎯</span>
              <span className="txt-muted text-[10px]">Cel:</span>
              <span className="font-bold txt-main truncate">{nextMilestone.label}</span>
            </div>
            <span className="font-black text-amber-300 tabular-nums shrink-0 text-[10px]">
              {safeTotalKm.toFixed(1)}/{nextMilestone.target} km ({milestoneProgress}%)
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[9px] txt-muted">
            <span>
              {kmToNextMilestone === 0
                ? 'Kamień milowy zdobyty!'
                : `Brakuje jeszcze ${kmToNextMilestone} km`}
            </span>
            <span className="text-slate-400 italic">{streak.streakStatusMessage}</span>
          </div>
        </div>
      </div>

      {/* 2. COMPACT CONTROLS: STATUS FILTER, CATEGORIES & VIEW SWITCH */}
      <div className="space-y-1.5">
        {/* Top Control Bar: Status Tabs + View Toggle */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Status Segmented Buttons */}
          <div className="inline-flex p-0.5 rounded-xl bg-white/5 border border-white/10 text-[11px]">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Wszystkie ({badges.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unlocked')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                statusFilter === 'unlocked'
                  ? 'bg-emerald-500/25 text-emerald-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>✓</span>
              <span>Zdobyte ({unlockedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('locked')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                statusFilter === 'locked'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔒</span>
              <span>Do zdobycia ({totalBadgesCount - unlockedCount})</span>
            </button>
          </div>

          {/* Grid vs List View Mode Toggle */}
          <div className="inline-flex p-0.5 rounded-xl bg-white/5 border border-white/10 text-[10px]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 px-2 rounded-lg font-bold transition-all flex items-center gap-1 ${
                viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Widok kafelków (siatka)"
            >
              <span>⊞</span>
              <span className="hidden sm:inline">Kafelki</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1 px-2 rounded-lg font-bold transition-all flex items-center gap-1 ${
                viewMode === 'list' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Widok listy (przejrzyste wiersze)"
            >
              <span>☰</span>
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {[
            { id: 'all', label: 'Wszystkie', icon: '✨' },
            { id: 'distance', label: 'Dystans', icon: '📍' },
            { id: 'streak', label: 'Serie dni', icon: '🔥' },
            { id: 'speed', label: 'Tempo & VO2', icon: '⚡' },
            { id: 'biomechanics', label: 'Biomechanika', icon: '⏱️' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 border ${
                selectedCategory === cat.id
                  ? 'bg-white/20 text-white border-white/30 shadow-sm'
                  : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. BADGES CONTAINER (GRID OR LIST) */}
      {viewMode === 'grid' ? (
        /* ULTRA-COMPACT, CRYSTAL-CLEAR GRID (3 COLUMNS ON MOBILE, 4-6 ON TABLET/DESKTOP) */
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
          {filteredBadges.map((badge) => {
            const meta = tierMeta[badge.tier];
            const isUnlocked = badge.isUnlocked;

            return (
              <div
                key={badge.id}
                onClick={() => handleBadgeClick(badge)}
                className={`p-2 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group active:scale-[0.97] ${
                  isUnlocked
                    ? `bg-white/[0.06] hover:bg-white/[0.12] ${meta.borderClass} shadow-sm backdrop-blur-md`
                    : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10 hover:border-white/20 backdrop-blur-sm'
                }`}
                style={{ minHeight: '96px' }}
              >
                {/* Top Row: Icon + Tier Label + Status */}
                <div className="flex items-center justify-between gap-1">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 border border-white/15 ${
                      isUnlocked
                        ? `${meta.iconBg} shadow-sm group-hover:scale-105 transition-transform`
                        : 'bg-black/40 text-white/40 grayscale'
                    }`}
                  >
                    {badge.icon}
                  </div>

                  <div className="flex items-center gap-0.5">
                    <span className={`text-[7px] font-black uppercase px-1 py-0.2 rounded border ${meta.tagClass}`}>
                      {meta.label}
                    </span>
                    {isUnlocked ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[8px] font-black shadow-sm">
                        ✓
                      </span>
                    ) : (
                      <span className="text-[8px] text-slate-500">
                        🔒
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Row: Title + Short Description */}
                <div className="my-1 min-w-0">
                  <h4 className={`text-[11px] font-bold leading-tight truncate ${isUnlocked ? 'text-white' : 'text-slate-300'}`}>
                    {badge.title}
                  </h4>
                  <p className="text-[9px] text-slate-400 line-clamp-1 leading-tight mt-0.5">
                    {badge.description}
                  </p>
                </div>

                {/* Bottom Row: Inline Mini Progress Bar + Stats */}
                <div className="space-y-0.5 pt-1 border-t border-white/5">
                  <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isUnlocked
                          ? 'bg-emerald-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-400'
                      }`}
                      style={{ width: `${badge.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[8px]">
                    <span className={`font-semibold tabular-nums truncate ${isUnlocked ? 'text-emerald-300' : 'text-slate-400'}`}>
                      {isUnlocked ? 'Zdobyta ✓' : `${badge.progressPercent}%`}
                    </span>
                    <span className="text-amber-300 font-bold shrink-0 flex items-center gap-0.5">
                      <span>🎋</span>
                      <span>+{badge.rewardBamboos}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT, ULTRA-CLEAR ROW LIST VIEW */
        <div className="space-y-1.5">
          {filteredBadges.map((badge) => {
            const meta = tierMeta[badge.tier];
            const isUnlocked = badge.isUnlocked;

            return (
              <div
                key={badge.id}
                onClick={() => handleBadgeClick(badge)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] group ${
                  isUnlocked
                    ? `bg-white/[0.06] hover:bg-white/[0.1] ${meta.borderClass}`
                    : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10 hover:border-white/20'
                }`}
              >
                {/* Left: Icon */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border border-white/15 ${
                    isUnlocked
                      ? `${meta.iconBg} shadow-sm group-hover:scale-105 transition-transform`
                      : 'bg-black/30 text-white/40 grayscale'
                  }`}
                >
                  {badge.icon}
                </div>

                {/* Middle: Title, Short Desc, and Inline Mini Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className={`text-xs font-bold truncate ${isUnlocked ? 'text-white' : 'text-slate-300'}`}>
                      {badge.title}
                    </h4>
                    <span className={`text-[8px] font-black uppercase px-1 py-0.2 rounded border ${meta.tagClass} shrink-0`}>
                      {meta.label}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {badge.description}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 sm:w-36 h-1 rounded-full bg-white/10 overflow-hidden shrink-0">
                      <div
                        className={`h-full rounded-full ${
                          isUnlocked ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'
                        }`}
                        style={{ width: `${badge.progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 tabular-nums">
                      {badge.currentValue} / {badge.targetValue} {badge.unit} ({badge.progressPercent}%)
                    </span>
                  </div>
                </div>

                {/* Right: Status / Reward Pill */}
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  {isUnlocked ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                      <span>✓</span>
                      <span className="hidden sm:inline">Zdobyta</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-0.5">
                      <span>🔒</span>
                      <span className="text-amber-400 tabular-nums">{badge.progressPercent}%</span>
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5">
                    <span>🎋</span>
                    <span>+{badge.rewardBamboos}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODAL: LOCKED BADGE REQUIREMENT / DETAIL POPUP */}
      {selectedBadgeForDetail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedBadgeForDetail(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-5 space-y-3.5 liquid-glass border border-white/20 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-black/50 border border-white/15 flex items-center justify-center text-2xl">
                  {selectedBadgeForDetail.icon}
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider">
                    {tierMeta[selectedBadgeForDetail.tier].label} • {selectedBadgeForDetail.category}
                  </span>
                  <h3 className="text-sm font-black text-white leading-tight">
                    {selectedBadgeForDetail.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBadgeForDetail(null)}
                className="w-7 h-7 rounded-full liquid-pill flex items-center justify-center text-xs text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedBadgeForDetail.description}
            </p>

            {/* Progress card */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Aktualny postęp</span>
                <span className="font-black text-amber-400 tabular-nums">
                  {selectedBadgeForDetail.currentValue} / {selectedBadgeForDetail.targetValue} {selectedBadgeForDetail.unit} ({selectedBadgeForDetail.progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                  style={{ width: `${selectedBadgeForDetail.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Coach Tip */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
              💡 <strong>Wskazówka Trenera:</strong> {selectedBadgeForDetail.tip}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <span>Nagroda po odblokowaniu:</span>
                <span>+{selectedBadgeForDetail.rewardBamboos} 🎋</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedBadgeForDetail(null)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
              >
                Rozumiem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CELEBRATORY MODAL POPUP */}
      <AchievementCelebrationModal
        isOpen={isCelebrationOpen}
        badge={celebratingBadge}
        onClose={() => setIsCelebrationOpen(false)}
        onClaimReward={handleClaimReward}
      />
    </div>
  );
};
