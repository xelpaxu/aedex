import type { Id } from '@/convex/_generated/dataModel';

export type Validation = {
  outcome: 'verified' | 'corrected' | 'verification_undone';
  reviewedAt: number;
  reviewedBy: string;
  submittedAt: number;
  locationName: string;
  lat: number;
  lng: number;
  barangay?: string;
  description: string;
  riskLevel: string;
  classification?: string;
  findings?: string;
  notes?: string;
};

export type InboxNotification = {
  _id: Id<'notifications'>;
  type: string;
  title: string;
  message: string;
  reportId?: string;
  read: boolean;
  createdAt: number;
  validation?: Validation;
};

export type NotificationDetailData = {
  notification: InboxNotification;
  report: null | {
    _id: string;
    imageUri: string;
    processedImage?: string;
    locationName: string;
    lat: number;
    lng: number;
    description: string;
    barangay?: string;
    status: string;
    riskLevel?: string;
    verified?: boolean;
    submittedAt: number;
    reviewedAt?: number;
    reviewedBy?: string;
    classification?: string;
    findings?: string;
    notes?: string;
    resolvedAt?: number;
  };
};

export const notificationLabels: Record<string, string> = {
  report_verified: 'Report verified',
  report_corrected: 'Validated with corrections',
  verification_undone: 'Verification withdrawn',
  assignment: 'Team assigned',
  status_change: 'Status update',
  resolved: 'Report resolved',
  critical_report: 'Community alert',
  new_report: 'Community report',
};

export function imageSource(value?: string): string | null {
  const uri = value?.trim();
  if (!uri) return null;
  if (/^(https?:|data:image\/|file:|content:|blob:)/i.test(uri)) return uri;
  // Older reports store raw base64 without its data URL prefix.
  if (/^[A-Za-z0-9+/=\s]+$/.test(uri)) {
    const mime = uri.startsWith('iVBOR') ? 'png' : uri.startsWith('UklGR') ? 'webp' : 'jpeg';
    return `data:image/${mime};base64,${uri.replace(/\s/g, '')}`;
  }
  return null;
}

export function dateLabel(timestamp?: number) {
  return typeof timestamp === 'number' && Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not recorded';
}

export function validCoordinates(lat?: number, lng?: number): boolean {
  return typeof lat === 'number' && typeof lng === 'number'
    && Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
