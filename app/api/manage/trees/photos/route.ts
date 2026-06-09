import { fetchAuthSession } from "@/app/_lib/auth-server";
import { fetchMultimediaByDid } from "@/app/_lib/indexer";

export const runtime = "nodejs";

export async function GET() {
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) {
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  }

  try {
    const photos = await fetchMultimediaByDid(session.did);
    return Response.json(photos);
  } catch {
    return Response.json({ error: "Could not load photos." }, { status: 500 });
  }
}
