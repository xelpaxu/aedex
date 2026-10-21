export type MapReportStatus = "verified" | "pending" | "resolved" | "all";
export function matchesMapStatus(report: { lat?: number; lng?: number; status?: string; verified?: boolean }, filter: MapReportStatus) {
  const { lat, lng } = report;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  const resolved = ["resolved", "completed"].includes((report.status || "").toLowerCase());
  return filter === "all" || (filter === "verified" && !!report.verified && !resolved) || (filter === "pending" && !report.verified && !resolved) || (filter === "resolved" && resolved);
}

function barangayKey(value?: string | null) {
  const text = (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/\bsouth\s*fundidor\b/.test(text)) return "southfundidor";
  if (/\bsan\s*juan\b/.test(text)) return "sanjuan";
  if (/\bcalumpang\b/.test(text)) return "calumpang";
  return null;
}
/** Unknown user scopes never fall through to district-wide results. */
export function matchesMapBarangay(report: { barangay?: string | null; locationName?: string | null }, barangay?: string | null) {
  const scope = barangayKey(barangay);
  if (!scope) return false;
  // An explicit report barangay takes precedence over free-text location details.
  const record = report.barangay?.trim() ? barangayKey(report.barangay) : barangayKey(report.locationName);
  return record === scope;
}
