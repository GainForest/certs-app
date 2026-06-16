"use client";

import { usePathname } from "next/navigation";
import { stripLocaleFromPathname } from "@/lib/i18n/routing";
import { AppShell } from "./AppShell";
import { Footer } from "./Footer";

export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = stripLocaleFromPathname(usePathname() ?? "/");

  if (pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  return (
    <AppShell authSession={null} manageAccountKind="user">
      {children}
      <Footer />
    </AppShell>
  );
}
