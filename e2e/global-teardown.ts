import { cleanupCreatedPdsRecords } from "./support/pds";

async function globalTeardown(): Promise<void> {
  const result = await cleanupCreatedPdsRecords();
  console.log(`[e2e] Deleted ${result.deleted} test Bumicert record(s) from the configured test account${result.failed ? `; ${result.failed} failed` : ""}.`);
}

export default globalTeardown;
