export const PILOT_BARANGAYS = [
  "Calumpang",
  "San Juan",
  "South Fundidor",
] as const;
export function hasPilotBarangay(value?: string) {
  return PILOT_BARANGAYS.some((b) => b === value);
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
