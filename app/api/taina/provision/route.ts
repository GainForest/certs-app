import { NextResponse } from "next/server";
import { fetchAuthSession } from "@/app/_lib/auth-server";
import { mintTainaPat, provisionTainaBot } from "@/app/_lib/taina-agent";

export const dynamic = "force-dynamic";

/**
 * POST /api/taina/provision
 * Body: { botToken: string, focus?: string }
 *
 * Connects the signed-in user's own Telegram bot to the Tainá agent runtime.
 * The DID always comes from the bumicerts session — never the request body —
 * and a personal access token is minted so the bot can record observations
 * under that account.
 */
const BOT_TOKEN_RE = /^\d{6,}:[A-Za-z0-9_-]{30,}$/;

export async function POST(request: Request) {
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  }

  let botToken = "";
  let focus = "";
  try {
    const body = await request.json();
    botToken = String(body.botToken ?? "").trim();
    focus = String(body.focus ?? "").trim().slice(0, 200);
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!BOT_TOKEN_RE.test(botToken)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  try {
    const pat = await mintTainaPat(session.did);
    const { ok, status, data } = await provisionTainaBot({
      did: session.did,
      handle: session.handle || session.did,
      botToken,
      focus,
      pat,
    });

    if (!ok) {
      return NextResponse.json({ error: data.error ?? "provision_failed" }, { status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("[taina] provision failed", error);
    return NextResponse.json({ error: "runtime_unreachable" }, { status: 502 });
  }
}
