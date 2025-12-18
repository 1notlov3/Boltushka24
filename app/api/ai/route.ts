import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { message } = await req.json();

    if (!message) {
      return new NextResponse("Message is required", { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. You speak Russian."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    return NextResponse.json({
      role: "assistant",
      content: response.choices[0].message.content
    });

  } catch (error) {
    console.log("[AI_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
