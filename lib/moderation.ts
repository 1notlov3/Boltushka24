import { ModerationReportReason, ModerationReportStatus, type MemberRole } from "@prisma/client";

export const moderationReasonLabels: Record<ModerationReportReason, string> = {
  [ModerationReportReason.SPAM]: "Спам",
  [ModerationReportReason.HARASSMENT]: "Оскорбления",
  [ModerationReportReason.HATE]: "Ненависть",
  [ModerationReportReason.NSFW]: "18+ контент",
  [ModerationReportReason.VIOLENCE]: "Насилие",
  [ModerationReportReason.SCAM]: "Мошенничество",
  [ModerationReportReason.OTHER]: "Другое",
};

export const moderationStatusLabels: Record<ModerationReportStatus, string> = {
  [ModerationReportStatus.OPEN]: "Открыта",
  [ModerationReportStatus.RESOLVED]: "Решена",
  [ModerationReportStatus.DISMISSED]: "Отклонена",
};

export const timeoutPresets = [
  { label: "10 минут", seconds: 10 * 60 },
  { label: "1 час", seconds: 60 * 60 },
  { label: "24 часа", seconds: 24 * 60 * 60 },
  { label: "7 дней", seconds: 7 * 24 * 60 * 60 },
] as const;

type ModerationTarget = {
  id: string;
  role: MemberRole;
  profileId: string;
};

type ModerationActor = {
  id: string;
  role: MemberRole;
  profileId: string;
};

const roleRank: Record<MemberRole, number> = {
  GUEST: 0,
  MODERATOR: 1,
  ADMIN: 2,
};

export function canModerateTarget({
  actor,
  target,
  serverOwnerProfileId,
}: {
  actor: ModerationActor;
  target: ModerationTarget;
  serverOwnerProfileId: string;
}) {
  if (actor.id === target.id || actor.profileId === target.profileId) return false;
  if (target.profileId === serverOwnerProfileId) return false;
  if (actor.profileId === serverOwnerProfileId) return true;
  return roleRank[actor.role] > roleRank[target.role];
}

export function isActiveBan(ban: { revokedAt: Date | string | null; expiresAt: Date | string | null } | null | undefined, now = new Date()) {
  if (!ban || ban.revokedAt) return false;
  return !ban.expiresAt || new Date(ban.expiresAt).getTime() > now.getTime();
}

export function isActiveTimeout(timeout: { revokedAt: Date | string | null; expiresAt: Date | string } | null | undefined, now = new Date()) {
  if (!timeout || timeout.revokedAt) return false;
  return new Date(timeout.expiresAt).getTime() > now.getTime();
}

export function formatTimeoutUntil(expiresAt: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(expiresAt));
}
