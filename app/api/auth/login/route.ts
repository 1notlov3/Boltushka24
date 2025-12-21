import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const profile = await db.profile.findFirst({
      where: {
        email,
      },
    });

    if (!profile || !profile.password) {
      return new NextResponse("Invalid credentials", { status: 401 });
    }

    const isPasswordValid = await comparePassword(password, profile.password);

    if (!isPasswordValid) {
      return new NextResponse("Invalid credentials", { status: 401 });
    }

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
    console.log("[LOGIN_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
