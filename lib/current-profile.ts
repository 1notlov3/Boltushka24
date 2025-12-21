import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export const currentProfile = async () => {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
  }

  const payload = verifyToken(token) as { userId: string } | null;

  if (!payload) {
    return null;
  }

  const profile = await db.profile.findUnique({
    where: {
      userId: payload.userId
    }
  });

  return profile;
}
