import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json({
      role: "assistant",
      content: "AI временно отключен. Попробуйте позже."
    }, { status: 503 });

  } catch (error) {
    console.log("[AI_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
