/* ── Google Search Console client helpers ── */

export interface GSCQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCSiteEntry {
  siteUrl: string;
  permissionLevel: string;
}

export interface GSCDataResponse {
  rows: GSCQuery[] | GSCPage[];
  responseAggregationType?: string;
}

export interface GSCDateRange {
  startDate: string;
  endDate: string;
}

/** Convert a relative range label to actual ISO date strings */
export function dateRangeFromLabel(label: '7d' | '28d' | '90d'): GSCDateRange {
  const end = new Date();
  const start = new Date();
  const days = label === '7d' ? 7 : label === '28d' ? 28 : 90;
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

/** Fetch search analytics data from GSC via our API proxy */
export async function fetchGSCData(
  siteUrl: string,
  dateRange: GSCDateRange,
  dimensions: string[] = ['query'],
  refreshToken?: string,
): Promise<GSCDataResponse> {
  const res = await fetch('/api/gsc/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteUrl, startDate: dateRange.startDate, endDate: dateRange.endDate, dimensions, refreshToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Failed to fetch GSC data');
  }
  return res.json();
}

/** Fetch the list of verified sites from GSC */
export async function fetchGSCSites(refreshToken?: string): Promise<GSCSiteEntry[]> {
  const params = refreshToken ? `?refreshToken=${encodeURIComponent(refreshToken)}` : '';
  const res = await fetch(`/api/gsc/sites${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Failed to fetch GSC sites');
  }
  const data = await res.json();
  return data.sites ?? [];
}

/** Check whether the workspace has GSC tokens stored */
export function isGSCConnected(settings: { gscRefreshToken?: string }): boolean {
  return Boolean(settings.gscRefreshToken);
}
