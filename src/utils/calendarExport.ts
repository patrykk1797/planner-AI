/**
 * Calendar Export Utilities for Treda Running App
 * Supports:
 * 1. Google Calendar (direct URL template with full prefilled event, notes, location)
 * 2. iOS / Apple Calendar (.ics format with native alarms & triggers)
 * 3. System / Outlook / Android (.ics standard RFC 5545 file)
 */

export interface CalendarEventData {
  title: string;
  description: string;
  location: string;
  dateStr: string; // YYYY-MM-DD
  startTime?: string; // HH:mm, default "09:00"
  durationMinutes?: number; // default based on distance
  weatherNote?: string;
  gearAdvice?: string;
  hydrationAdvice?: string;
  distanceKm?: number;
  alarms?: Array<{ trigger: string; description: string }>;
}

/**
 * Format a Date to UTC string for iCal (YYYYMMDDTHHmmssZ)
 */
function formatDateToIcalUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Format date for Google Calendar URL (YYYYMMDDTHHmmssZ)
 */
function formatGoogleCalendarDate(date: Date): string {
  return formatDateToIcalUtc(date);
}

/**
 * Escape text for iCalendar RFC 5545 specs
 */
function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Calculate start and end Dates from event data
 */
export function getEventDateTimes(event: CalendarEventData): { start: Date; end: Date } {
  const time = event.startTime || '09:00';
  const [hours, minutes] = time.split(':').map((n) => parseInt(n, 10) || 0);

  const [year, month, day] = event.dateStr.split('-').map((n) => parseInt(n, 10) || 0);
  const start = new Date(year, (month || 1) - 1, day || 1, hours, minutes, 0);

  let durationMin = event.durationMinutes;
  if (!durationMin) {
    const dist = event.distanceKm || 10;
    if (dist <= 5) durationMin = 45;
    else if (dist <= 10) durationMin = 75;
    else if (dist <= 21.1) durationMin = 150;
    else if (dist <= 42.2) durationMin = 270;
    else durationMin = 360;
  }

  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  return { start, end };
}

/**
 * Build rich event description including weather notes, gear advice and hydration
 */
export function buildEventFullDescription(event: CalendarEventData): string {
  const lines: string[] = [];

  if (event.distanceKm) {
    lines.push(`🏃 Dystans: ${event.distanceKm} km`);
  }
  lines.push(`📍 Lokalizacja: ${event.location}`);

  if (event.weatherNote) {
    lines.push(``);
    lines.push(`🌤️ PROGNOZA & WARUNKI POGODOWE (Search Grounding):`);
    lines.push(event.weatherNote);
  }

  if (event.gearAdvice) {
    lines.push(``);
    lines.push(`👟 REKOMENDACJA UBIORU I OBUWIA:`);
    lines.push(event.gearAdvice);
  }

  if (event.hydrationAdvice) {
    lines.push(``);
    lines.push(`💧 STRATEGIA NAWODNIENIA:`);
    lines.push(event.hydrationAdvice);
  }

  if (event.description && event.description.trim()) {
    lines.push(``);
    lines.push(`📋 NOTATKI DODATKOWE:`);
    lines.push(event.description.trim());
  }

  lines.push(``);
  lines.push(`— Zaplanowano w aplikacji Treda Running Planner AI`);

  return lines.join('\n');
}

/**
 * 1. Google Calendar: Generate direct web link
 */
export function generateGoogleCalendarUrl(event: CalendarEventData): string {
  const { start, end } = getEventDateTimes(event);
  const startIso = formatGoogleCalendarDate(start);
  const endIso = formatGoogleCalendarDate(end);
  const details = buildEventFullDescription(event);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startIso}/${endIso}`,
    details: details,
    location: event.location,
    sf: 'true',
    output: 'xml',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * 2. RFC 5545 iCalendar content generator (for Apple Calendar & System Calendar)
 */
export function generateIcsContent(event: CalendarEventData): string {
  const { start, end } = getEventDateTimes(event);
  const dtStart = formatDateToIcalUtc(start);
  const dtEnd = formatDateToIcalUtc(end);
  const now = formatDateToIcalUtc(new Date());
  const uid = `race-${event.dateStr}-${Math.abs(hashCode(event.title))}@treda.app`;
  const fullDesc = escapeIcsText(buildEventFullDescription(event));
  const summary = escapeIcsText(event.title);
  const location = escapeIcsText(event.location);

  const alarms = event.alarms || [
    {
      trigger: '-P1D', // 1 day before
      description: `Przypomnienie: Jutro start w zawodach: ${event.title}! Sprawdź pogodę i ekwipunek.`,
    },
    {
      trigger: '-PT2H', // 2 hours before
      description: `Start za 2 godziny: ${event.title}! Czas na lekką przekąskę i rozgrzewkę.`,
    },
  ];

  const alarmBlocks = alarms
    .map(
      (alarm) => `BEGIN:VALARM\r
TRIGGER:${alarm.trigger}\r
ACTION:DISPLAY\r
DESCRIPTION:${escapeIcsText(alarm.description)}\r
END:VALARM`
    )
    .join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Treda Running Planner//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${fullDesc}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    alarmBlocks,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Simple string hash code for UID uniqueness
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

/**
 * Download standard .ics file (supports Outlook, Windows, Android, macOS)
 */
export function downloadIcsFile(fileName: string, icsContent: string): void {
  const cleanName = fileName.endsWith('.ics') ? fileName : `${fileName}.ics`;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Open or download for iOS / Apple Calendar
 * On iOS Safari, downloading an .ics file triggers the native iOS Calendar event prompt
 */
export function exportToAppleCalendar(event: CalendarEventData): void {
  const ics = generateIcsContent(event);
  const fileName = `zawody-${event.dateStr}-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`;
  downloadIcsFile(fileName, ics);
}

/**
 * Open directly in Google Calendar in new tab
 */
export function exportToGoogleCalendar(event: CalendarEventData): void {
  const url = generateGoogleCalendarUrl(event);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Export to System Calendar (Outlook / Android / Windows)
 */
export function exportToSystemCalendar(event: CalendarEventData): void {
  const ics = generateIcsContent(event);
  const fileName = `bieg-${event.dateStr}-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`;
  downloadIcsFile(fileName, ics);
}
