export interface AppAnalytics {
  totalVisits: number;
  uniqueVisitors: number;
  todayVisits: number;
  lastVisitDate: string;
  totalPageviews: number;
  sessionsCount: number;
  totalRunsLogged: number;
  totalShoesInWardrobe: number;
  bamboosSpent: number;
  aiPlansToday: number;
  totalAiPlans: number;
  affiliateClicksToday: number;
  totalAffiliateClicks: number;
  activeDeviceType: string;
  firstSeenDate: string;
}

const ANALYTICS_KEY = 'treda_real_analytics_v3';
const VISITOR_ID_KEY = 'treda_real_visitor_uuid';

export function getAppAnalytics(): AppAnalytics {
  if (typeof window === 'undefined') {
    return getDefaultAnalytics();
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  let isNewVisitor = false;
  if (!visitorId) {
    visitorId = `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
    isNewVisitor = true;
  }

  const stored = localStorage.getItem(ANALYTICS_KEY);
  let data: AppAnalytics;

  if (stored) {
    try {
      data = { ...getDefaultAnalytics(), ...JSON.parse(stored) };
    } catch {
      data = getDefaultAnalytics();
    }
  } else {
    data = getDefaultAnalytics();
  }

  // Daily rollover check
  if (data.lastVisitDate !== todayStr) {
    data.todayVisits = 0;
    data.aiPlansToday = 0;
    data.affiliateClicksToday = 0;
    data.lastVisitDate = todayStr;
  }

  // Session check
  const sessionKey = 'treda_real_session_active';
  const isNewSession = !sessionStorage.getItem(sessionKey);
  if (isNewSession) {
    sessionStorage.setItem(sessionKey, 'true');
    data.sessionsCount = (data.sessionsCount || 0) + 1;
    data.totalVisits = (data.totalVisits || 0) + 1;
    data.todayVisits = (data.todayVisits || 0) + 1;

    if (isNewVisitor || data.uniqueVisitors === 0) {
      data.uniqueVisitors = (data.uniqueVisitors || 0) + 1;
    }
  }

  if (data.totalVisits === 0) data.totalVisits = 1;
  if (data.todayVisits === 0) data.todayVisits = 1;
  if (data.uniqueVisitors === 0) data.uniqueVisitors = 1;
  if (data.totalPageviews === 0) data.totalPageviews = 1;

  data.activeDeviceType = getDeviceType();

  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch {}

  return data;
}

export function incrementPageview(): void {
  if (typeof window === 'undefined') return;
  const data = getAppAnalytics();
  data.totalPageviews = (data.totalPageviews || 0) + 1;
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch {}
}

export function recordAiPlanGenerated(): void {
  if (typeof window === 'undefined') return;
  const data = getAppAnalytics();
  data.aiPlansToday = (data.aiPlansToday || 0) + 1;
  data.totalAiPlans = (data.totalAiPlans || 0) + 1;
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch {}
}

export function recordAffiliateShoeClick(): void {
  if (typeof window === 'undefined') return;
  const data = getAppAnalytics();
  data.affiliateClicksToday = (data.affiliateClicksToday || 0) + 1;
  data.totalAffiliateClicks = (data.totalAffiliateClicks || 0) + 1;
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch {}
  fetch('/api/admin/track-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'affiliate_click' }),
  }).catch(() => {});
}

function getDeviceType(): string {
  if (typeof navigator === 'undefined') return 'Desktop';
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return 'Mobile (iOS / Android)';
  if (/tablet|ipad/i.test(ua)) return 'Tablet';
  return 'Desktop Web Browser';
}

function getDefaultAnalytics(): AppAnalytics {
  const today = new Date().toISOString().slice(0, 10);
  return {
    totalVisits: 0,
    uniqueVisitors: 0,
    todayVisits: 0,
    lastVisitDate: today,
    totalPageviews: 0,
    sessionsCount: 0,
    totalRunsLogged: 0,
    totalShoesInWardrobe: 0,
    bamboosSpent: 0,
    aiPlansToday: 0,
    totalAiPlans: 0,
    affiliateClicksToday: 0,
    totalAffiliateClicks: 0,
    activeDeviceType: getDeviceType(),
    firstSeenDate: today,
  };
}
