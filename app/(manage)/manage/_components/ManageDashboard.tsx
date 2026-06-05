import Container from "@/components/ui/container";
import { RichText } from "@/app/_components/RichText";
import type { AccountRouteData } from "@/app/account/_lib/account-route";
import { ManageNavGrid } from "./ManageNavGrid";
import { ManageEditableHero, EditBar } from "./ManageEditableHero";
import { ManageAccountSetup } from "./ManageAccountSetup";

export function ManageDashboard({
  account,
  mode,
}: {
  account: AccountRouteData;
  mode: string | null;
}) {
  if (mode === "onboard-user" || mode === "onboard-org" || account.summary.bumicertCount === 0 && !account.description && !account.summary.hasCertifiedOrg && !account.summary.hasGainforestOrg) {
    return (
      <Container className="pt-4 pb-8">
        <ManageAccountSetup mode={mode} />
      </Container>
    );
  }

  const isEditing = mode === "edit";

  return (
    <Container className="pt-4 pb-8">
      {isEditing && (
        <div className="mb-2">
          <EditBar />
        </div>
      )}
      <ManageEditableHero account={account} isEditing={isEditing} />
      {account.detail?.richBody?.length ? (
        <section className={isEditing ? "py-4" : "py-6 md:py-8"}>
          <RichText blocks={account.detail.richBody} />
        </section>
      ) : account.detail?.blurb ? (
        <section className={isEditing ? "py-4" : "py-6 md:py-8"}>
          <p className="mt-5 max-w-3xl text-[14px] leading-[1.62] text-foreground/80">
            {account.detail.blurb}
          </p>
        </section>
      ) : null}
      {!isEditing && <ManageNavGrid accountKind={account.kind} />}
    </Container>
  );
}
