"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Container from "@/components/ui/container";
import { stripLocaleFromPathname } from "@/lib/i18n/routing";

function isManageRoute(pathname: string): boolean {
  return /^\/account\/[^/?#]+\/manage(?:[/?#]|$)/.test(stripLocaleFromPathname(pathname));
}

/**
 * Wraps the public account profile chrome (hero + tabs). The same /account/[id]
 * subtree now also hosts the management surface at /account/[id]/manage, which
 * renders its own dashboard chrome — so on those routes we drop the public hero
 * and tabs and just pass the children through.
 */
export function AccountChrome({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  const pathname = usePathname() ?? "/";

  if (isManageRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <Container className="pt-4 pb-8">
      {hero}
      {children}
    </Container>
  );
}
