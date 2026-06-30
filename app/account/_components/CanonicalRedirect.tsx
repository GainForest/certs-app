"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { DEFAULT_LANGUAGE, isSupportedLanguageCode } from "@/lib/i18n/languages";
import { localizeHref } from "@/lib/i18n/routing";

/**
 * Client-side canonical redirect for account routes.
 *
 * Replaces a server `redirect()` for the "you opened this profile by DID (or an
 * old handle), bounce to the canonical handle URL" case. We deliberately do NOT
 * use `redirect()` from `next/navigation` here: calling it inside a Server
 * Component that is interleaved with this route's Suspense boundary
 * (`loading.tsx`) trips a known Next.js App Router bug — React error #310
 * ("Rendered more hooks than during the previous render") thrown from the
 * router's own `useMemo` — on client-side navigation in production. See
 * vercel/next.js#63121 and #63388. Redirecting on the client sidesteps it.
 *
 * `to` is a locale-less path like `/account/<handle>`; the current locale is
 * re-applied so navigation stays in-language.
 */
export function CanonicalRedirect({ to }: { to: string }) {
  const router = useRouter();
  const rawLocale = useLocale();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    const locale = isSupportedLanguageCode(rawLocale) ? rawLocale : DEFAULT_LANGUAGE;
    router.replace(localizeHref(to, locale));
  }, [router, rawLocale, to]);

  return null;
}
