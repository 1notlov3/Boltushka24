import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.log("[ME_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
