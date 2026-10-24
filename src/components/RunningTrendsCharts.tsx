import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Activity, Zap, TrendingUp, Clock, Flame, Footprints, Sliders, Calendar } from 'lucide-react';
import { RunLog } from '../types.ts';

interface RunningTrendsChartsProps {
  runs: RunLog[];
  onSelectRun?: (run: RunLog) => void;
}

// Convert "5:30" or "05:30" pace string to decimal minutes (e.g. 5.50)
function paceStringToDecimal(paceStr: string | undefined): number {
  if (!paceStr) return 5.5;
  const parts = paceStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return +(parts[0] + parts[1] / 60).toFixed(2);
  }
  const floatVal = parseFloat(paceStr);
  return !isNaN(floatVal) ? floatVal : 5.5;
}

// Format decimal minutes back to "5:30 /km"
function formatDecimalToPace(val: number): string {
  if (isNaN(val) || val <= 0) return '--:--';
  const min = Math.floor(val);
  const sec = Math.round((val - min) * 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

export const RunningTrendsCharts: React.FC<RunningTrendsChartsProps> = ({ runs, onSelectRun }) => {
  const [rangeFilter, setRangeFilter] = useState<'all' | '15' | '7'>('all');
  const [chartView, setChartView] = useState<'combined' | 'pace_dist' | 'biomechanics'>('combined');

  // Sort runs chronologically (oldest to newest) for true historical trend lines
  const sortedRuns = useMemo(() => {
    const list = [...runs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (rangeFilter === '7') return list.slice(-7);
    if (rangeFilter === '15') return list.slice(-15);
    return list;
  }, [runs, rangeFilter]);

  // Transform data for recharts
  const chartData = useMemo(() => {
    return sortedRuns.map((r, index) => {
      const paceDecimal = paceStringToDecimal(r.avgPace);
      const cadence = Number(r.avgCadence) || (r.distanceKm > 10 ? 174 : 176);
      const gct = Number(r.gctMs) || (cadence >= 180 ? 218 : cadence >= 174 ? 228 : 242);
      const dateLabel = r.date ? r.date.slice(5) : `Bieg ${index + 1}`; // MM-DD
      const fullDate = r.date || 'Brak daty';

      return {
        id: r.id,
        runObj: r,
        title: r.title || `Bieg ${r.distanceKm} km`,
        date: dateLabel,
        fullDate,
        distanceKm: Number(r.distanceKm) || 0,
        paceDecimal,
        paceFormatted: r.avgPace || formatDecimalToPace(paceDecimal),
        cadence,
        gct,
        avgHr: Number(r.avgHr) || 150,
        shoeName: r.shoeName || 'Buty treningowe',
        calories: Number(r.calories) || Math.round((r.distanceKm || 5) * 68),
      };
    });
  }, [sortedRuns]);

  // Aggregate stats over filtered range
  const summary = useMemo(() => {
    if (chartData.length === 0) {
      return { totalKm: 0, bestPace: '--:--', avgCadence: 0, avgGct: 0, avgDistance: 0 };
    }
    const totalKm = +chartData.reduce((acc, d) => acc + d.distanceKm, 0).toFixed(1);
    const avgDistance = +(totalKm / chartData.length).toFixed(1);
    const bestPaceDecimal = Math.min(...chartData.map((d) => d.paceDecimal));
    const avgCadence = Math.round(chartData.reduce((acc, d) => acc + d.cadence, 0) / chartData.length);
    const avgGct = Math.round(chartData.reduce((acc, d) => acc + d.gct, 0) / chartData.length);

    return {
      totalKm,
      avgDistance,
      bestPace: formatDecimalToPace(bestPaceDecimal),
      avgCadence,
      avgGct,
    };
  }, [chartData]);

  if (runs.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-[var(--surface-tile)] border border-[var(--border-subtle)] text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-2xl mx-auto shadow-sm">
          📈
        </div>
        <h4 className="text-sm font-black txt-main">Brak danych do wykresu trendów</h4>
        <p className="text-xs txt-muted max-w-sm mx-auto">
          Zarejestruj pierwsze biegi, aby odblokować zaawansowane wykresy liniowe tempa, dystansu, kadencji oraz czasu kontaktu stopy z podłożem (GCT).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-ios">
      {/* 1. Header with Range Filter & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black txt-main">Zaawansowane Trendy Biegowe (Recharts)</h3>
            <span className="text-[10px] txt-muted">
              Dynamika postępów w czasie • {chartData.length} analizowanych jednostek
            </span>
          </div>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <div className="p-0.5 rounded-xl bg-[var(--surface-tile-hover)] flex items-center border border-[var(--border-subtle)] text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setRangeFilter('7')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                rangeFilter === '7' ? 'bg-orange-500 text-slate-950 font-black shadow-sm' : 'txt-sub hover:text-white'
              }`}
            >
              Ost. 7
            </button>
            <button
              type="button"
              onClick={() => setRangeFilter('15')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                rangeFilter === '15' ? 'bg-orange-500 text-slate-950 font-black shadow-sm' : 'txt-sub hover:text-white'
              }`}
            >
              Ost. 15
            </button>
            <button
              type="button"
              onClick={() => setRangeFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                rangeFilter === 'all' ? 'bg-orange-500 text-slate-950 font-black shadow-sm' : 'txt-sub hover:text-white'
              }`}
            >
              Wszystkie ({runs.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Highlight Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bento-tile p-3">
          <div className="flex items-center gap-1.5 text-[10px] txt-muted font-bold uppercase">
            <Activity className="w-3 h-3 text-orange-400" />
            <span>Suma / Średnia</span>
          </div>
          <div className="mt-1">
            <span className="text-lg font-black txt-main font-mono">{summary.totalKm}</span>
            <span className="text-[10px] txt-muted ml-1">km ({summary.avgDistance} km/bieg)</span>
          </div>
        </div>

        <div className="bento-tile p-3">
          <div className="flex items-center gap-1.5 text-[10px] txt-muted font-bold uppercase">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>Najszybsze tempo</span>
          </div>
          <div className="mt-1">
            <span className="text-lg font-black text-sky-400 font-mono">{summary.bestPace}</span>
            <span className="text-[10px] txt-muted ml-1">/km</span>
          </div>
        </div>

        <div className="bento-tile p-3">
          <div className="flex items-center gap-1.5 text-[10px] txt-muted font-bold uppercase">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Śr. Kadencja</span>
          </div>
          <div className="mt-1">
            <span className="text-lg font-black text-emerald-400 font-mono">{summary.avgCadence}</span>
            <span className="text-[10px] txt-muted ml-1">spm {summary.avgCadence >= 178 ? '🔥' : '⚡'}</span>
          </div>
        </div>

        <div className="bento-tile p-3">
          <div className="flex items-center gap-1.5 text-[10px] txt-muted font-bold uppercase">
            <Zap className="w-3 h-3 text-purple-400" />
            <span>Śr. Czas GCT</span>
          </div>
          <div className="mt-1">
            <span className="text-lg font-black text-purple-400 font-mono">{summary.avgGct}</span>
            <span className="text-[10px] txt-muted ml-1">ms {summary.avgGct <= 230 ? '🎯' : ''}</span>
          </div>
        </div>
      </div>

      {/* 3. CHART 1: Trend Tempa (Pace) & Dystansu w czasie */}
      <div className="bento-tile p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
            <h4 className="text-xs font-black uppercase tracking-wider txt-main">
              Trend Tempa (min/km) & Dystansu (km)
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-orange-400">
              <span className="w-2.5 h-1 rounded bg-orange-400 inline-block" /> Dystans (km)
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <span className="w-2.5 h-1 rounded bg-sky-400 inline-block" /> Tempo (min/km)
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0] && onSelectRun) {
                  onSelectRun(e.activePayload[0].payload.runObj);
                }
              }}
            >
              <defs>
                <linearGradient id="distGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
              />
              {/* Lewa oś: Dystans (km) */}
              <YAxis
                yAxisId="left"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: '#f97316' }}
                tickFormatter={(val) => `${val}k`}
                tickLine={false}
              />
              {/* Prawa oś: Tempo w minutach na km (odwrócona, aby szybsze tempo było na górze!) */}
              <YAxis
                yAxisId="right"
                orientation="right"
                reversed={true}
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: '#38bdf8' }}
                tickFormatter={(val) => formatDecimalToPace(val)}
                tickLine={false}
                domain={['dataMin - 0.3', 'dataMax + 0.3']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 rounded-2xl bg-slate-950/95 border border-orange-500/40 shadow-2xl space-y-1.5 text-xs text-white max-w-xs backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
                          <span className="font-black text-orange-400">{data.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{data.fullDate}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-0.5">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Dystans</span>
                            <span className="font-bold text-orange-400 font-mono">{data.distanceKm} km</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Tempo</span>
                            <span className="font-bold text-sky-400 font-mono">{data.paceFormatted} /km</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Tętno śr.</span>
                            <span className="font-bold text-rose-400 font-mono">{data.avgHr} bpm</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Obuwie</span>
                            <span className="font-bold text-slate-200 truncate block text-[10px]">{data.shoeName}</span>
                          </div>
                        </div>
                        <div className="text-[9px] text-slate-500 pt-1 text-center border-t border-white/5">
                          Kliknij punkt, aby otworzyć szczegóły biegu
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="distanceKm"
                fill="url(#distGradient)"
                radius={[6, 6, 0, 0]}
                barSize={16}
                name="Dystans"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="paceDecimal"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                name="Tempo"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] txt-muted leading-relaxed">
          💡 Wykres łączy słupki objętości (pomarańczowy dystans w km) z dynamiczną krzywą tempa (błękitna linia). Prawa oś tempa jest zorientowana tak, że wyższe punkty oznaczają szybszy bieg.
        </p>
      </div>

      {/* 4. CHART 2: Biomechanika - Kadencja & Czas Kontaktu z Podłożem (GCT) */}
      <div className="bento-tile p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <h4 className="text-xs font-black uppercase tracking-wider txt-main">
              Biomechanika Kroku: Kadencja (spm) vs Czas Kontaktu GCT (ms)
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-1 rounded bg-emerald-400 inline-block" /> Kadencja (spm)
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="w-2.5 h-1 rounded bg-purple-400 inline-block" /> Czas GCT (ms)
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0] && onSelectRun) {
                  onSelectRun(e.activePayload[0].payload.runObj);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
              />
              {/* Lewa oś: Kadencja (spm) */}
              <YAxis
                yAxisId="left"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: '#34d399' }}
                domain={['dataMin - 6', 'dataMax + 6']}
                tickFormatter={(val) => `${val}`}
                tickLine={false}
              />
              {/* Prawa oś: GCT (ms) - odwrócona, bo MNIEJSZY czas kontaktu to LEPSZA sprężystość i dynamika! */}
              <YAxis
                yAxisId="right"
                orientation="right"
                reversed={true}
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: '#c084fc' }}
                domain={['dataMin - 15', 'dataMax + 15']}
                tickFormatter={(val) => `${val}ms`}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 rounded-2xl bg-slate-950/95 border border-emerald-500/40 shadow-2xl space-y-1.5 text-xs text-white max-w-xs backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
                          <span className="font-black text-emerald-400">{data.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{data.fullDate}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-0.5">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Kadencja</span>
                            <span className="font-bold text-emerald-400 font-mono">{data.cadence} spm</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Czas Kontaktu</span>
                            <span className="font-bold text-purple-400 font-mono">{data.gct} ms</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Dystans</span>
                            <span className="font-bold text-orange-400 font-mono">{data.distanceKm} km</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Tempo</span>
                            <span className="font-bold text-sky-400 font-mono">{data.paceFormatted} /km</span>
                          </div>
                        </div>
                        <div className="text-[9px] text-slate-400 pt-1 border-t border-white/5">
                          {data.cadence >= 178 && data.gct <= 230
                            ? '✨ Mistrzowska kadencja i krótki kontakt stopy!'
                            : 'Zwiększenie kadencji pomoże skrócić czas kontaktu z podłożem.'}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Linia wzorcowa kadencji 180 spm */}
              <ReferenceLine
                yAxisId="left"
                y={180}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{ value: 'Cel: 180 spm', fill: '#10b981', fontSize: 9, position: 'insideTopLeft' }}
              />
              {/* Linia wzorcowa optymalnego GCT <230 ms */}
              <ReferenceLine
                yAxisId="right"
                y={230}
                stroke="#a855f7"
                strokeDasharray="4 4"
                label={{ value: 'GCT <230ms', fill: '#c084fc', fontSize: 9, position: 'insideBottomRight' }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cadence"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#10b981', stroke: '#0f172a', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                name="Kadencja"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="gct"
                stroke="#c084fc"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#c084fc', stroke: '#0f172a', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#c084fc', stroke: '#ffffff', strokeWidth: 2 }}
                name="GCT Kontakt"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] txt-muted leading-relaxed">
          ⚡ Wykres biomechaniczny monitoruje synchronizację rytmu biegu (zielona linia kadencji) oraz sprężystości lądowania (fioletowa linia czasu kontaktu stopy). Optymalna relacja to kadencja &gt; 178 spm przy GCT &lt; 230 ms.
        </p>
      </div>
    </div>
  );
};
