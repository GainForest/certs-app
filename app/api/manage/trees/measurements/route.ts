import { fetchAuthSession } from "@/app/_lib/auth-server";
import { fetchMeasurementsByDid } from "@/app/_lib/indexer";

export const runtime = "nodejs";

export async function GET() {
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) {
    return Response.json({ error: "Sign in to continue." }, { status: 401 });
  }

  try {
    const measurements = await fetchMeasurementsByDid(session.did);
    return Response.json(measurements);
  } catch {
    return Response.json({ error: "Could not load measurements." }, { status: 500 });
  }
}
