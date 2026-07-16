/**
 * Splits smart-vault organization wallets — server-side helpers.
 *
 * Everything here runs on Ethereum mainnet (the chain the donation flow
 * settles on, see lib/facilitator/usdc.ts) and against the org's own PDS —
 * the vault record intentionally is NOT read through the indexer so the
 * verification path has no third dependency: PDS record + one RPC read.
 */

import "server-only";

import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { RPC_URL, USDC_CONTRACT } from "@/lib/facilitator/usdc";
import { resolveDidIdentity } from "@/app/_lib/did-identity";
import {
  SMART_VAULT_FACTORY,
  SMART_VAULT_FACTORY_ABI,
  SPLITS_VAULT_COLLECTION,
  SPLITS_VAULT_RKEY,
  VAULT_OWNER,
  VAULT_THRESHOLD,
  orgVaultSalt,
  parseSplitsVaultRecord,
  toSignerStruct,
  type SplitsVaultRecord,
  type VaultPasskeySigner,
} from "./shared";

function getClient() {
  return createPublicClient({
    chain: mainnet,
    transport: http(process.env.ETHEREUM_RPC_URL || process.env.MAINNET_RPC_URL || RPC_URL),
  });
}

/** Ask the factory for the deterministic vault address of a signer set. */
export async function predictVaultAddress(orgDid: string, signers: VaultPasskeySigner[]): Promise<`0x${string}`> {
  if (signers.length === 0) throw new Error("At least one signer is required");
  return getClient().readContract({
    address: SMART_VAULT_FACTORY,
    abi: SMART_VAULT_FACTORY_ABI,
    functionName: "getAddress",
    args: [VAULT_OWNER, signers.map(toSignerStruct), VAULT_THRESHOLD, BigInt(orgVaultSalt(orgDid))],
  });
}

export async function isVaultDeployed(address: `0x${string}`): Promise<boolean> {
  const code = await getClient().getCode({ address });
  return typeof code === "string" && code !== "0x";
}

/** ETH + USDC balances — used to block deleting a funded (even undeployed) vault. */
export async function vaultHoldsFunds(address: `0x${string}`): Promise<boolean> {
  const client = getClient();
  const [eth, usdc] = await Promise.all([
    client.getBalance({ address }),
    client
      .readContract({
        address: USDC_CONTRACT,
        abi: [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const,
        functionName: "balanceOf",
        args: [address],
      })
      .catch(() => 0n),
  ]);
  return eth > 0n || usdc > 0n;
}

/** Fetch the org's canonical vault record straight from its PDS. */
export async function fetchSplitsVaultRecord(orgDid: string): Promise<SplitsVaultRecord | null> {
  const { pdsHost } = await resolveDidIdentity(orgDid);
  if (!pdsHost) return null;
  const url = new URL(`https://${pdsHost}/xrpc/com.atproto.repo.getRecord`);
  url.searchParams.set("repo", orgDid);
  url.searchParams.set("collection", SPLITS_VAULT_COLLECTION);
  url.searchParams.set("rkey", SPLITS_VAULT_RKEY);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  const json = (await response.json().catch(() => null)) as { value?: unknown } | null;
  return parseSplitsVaultRecord(json?.value);
}

export type VerifiedVault = {
  record: SplitsVaultRecord;
  address: `0x${string}`;
  deployed: boolean;
};

/**
 * Verify the binding org DID → vault address by recomputing the CREATE2
 * prediction from the record's founding signer set. Returns null when there
 * is no record or the recorded address does not match the derivation.
 */
export async function fetchVerifiedVault(orgDid: string): Promise<VerifiedVault | null> {
  const record = await fetchSplitsVaultRecord(orgDid);
  if (!record) return null;
  if (record.factory.toLowerCase() !== SMART_VAULT_FACTORY.toLowerCase()) return null;
  if (record.owner !== VAULT_OWNER || record.threshold !== VAULT_THRESHOLD) return null;
  const predicted = await predictVaultAddress(orgDid, record.signers).catch(() => null);
  if (!predicted || predicted.toLowerCase() !== record.address.toLowerCase()) return null;
  const deployed = await isVaultDeployed(record.address).catch(() => false);
  return { record, address: record.address, deployed };
}
