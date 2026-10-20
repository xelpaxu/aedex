import type { Doc, Id } from "@/convex/_generated/dataModel";

export type AssignedReport = Doc<"reports"> & {
  assignmentId: Id<"assignments">;
  assignmentStatus: string;
  assignedAt: number;
  teamId: Id<"teams">;
  teamName: string;
  isMine: boolean;
};
export type ReportFilter = "all" | "active" | "critical" | "resolved";

export const isResolved = (item: AssignedReport) =>
  [item.status, item.assignmentStatus].some((value) =>
    ["resolved", "completed"].includes(value.toLowerCase()),
  );
export const isCritical = (item: AssignedReport) =>
  !isResolved(item) &&
  [item.status, item.riskLevel].some((value) =>
    ["CRITICAL", "HIGH RISK"].includes((value || "").toUpperCase()),
  );
export function reportCounts(items: AssignedReport[]) {
  const resolved = items.filter(isResolved).length;
  return {
    all: items.length,
    active: items.length - resolved,
    critical: items.filter(isCritical).length,
    resolved,
  };
}
export function filterReports(
  items: AssignedReport[],
  filter: ReportFilter,
  search = "",
) {
  const term = search.trim().toLowerCase();
  return items
    .filter((item) => {
      const matches =
        filter === "all" ||
        (filter === "active" && !isResolved(item)) ||
        (filter === "critical" && isCritical(item)) ||
        (filter === "resolved" && isResolved(item));
      return (
        matches &&
        (!term ||
          `${item.locationName} ${item.teamName} ${item.description} ${item.reasoning || ""}`
            .toLowerCase()
            .includes(term))
      );
    })
    .sort(
      (a, b) =>
        Number(isResolved(a)) - Number(isResolved(b)) ||
        Number(isCritical(b)) - Number(isCritical(a)) ||
        b.assignedAt - a.assignedAt,
    );
}
