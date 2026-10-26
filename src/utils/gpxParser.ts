import { RunLog, RunSplit } from '../types.ts';

// Haversine formula to compute distance in meters between two coordinates
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface ParsedGpxResult {
  run: Omit<RunLog, 'id'>;
  pointCount: number;
  fileName: string;
}

export const SAMPLE_REAL_GPX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="Garmin Connect / Strava GPS" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <name>Trening Progowy GPS (Las Łagiewnicki)</name>
    <time>2026-10-21T06:30:00Z</time>
  </metadata>
  <trk>
    <name>Trening Progowy GPS (Las Łagiewnicki)</name>
    <type>running</type>
    <trkseg>
      <trkpt lat="51.8410" lon="19.4620"><ele>212.4</ele><time>2026-10-21T06:30:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>138</gpxtpx:hr><gpxtpx:cad>88</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions></trkpt>
      <trkpt lat="51.8495" lon="19.4650"><ele>218.0</ele><time>2026-10-21T06:34:55Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>149</gpxtpx:hr><gpxtpx:cad>89</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions></trkpt>
      <trkpt lat="51.8580" lon="19.4690"><ele>225.2</ele><time>2026-10-21T06:39:50Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>154</gpxtpx:hr><gpxtpx:cad>90</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions></trkpt>
      <trkpt lat="51.8665" lon="19.4730"><ele>234.6</ele><time>2026-10-21T06:44:42Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>158</gpxtpx:hr><gpxtpx:cad>91</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions></trkpt>
      <trkpt lat="51.8750" lon="19.4770"><ele>241.0</ele><time>2026-10-21T06:49:35Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>162</gpxtpx:hr><gpxtpx:cad>91</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions></trkpt>
      <trkpt lat="51.8670" lon="19.4820"><ele>232.0</ele><time>2026-10-21T06:54:25Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>157</gpxtpx:hr><gpxtpx:cad>90</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions></trkpt>
      <trkpt lat="51.8585" lon="19.4760"><ele>226.5</ele><time>2026-10-21T06:59:15Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>159</gpxtpx:hr><gpxtpx:cad>91</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions></trkpt>
      <trkpt lat="51.8498" lon="19.4695"><ele>219.0</ele><time>2026-10-21T07:04:05Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>163</gpxtpx:hr><gpxtpx:cad>92</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions></trkpt>
      <trkpt lat="51.8412" lon="19.4622"><ele>213.0</ele><time>2026-10-21T07:08:50Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>166</gpxtpx:hr><gpxtpx:cad>93</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions></trkpt>
    </trkseg>
  </trk>
</gpx>`;

export function parseGpxFile(
  xmlContent: string,
  fileName: string,
  sourceApp: RunLog['sourceApp'] = 'strava',
  shoeName: string = 'Asics Novablast 4'
): ParsedGpxResult {
  const trimmed = xmlContent.trim();

  // 1. Check if JSON activity format (Strava / Garmin / Polar JSON)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let data: any;
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error('Nieprawidłowy format pliku JSON.');
    }
    const item = Array.isArray(data) ? data[0] : data;
    if (!item || typeof item !== 'object') {
      throw new Error('Plik JSON nie zawiera obiektu treningu biegowego.');
    }
    const rawDistKm =
      item.distanceKm != null
        ? Number(item.distanceKm)
        : item.distance != null
        ? Number(item.distance) > 200
          ? Number(item.distance) / 1000
          : Number(item.distance)
        : 0;

    if (!rawDistKm || isNaN(rawDistKm) || rawDistKm <= 0) {
      throw new Error('Plik JSON nie zawiera prawidłowego dystansu biegu (distanceKm / distance).');
    }

    const distKm = +(rawDistKm.toFixed(2));
    const rawDurMin =
      item.durationMin != null
        ? Number(item.durationMin)
        : item.moving_time != null
        ? Number(item.moving_time) / 60
        : item.duration != null
        ? Number(item.duration) > 300
          ? Number(item.duration) / 60
          : Number(item.duration)
        : 0;
    const durMin = rawDurMin > 0 ? Math.max(1, Math.round(rawDurMin)) : Math.max(1, Math.round(distKm * 5.5));
    const paceTotalSec = Math.round(((rawDurMin > 0 ? rawDurMin * 60 : durMin * 60)) / distKm);
    const avgPace =
      item.avgPace || `${Math.floor(paceTotalSec / 60)}:${(paceTotalSec % 60).toString().padStart(2, '0')}`;
    const avgHr = item.avgHr || item.average_heartrate ? Math.round(Number(item.avgHr || item.average_heartrate)) : 0;
    const rawCad = item.avgCadence || item.average_cadence ? Number(item.avgCadence || item.average_cadence) : 0;
    const avgCadence = rawCad > 0 ? Math.round(rawCad < 120 ? rawCad * 2 : rawCad) : 0;

    return {
      pointCount: Number(item.pointCount) || (Array.isArray(item.routeCoords) ? item.routeCoords.length : 1),
      fileName,
      run: {
        title: item.name || item.title || `Import JSON (${distKm} km)`,
        sourceApp,
        date: (item.start_date_local || item.date || new Date().toISOString()).split('T')[0],
        distanceKm: distKm,
        durationMin: durMin,
        avgPace,
        avgHr,
        maxHr: item.maxHr || item.max_heartrate ? Math.round(Number(item.maxHr || item.max_heartrate)) : undefined,
        avgCadence,
        elevationGainM:
          item.total_elevation_gain != null || item.elevationGainM != null
            ? Math.round(Number(item.total_elevation_gain ?? item.elevationGainM))
            : 0,
        calories: item.calories != null ? Math.round(Number(item.calories)) : Math.round(distKm * 65),
        shoeName,
        routeCoords: Array.isArray(item.routeCoords) ? item.routeCoords : undefined,
        notes: `Zaimportowano z pliku JSON: ${fileName}.`,
      },
    };
  }

  // 2. Check if CSV format (Garmin / Strava / Polar CSV)
  if (!trimmed.startsWith('<') && trimmed.includes(',')) {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('Plik CSV nie zawiera wierszy danych treningowych.');
    }
    const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase());
    const cols = lines[1].split(',').map((c) => c.replace(/"/g, '').trim());

    const findCol = (keywords: string[]): string | undefined => {
      const idx = headers.findIndex((h) => keywords.some((k) => h.includes(k)));
      return idx >= 0 ? cols[idx] : undefined;
    };

    const distStr = findCol(['distance', 'dystans', 'km']);
    const rawDist = distStr ? parseFloat(distStr.replace(',', '.')) : NaN;
    if (isNaN(rawDist) || rawDist <= 0) {
      throw new Error('W pliku CSV nie znaleziono kolumny z prawidłowym dystansem (Distance / Dystans).');
    }
    const distKm = +(rawDist > 200 ? rawDist / 1000 : rawDist).toFixed(2);

    const timeStr = findCol(['time', 'duration', 'czas', 'moving time']);
    let durMin = 0;
    if (timeStr) {
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) durMin = Math.round(parts[0] * 60 + parts[1] + parts[2] / 60);
        else if (parts.length === 2) durMin = Math.round(parts[0] + parts[1] / 60);
      } else {
        const n = parseFloat(timeStr.replace(',', '.'));
        if (!isNaN(n) && n > 0) durMin = Math.round(n > 300 ? n / 60 : n);
      }
    }
    if (durMin <= 0) durMin = Math.max(1, Math.round(distKm * 5.5));

    const paceSec = Math.round((durMin * 60) / distKm);
    const avgPace = `${Math.floor(paceSec / 60)}:${String(paceSec % 60).padStart(2, '0')}`;

    const hrStr = findCol(['avg hr', 'average heart rate', 'heart rate', 'tętno', 'hr']);
    const avgHr = hrStr && !isNaN(parseInt(hrStr, 10)) ? parseInt(hrStr, 10) : 0;

    const maxHrStr = findCol(['max hr', 'max heart rate']);
    const maxHr = maxHrStr && !isNaN(parseInt(maxHrStr, 10)) ? parseInt(maxHrStr, 10) : undefined;

    const cadStr = findCol(['cadence', 'kadencja', 'spm']);
    const rawCad = cadStr && !isNaN(parseInt(cadStr, 10)) ? parseInt(cadStr, 10) : 0;
    const avgCadence = rawCad > 0 && rawCad < 120 ? rawCad * 2 : rawCad;

    const elevStr = findCol(['elev', 'ascent', 'wznios', 'przewyższenie']);
    const elevationGainM = elevStr && !isNaN(parseFloat(elevStr)) ? Math.round(parseFloat(elevStr)) : 0;

    const dateStr = findCol(['date', 'data', 'start']);
    const parsedDate =
      dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)
        ? dateStr.slice(0, 10)
        : new Date().toISOString().split('T')[0];

    const titleStr = findCol(['title', 'name', 'nazwa', 'activity']);

    return {
      pointCount: lines.length - 1,
      fileName,
      run: {
        title: titleStr ? `${titleStr} • ${distKm} km` : `Import CSV (${fileName.replace(/\.[^/.]+$/, '')}) • ${distKm} km`,
        sourceApp,
        date: parsedDate,
        distanceKm: distKm,
        durationMin: durMin,
        avgPace,
        avgHr,
        maxHr,
        avgCadence,
        elevationGainM,
        calories: Math.round(distKm * 65),
        shoeName,
        notes: `Zaimportowano z pliku CSV: ${fileName}.`,
      },
    };
  }

  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlContent, 'application/xml');

  // 3. Look for GPX trkpt/rtept OR Garmin TCX Trackpoint elements
  let pts = Array.from(xml.querySelectorAll('trkpt'));
  if (pts.length === 0) {
    pts = Array.from(xml.querySelectorAll('rtept'));
  }
  const isTcx = pts.length === 0 && xml.querySelectorAll('Trackpoint').length > 0;
  if (isTcx) {
    pts = Array.from(xml.querySelectorAll('Trackpoint'));
  }

  if (pts.length === 0) {
    throw new Error('Plik nie zawiera punktów trasy GPS (<trkpt> w GPX lub <Trackpoint> w Garmin TCX). Upewnij się, że plik jest poprawny.');
  }

  let totalDistM = 0;
  let totalElevationGainM = 0;
  let lastEle: number | null = null;
  const hrValues: number[] = [];
  const cadValues: number[] = [];
  const powerValues: number[] = [];
  const allCoords: [number, number][] = [];

  const splits: RunSplit[] = [];
  let currentKmIndex = 1;
  let distInCurrentKm = 0;
  let kmStartTimeMs: number | null = null;
  let kmStartEle: number | null = null;
  let kmElevGain = 0;
  let kmHrValues: number[] = [];

  let startTime: number | null = null;
  let endTime: number | null = null;

  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    const latAttr = pt.getAttribute('lat') || pt.querySelector('LatitudeDegrees')?.textContent || '0';
    const lonAttr = pt.getAttribute('lon') || pt.querySelector('LongitudeDegrees')?.textContent || '0';
    const lat = parseFloat(latAttr);
    const lon = parseFloat(lonAttr);

    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      allCoords.push([lat, lon]);
    }

    // Time
    const timeNode = pt.querySelector('time') || pt.querySelector('Time');
    let t: number | undefined;
    if (timeNode?.textContent) {
      const parsedTime = Date.parse(timeNode.textContent);
      if (!isNaN(parsedTime)) {
        t = parsedTime;
        if (startTime === null) startTime = parsedTime;
        if (kmStartTimeMs === null) kmStartTimeMs = parsedTime;
        endTime = parsedTime;
      }
    }

    // Distance calculation
    const tcxDistNode = pt.querySelector('DistanceMeters');
    if (isTcx && tcxDistNode?.textContent) {
      const dVal = parseFloat(tcxDistNode.textContent);
      if (!isNaN(dVal) && dVal >= totalDistM) {
        distInCurrentKm += dVal - totalDistM;
        totalDistM = dVal;
      }
    } else if (i > 0 && lat !== 0 && lon !== 0) {
      const prevPt = pts[i - 1];
      const prevLat = parseFloat(prevPt.getAttribute('lat') || prevPt.querySelector('LatitudeDegrees')?.textContent || '0');
      const prevLon = parseFloat(prevPt.getAttribute('lon') || prevPt.querySelector('LongitudeDegrees')?.textContent || '0');
      const segmentDist = haversineDistanceMeters(prevLat, prevLon, lat, lon);
      if (segmentDist < 5000) {
        totalDistM += segmentDist;
        distInCurrentKm += segmentDist;
      }
    }

    // Elevation
    const eleNode = pt.querySelector('ele') || pt.querySelector('AltitudeMeters');
    if (eleNode?.textContent) {
      const ele = parseFloat(eleNode.textContent);
      if (!isNaN(ele)) {
        if (kmStartEle === null) kmStartEle = ele;
        if (lastEle !== null && ele > lastEle) {
          const delta = ele - lastEle;
          totalElevationGainM += delta;
          kmElevGain += delta;
        }
        lastEle = ele;
      }
    }

    // Heart rate
    const hrNode =
      pt.querySelector('hr') ||
      pt.querySelector('gpxtpx\\:hr') ||
      pt.querySelector('[nodeName="gpxtpx:hr"]') ||
      pt.querySelector('HeartRateBpm > Value') ||
      pt.querySelector('Value');
    if (hrNode?.textContent) {
      const hr = parseInt(hrNode.textContent, 10);
      if (!isNaN(hr) && hr > 40 && hr < 240) {
        hrValues.push(hr);
        kmHrValues.push(hr);
      }
    }

    // Cadence
    const cadNode =
      pt.querySelector('cad') ||
      pt.querySelector('gpxtpx\\:cad') ||
      pt.querySelector('[nodeName="gpxtpx:cad"]') ||
      pt.querySelector('Cadence') ||
      pt.querySelector('RunCadence');
    if (cadNode?.textContent) {
      let cad = parseInt(cadNode.textContent, 10);
      if (!isNaN(cad) && cad > 20) {
        if (cad < 120) cad *= 2;
        cadValues.push(cad);
      }
    }

    // Running Power (Watts) if present in GPX/TCX extensions
    const wattsNode =
      pt.querySelector('watts') ||
      pt.querySelector('power') ||
      pt.querySelector('Watts') ||
      pt.querySelector('[nodeName="ns3:Watts"]');
    if (wattsNode?.textContent) {
      const w = parseInt(wattsNode.textContent, 10);
      if (!isNaN(w) && w > 30 && w < 1000) {
        powerValues.push(w);
      }
    }

    // Real per-kilometer split calculation from trackpoints
    if (distInCurrentKm >= 1000) {
      let splitPaceStr = '5:15';
      if (t && kmStartTimeMs && t > kmStartTimeMs) {
        const kmSec = Math.round(((t - kmStartTimeMs) / 1000) * (1000 / distInCurrentKm));
        const pM = Math.floor(kmSec / 60);
        const pS = kmSec % 60;
        splitPaceStr = `${pM}:${pS < 10 ? '0' : ''}${pS}`;
      }
      const splitHr =
        kmHrValues.length > 0
          ? Math.round(kmHrValues.reduce((a, b) => a + b, 0) / kmHrValues.length)
          : hrValues.length > 0
          ? hrValues[hrValues.length - 1]
          : 0;

      splits.push({
        km: currentKmIndex,
        pace: splitPaceStr,
        hr: splitHr,
        elevation: Math.round(kmElevGain),
      });

      currentKmIndex++;
      distInCurrentKm -= 1000;
      kmStartTimeMs = t ?? kmStartTimeMs;
      kmElevGain = 0;
      kmHrValues = [];
    }
  }

  if (totalDistM <= 0) {
    throw new Error('Plik GPX/TCX nie zawiera prawidłowego dystansu między punktami trasy GPS.');
  }

  const distanceKm = Math.max(0.1, +(totalDistM / 1000).toFixed(2));
  const totalSec =
    startTime && endTime && endTime > startTime
      ? Math.round((endTime - startTime) / 1000)
      : Math.round(distanceKm * 315);
  const durationMin = Math.max(1, Math.round(totalSec / 60));

  // Pace formatting from exact elapsed seconds
  const paceTotalSec = Math.round(totalSec / distanceKm);
  const pMin = Math.floor(paceTotalSec / 60);
  const pSec = paceTotalSec % 60;
  const avgPace = `${pMin}:${pSec < 10 ? '0' : ''}${pSec}`;

  const avgHr = hrValues.length > 0 ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : 0;
  const maxHr = hrValues.length > 0 ? Math.max(...hrValues) : undefined;
  const avgCadence = cadValues.length > 0 ? Math.round(cadValues.reduce((a, b) => a + b, 0) / cadValues.length) : 0;
  const avgPowerW =
    powerValues.length > 0 ? Math.round(powerValues.reduce((a, b) => a + b, 0) / powerValues.length) : undefined;

  // Biomechanics derived only when cadence is present
  const gctMs = avgCadence > 0 ? Math.round(270 - Math.min(50, (avgCadence - 160) * 1.5)) : undefined;
  const vertOscCm = avgCadence > 0 ? +(9.2 - Math.min(2.5, (avgCadence - 160) * 0.08)).toFixed(1) : undefined;
  const speedMetersPerMin = (distanceKm * 1000) / Math.max(1, totalSec / 60);
  const strideLengthM = avgCadence > 0 ? +(speedMetersPerMin / avgCadence).toFixed(2) : undefined;

  // Downsample GPS routeCoords to max 140 points for smooth map rendering
  const maxMapPoints = 140;
  const step = Math.max(1, Math.ceil(allCoords.length / maxMapPoints));
  const routeCoords: { lat: number; lng: number }[] = allCoords
    .filter((_, idx) => idx % step === 0 || idx === allCoords.length - 1)
    .map(([lat, lng]) => ({ lat, lng }));

  const trkName = xml.querySelector('trk > name')?.textContent || xml.querySelector('metadata > name')?.textContent;
  const cleanName = trkName || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const activityDate = startTime ? new Date(startTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  return {
    pointCount: pts.length,
    fileName,
    run: {
      title: cleanName.length > 2 ? `${cleanName} • ${distanceKm} km` : `Trening GPS (${distanceKm} km)`,
      sourceApp,
      date: activityDate,
      distanceKm,
      durationMin,
      avgPace,
      avgHr,
      maxHr,
      avgCadence,
      strideLengthM,
      gctMs,
      verticalOscillationCm: vertOscCm,
      elevationGainM: Math.round(totalElevationGainM),
      calories: Math.round(distanceKm * 65),
      powerW: avgPowerW,
      shoeName,
      routeCoords: routeCoords.length >= 2 ? routeCoords : undefined,
      notes: `Zaimportowano z pliku ${fileName} (${pts.length} punktów GPS${avgHr > 0 ? `, śr. HR: ${avgHr} bpm` : ''}${avgCadence > 0 ? `, kadencja: ${avgCadence} spm` : ''}).`,
      splits: splits.length > 0 ? splits : undefined,
      analysis: {
        whatWentWell: [
          `Zweryfikowany ślad GPS (${pts.length} pkt, ${distanceKm} km)`,
          ...(avgCadence > 0 ? [`Średnia kadencja ${avgCadence} spm${strideLengthM ? ` i krok ${strideLengthM} m` : ''}`] : []),
        ],
        whatWentWrong: [],
        planAdaptation: 'Bieg włączony do bilansu obciążenia mikrocyklu.',
        trainingLoad: Math.round(distanceKm * 8.5),
        readinessImpact: 'Obciążenie tlenowe zrealizowane zgodnie z zapisem GPS',
      },
    },
  };
}


