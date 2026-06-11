import type { AccountRouteData } from "@/app/account/_lib/account-route";
import { ManageDashboardClient } from "./ManageDashboardClient";
import type { ManageMode } from "./manageDashboardMode";

export function ManageDashboard({
  account,
  mode,
  basePath,
  writeRepoDid,
  children,
}: {
  account: AccountRouteData;
  mode?: ManageMode | null;
  basePath?: string;
  writeRepoDid?: string;
  children?: React.ReactNode;
}) {
  return (
    <ManageDashboardClient
      account={account}
      mode={mode}
      basePath={basePath}
      writeRepoDid={writeRepoDid}
    >
      {children}
    </ManageDashboardClient>
  );
}
