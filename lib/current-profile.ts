import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const currentProfile = async () => {
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

    profile = await db.profile.create({
      data: {
        userId,
        name: fullName,
        email: emailAddress,
        imageUrl: user.imageUrl,
        password: null,
      },
    });
  }

  return profile;
}
