import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { privateKeyToAccount, signMessage } from "viem/accounts";
import { fetchAuthSession } from "@/app/_lib/auth-server";
import { getAuthBaseUrl } from "@/app/_lib/auth";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  address: z.string().min(1),
  chainId: z.number().int().positive(),
  signature: z.string().min(1),
  message: z.object({
    did: z.string().min(1),
    evmAddress: z.string().min(1),
    chainId: z.string().min(1),
    timestamp: z.string().min(1),
    nonce: z.string().min(1),
  }),
  name: z.string().trim().min(1).max(80).optional(),
  repo: z.string().trim().min(1).optional(),
});

function isHexPrefixed(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]+$/.test(value);
}

type CgsGroupsResponse = {
  groups?: Array<{ groupDid?: string | null; role?: string | null }>;
};

async function canManageGroupWallet(repo: string, cookie: string | null): Promise<boolean> {
  if (!cookie) return false;
  const upstream = await fetch(new URL("/api/cgs/groups", getAuthBaseUrl()), {
    headers: { cookie },
    cache: "no-store",
  });
  if (!upstream.ok) return false;
  const payload = (await upstream.json().catch(() => null)) as CgsGroupsResponse | null;
  const membership = payload?.groups?.find((group) => group.groupDid === repo);
  return membership?.role === "owner" || membership?.role === "admin";
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const session = await fetchAuthSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const headerList = await headers();
  const cookie = headerList.get("cookie");
  const repo = body.repo?.trim();
  if (repo) {
    if (body.message.did !== repo) {
      return NextResponse.json({ error: "Payload DID does not match organization" }, { status: 400 });
    }
    if (!(await canManageGroupWallet(repo, cookie))) {
      return NextResponse.json({ error: "You cannot manage wallets for this organization" }, { status: 403 });
    }
  } else if (body.message.did !== session.did) {
    return NextResponse.json({ error: "Payload DID does not match authenticated session" }, { status: 400 });
  }
  if (body.address.toLowerCase() !== body.message.evmAddress.toLowerCase()) {
    return NextResponse.json({ error: "address and message.evmAddress must match" }, { status: 400 });
  }
  if (!isHexPrefixed(body.signature)) {
    return NextResponse.json({ error: "signature must be a hex string (0x...)" }, { status: 400 });
  }

  const platformPrivateKey = process.env.FACILITATOR_PRIVATE_KEY;
  if (!platformPrivateKey || !isHexPrefixed(platformPrivateKey)) {
    return NextResponse.json({ error: "Platform signing key not configured" }, { status: 500 });
  }

  const platformAddress = privateKeyToAccount(platformPrivateKey).address;
  const platformSignature = await signMessage({ privateKey: platformPrivateKey, message: { raw: body.signature } });
  const record = {
    $type: "app.gainforest.link.evm",
    ...(body.name ? { name: body.name } : {}),
    address: body.address,
    userProof: {
      $type: "app.gainforest.link.evm#eip712Proof",
      signature: body.signature,
      message: {
        $type: "app.gainforest.link.evm#eip712Message",
        did: body.message.did,
        evmAddress: body.message.evmAddress,
        chainId: body.message.chainId,
        timestamp: body.message.timestamp,
        nonce: body.message.nonce,
      },
    },
    platformAttestation: {
      $type: "app.gainforest.link.evm#eip712PlatformAttestation",
      signature: platformSignature,
      platformAddress,
      signedData: body.signature,
    },
  };

  const upstream = await fetch(`${getAuthBaseUrl()}${repo ? "/api/cgs/mutation" : "/api/atproto/mutation"}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ operation: "createRecord", collection: "app.gainforest.link.evm", record, ...(repo ? { repo } : {}) }),
  });
  const result = await upstream.json().catch(() => ({ error: "Invalid response from auth server" }));
  return NextResponse.json(result, { status: upstream.status });
}
