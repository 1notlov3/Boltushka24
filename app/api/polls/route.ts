import { z } from "zod";

import { apiError, rateLimitError, unauthorized, validationError } from "@/lib/api-response";
import { channelMessageInclude } from "@/lib/chat-includes";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { assertNoActiveMemberTimeout } from "@/lib/moderation-enforcement";
import { canCreateMessage } from "@/lib/permissions";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { broadcast } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const PollOptionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(120),
});

const CreatePollSchema = z.object({
  serverId: z.string().uuid("Invalid Server ID"),
  channelId: z.string().uuid("Invalid Channel ID"),
  question: z.string().trim().min(1, "Question is required").max(240, "Question too long"),
  options: z.array(PollOptionSchema).min(2, "At least two options are required").max(8, "Too many options"),
  multiple: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) return unauthorized();

    const parsedBody = CreatePollSchema.safeParse(await req.json());
    if (!parsedBody.success) return validationError(parsedBody.error);

    const { serverId, channelId, question, multiple = false } = parsedBody.data;
    const optionIds = new Set<string>();
    const options = parsedBody.data.options.map((option) => ({
      id: option.id,
      text: option.text,
    }));

    for (const option of options) {
      if (optionIds.has(option.id)) {
        return apiError("Poll option IDs must be unique", 400);
      }
      optionIds.add(option.id);
    }

    const [channel, member] = await Promise.all([
      db.channel.findFirst({
        where: { id: channelId, serverId },
        select: { id: true },
      }),
      db.member.findFirst({
        where: { serverId, profileId: profile.id },
        include: {
          serverRoles: {
            include: {
              role: {
                select: { permissions: true },
              },
            },
          },
        },
      }),
    ]);

    if (!channel) return apiError("Channel not found", 404);
    if (!member) return unauthorized();
    if (!canCreateMessage(member)) return apiError("Forbidden", 403);

    const timeoutError = await assertNoActiveMemberTimeout(serverId, member.id, "У вас таймаут на создание опросов");
    if (timeoutError) return timeoutError;

    const limit = await checkRateLimit({
      key: rateLimitKey("poll:create", profile.id, channelId),
      limit: 10,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return rateLimitError(limit.retryAfterSeconds, `Too many polls. Retry in ${limit.retryAfterSeconds}s`);
    }

    const message = await db.message.create({
      data: {
        content: `Опрос: ${question}`,
        channelId,
        memberId: member.id,
        poll: {
          create: {
            question,
            options,
            multiple,
          },
        },
      },
      include: channelMessageInclude(member.id),
    });

    await broadcast(`chat:${channelId}:messages`, { id: message.id, action: "add" });

    return Response.json(message);
  } catch (error) {
    console.log("[POLLS_POST]", error);
    return apiError("Internal Error", 500);
  }
}
