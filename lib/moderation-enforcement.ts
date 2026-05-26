import { rateLimitError } from "@/lib/api-response";
import { db } from "@/lib/db";

export async function getActiveMemberTimeout(serverId: string, memberId: string) {
  return db.memberTimeout.findFirst({
    where: {
      serverId,
      memberId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
    select: {
      expiresAt: true,
      reason: true,
    },
  });
}

export function timeoutRetryAfterSeconds(expiresAt: Date | string) {
  return Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export async function assertNoActiveMemberTimeout(serverId: string, memberId: string, message = "У вас таймаут") {
  const activeTimeout = await getActiveMemberTimeout(serverId, memberId);

  if (!activeTimeout) return null;

  return rateLimitError(timeoutRetryAfterSeconds(activeTimeout.expiresAt), message);
}
