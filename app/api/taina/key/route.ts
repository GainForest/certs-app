import { NextResponse } from "next/server";
import { fetchAuthSession } from "@/app/_lib/auth-server";
import {
  deleteTainaPat,
  fetchTainaDashboard,
  mintTainaPat,
  resolveTainaPat,
  setTainaKey,
} from "@/app/_lib/taina-agent";

export const dynamic = "force-dynamic";

/** Read the user's current Tainá key from the agent runtime. */
async function currentKey(did: string): Promise<string | null> {
  try {
    const { ok, data } = await fetchTainaDashboard(did);
    return ok ? data.apiKey ?? null : null;
  } catch {
    return null;
  }
}

/** POST /api/taina/key — regenerate: mint a fresh key, revoke the old one. */
export async function POST() {
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  }
  const did = session.did;

  try {
    const old = await currentKey(did);
    const pat = await mintTainaPat(did);
    await setTainaKey(did, pat);
    // Only revoke the old token when it really belonged to this account.
    if (old && (await resolveTainaPat(old)) === did) await deleteTainaPat(old);

    return NextResponse.json({ apiKey: pat });
  } catch (error) {
    console.error("[taina] key regenerate failed", error);
    return NextResponse.json({ error: "runtime_unreachable" }, { status: 502 });
  }
}

/** DELETE /api/taina/key — revoke: delete the key and stop the bot publishing. */
export async function DELETE() {
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  }
  const did = session.did;

  try {
    const old = await currentKey(did);
    if (old && (await resolveTainaPat(old)) === did) await deleteTainaPat(old);
    await setTainaKey(did, null);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[taina] key revoke failed", error);
    return NextResponse.json({ error: "runtime_unreachable" }, { status: 502 });
  }
}
