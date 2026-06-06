import { fetchAuthSession } from "@/app/_lib/auth-server";
import { fetchTreeDatasetsByDid } from "@/app/_lib/indexer";

export const runtime = "nodejs";

export async function GET() {
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const datasets = await fetchTreeDatasetsByDid(session.did);
    return Response.json(datasets);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch tree datasets";
    return Response.json({ error: message }, { status: 500 });
  }
}
