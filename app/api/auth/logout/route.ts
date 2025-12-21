import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const response = new NextResponse("Logged out", { status: 200 });
  response.cookies.delete("token");
  return response;
}
