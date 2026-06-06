import type { AccountRouteData } from "@/app/account/_lib/account-route";
import { ManageDashboardClient } from "./ManageDashboardClient";
import type { ManageMode } from "./manageDashboardMode";

export function ManageDashboard({
  account,
  mode,
}: {
  account: AccountRouteData;
  mode: ManageMode | null;
}) {
  return <ManageDashboardClient account={account} mode={mode} />;
}
