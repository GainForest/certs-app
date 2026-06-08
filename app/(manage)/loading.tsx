import { ManageDashboardSkeleton } from "./manage/_components/ManageDashboardSkeleton";

// Catches the *layout* suspense for the whole manage section. Both
// (manage)/layout.tsx and manage/layout.tsx are async (auth + account fetch);
// their suspense bubbles to the nearest boundary above them, which is here.
// Without this, the generic root app/loading.tsx showed during those fetches.
export default function ManageSectionLoading() {
  return <ManageDashboardSkeleton />;
}
