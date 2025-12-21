import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const existingProfile = await db.profile.findFirst({
      where: {
        email,
      },
    });

    if (existingProfile) {
      return new NextResponse("User already exists", { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const userId = uuidv4();

    const profile = await db.profile.create({
      data: {
        userId,
        name,
        imageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
        email,
        password: hashedPassword,
      },
    });

    const token = signToken({ userId: profile.userId, profileId: profile.id });

    const response = NextResponse.json(profile);
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return response;
  } catch (error) {
    console.log("[REGISTER_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
