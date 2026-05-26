import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { publicEnv } from "@/lib/public-env";
import { serverEnv, serverFeatures } from "@/lib/server-env";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  const username = req.nextUrl.searchParams.get("username");

  const profile = await currentProfile();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await checkRateLimit({
    key: rateLimitKey("livekit:token", profile.id, "global"),
    limit: 10,
    windowMs: 60_000,
  });

  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many token requests. Retry in ${limit.retryAfterSeconds}s` },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  if (!room) {
    return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
  } else if (!username) {
    return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 });
  }

  const roomValidation = z.string().uuid().safeParse(room);
  if (!roomValidation.success) {
    return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
  }

  // Verify access to channel or conversation
  // First check if it's a channel where user is a member of the server
  const channel = await db.channel.findFirst({
    where: {
      id: room,
      server: {
        members: {
          some: {
            profileId: profile.id
          }
        }
      }
    }
  });

  // If not a channel, check if it's a conversation where user is a participant
  if (!channel) {
    const conversation = await db.conversation.findFirst({
      where: {
        id: room,
        OR: [
          { memberOne: { profileId: profile.id } },
          { memberTwo: { profileId: profile.id } }
        ]
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!serverFeatures.livekit || !publicEnv.NEXT_PUBLIC_LIVEKIT_URL || !serverEnv.LIVEKIT_API_KEY || !serverEnv.LIVEKIT_API_SECRET) {
    return NextResponse.json({ error: "LiveKit is not configured" }, { status: 503 });
  }

  // Use profile.id as identity to ensure uniqueness and profile.name for display to prevent spoofing
  const at = new AccessToken(serverEnv.LIVEKIT_API_KEY, serverEnv.LIVEKIT_API_SECRET, { identity: profile.id, name: profile.name });

  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
  
  return NextResponse.json({ token: await at.toJwt() });
}
