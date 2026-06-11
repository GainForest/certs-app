import type { Metadata } from "next";
import Container from "@/components/ui/container";
import { ManageGroupsClient } from "./_components/ManageGroupsClient";

export const metadata: Metadata = {
  title: "Group Accounts — GainForest",
  robots: { index: false, follow: false },
};

export default function ManageGroupsPage() {
  return (
    <Container className="pt-4 pb-8">
      <ManageGroupsClient />
    </Container>
  );
}
