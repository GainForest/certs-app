import type { Metadata } from "next";
import { SignInPrompt } from "../_components/AuthFlow";
import { fetchAuthSession } from "../_lib/auth-server";

export const metadata: Metadata = {
  title: "Manage — Bumicerts",
  robots: { index: false, follow: false },
};

/**
 * (MANAGE) layout
 *
 * Mirrors the Bumicerts app's former (upload) route group, but this app exposes
 * those routes under /manage instead of /upload. For now these are placeholders
 * while the upload/manage workflows are ported.
 */
export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const session = await fetchAuthSession();

  if (!session.isLoggedIn) {
    return <SignInPrompt />;
  }

  return children;
}
