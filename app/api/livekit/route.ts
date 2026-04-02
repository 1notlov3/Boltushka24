import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  const username = req.nextUrl.searchParams.get("username");

  const profile = await currentProfile();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    },
    // ⚡ Bolt Optimization: Select only id for existence check
    select: {
      id: true,
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
      },
      // ⚡ Bolt Optimization: Select only id for existence check
      select: {
        id: true,
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Use profile.id as identity to ensure uniqueness and profile.name for display to prevent spoofing
  const at = new AccessToken(apiKey, apiSecret, { identity: profile.id, name: profile.name });

  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
  
  return NextResponse.json({ token: await at.toJwt() });
}
