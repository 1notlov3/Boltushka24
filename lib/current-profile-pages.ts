import { NextApiRequest } from "next";
import { clerkClient, getAuth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const currentProfilePages = async (req: NextApiRequest) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return null;
  }

  const existingProfile = await db.profile.findUnique({
    where: {
      userId,
    }
  });

  if (existingProfile) {
    return existingProfile;
  }

  const user = await clerkClient.users.getUser(userId);

  if (!user) {
    return null;
  }

  const fallbackName = user.username || user.id;
  const fullName = user.fullName || fallbackName;
  const emailAddress = user.emailAddresses[0]?.emailAddress || "";

  return db.profile.create({
    data: {
      userId,
      name: fullName,
      email: emailAddress,
      imageUrl: user.imageUrl,
      password: null,
    },
  });
}
