export const PILOT_BARANGAYS = [
  "Calumpang",
  "San Juan",
  "South Fundidor",
] as const;
export const PILOT_CITY = "Iloilo City";
export const PILOT_COUNTRY = "Philippines";
export function hasPilotBarangay(value?: string) {
  return PILOT_BARANGAYS.some((b) => b === value);
}
export function formatReportLocation(barangay?: string | null) {
  const name = (barangay ?? "")
    .trim()
    .replace(/^(barangay|brgy\.?)\s+/i, "");
  return name
    ? `${name}, ${PILOT_CITY}, ${PILOT_COUNTRY}`
    : `${PILOT_CITY}, ${PILOT_COUNTRY}`;
}
export function hasTanodAccess(
  user:
    | {
        role?: string;
        tanodStatus?: string;
        tanodManaged?: boolean;
        assignedBarangay?: string;
        teamId?: string;
        mustChangePassword?: boolean;
        barangay?: string;
      }
    | null
    | undefined,
) {
  return (
    user?.role === "tanod" &&
    user.tanodStatus === "active" &&
    user.tanodManaged === true &&
    hasPilotBarangay(user.assignedBarangay) &&
    !!user.teamId &&
    !user.mustChangePassword &&
    hasPilotBarangay(user.barangay)
  );
}
