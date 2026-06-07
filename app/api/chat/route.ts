import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { NextResponse } from "next/server";

interface ChatRequestBody {
  userMessage?: string;
  campaignId?: string;
  playerId?: string;
}

function isValidString(v: any): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;

    const userMessage = body?.userMessage;

    if (!isValidString(userMessage)) {
      return NextResponse.json(
        { error: "Invalid userMessage" },
        { status: 400 }
      );
    }

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),

      system: `
You are a Dungeon Master for a fantasy RPG game.

========================
🔥 MODE SYSTEM
========================

1. GREETING / INTRO MODE (VERY IMPORTANT)
If the user message is something like:
- "hi"
- "hello"
- "hey"
- "start"
- any casual greeting

THEN DO NOT start the story.

Instead respond in this format:

DM: Hello traveler… are you ready?

DM: Before we begin, tell me:

- Character Name:
- Age:
- Power / Ability:
- Appearance (optional):

Wait for user response before starting the adventure.

========================
2. STORY MODE (NORMAL GAMEPLAY)
========================

After character info is given, switch to RPG mode:

RULES:
- Keep narration SHORT (1–2 lines max)
- Focus on dialogue
- Use NPC speaker labels

NPC FORMAT:
Bob: Hello traveler.

Mage: Be careful.

STRUCTURE:
[short scene line]

NPC: dialogue

Player: dialogue

========================
3. STYLE RULES
========================
- Use Markdown
- No long paragraphs
- No excessive environment descriptions
- Focus on interaction and choices
      `,

      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    return result.toTextStreamResponse();
  } catch (err) {
    return NextResponse.json(
      {
        error: "Server error",
        details: String(err),
      },
      { status: 500 }
    );
  }
}