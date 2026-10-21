export type MapReportStatus = "verified" | "pending" | "resolved" | "all";
export function matchesMapStatus(report: { lat?: number; lng?: number; status?: string; verified?: boolean }, filter: MapReportStatus) {
  const { lat, lng } = report;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  const resolved = ["resolved", "completed"].includes((report.status || "").toLowerCase());
  return filter === "all" || (filter === "verified" && !!report.verified && !resolved) || (filter === "pending" && !report.verified && !resolved) || (filter === "resolved" && resolved);
}
