import { NextApiRequest } from "next";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export const currentProfilePages = async (req: NextApiRequest) => {
  const token = req.cookies.token;

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
