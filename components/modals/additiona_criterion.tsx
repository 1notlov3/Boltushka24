import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const ratings = await db.$queryRaw`
      SELECT 
        ac.id_пользователя as "userId",
        ac.addcriterion as "rating",
      FROM addition_criterion ac
      JOIN users u ON ac.user_id = u.id
      ORDER BY ac.rating DESC
    `;

    return NextResponse.json(ratings);
  } catch (error) {
    console.error("[RATING_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}