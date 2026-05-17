import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type LogAuditInput = {
  action: string;
  actorId?: string | null;
  serverId: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function logAudit({
  action,
  actorId,
  serverId,
  targetId,
  metadata,
}: LogAuditInput) {
  await db.auditLog.create({
    data: {
      action,
      actorId,
      serverId,
      targetId,
      metadata,
    },
  });
}
