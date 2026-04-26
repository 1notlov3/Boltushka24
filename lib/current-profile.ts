import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import { db } from "@/lib/db";

export const currentProfile = cache(async () => {
  const { userId } = auth();

  if (!userId) {
    return null;
  }

  let profile = await db.profile.findUnique({
    where: {
      userId
    }
  });

  if (!profile) {
    const user = await currentUser();

    if (!user) {
      return null;
    }

    const fallbackName = user.username || user.id;
    const fullName = user.fullName || fallbackName;
    const emailAddress = user.emailAddresses[0]?.emailAddress || "";
    const imageUrl = user.imageUrl || "";

    try {
      profile = await db.profile.create({
        data: {
          userId,
          name: fullName,
          email: emailAddress,
          imageUrl,
          password: null,
        },
      });
    } catch (error) {
      // Race: another request may have created the profile concurrently.
      profile = await db.profile.findUnique({ where: { userId } });
      if (!profile) {
        console.error("[CURRENT_PROFILE] failed to create profile", error);
        throw error;
      }
    }
  }

  return profile;
});
