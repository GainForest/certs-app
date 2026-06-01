import Link from "next/link";
import { LogoMark } from "./Logo";
import { BUMICERTS_URL, GLOBE_URL, GAINFOREST_URL, STATUS_URL, INDEXER_URL } from "../_lib/urls";

const LINKS: Array<{ label: string; href: string }> = [
  { label: "Green Globe", href: GLOBE_URL },
  { label: "Bumicerts", href: `${BUMICERTS_URL}/explore` },
  { label: "Status", href: STATUS_URL },
  { label: "Indexer", href: INDEXER_URL },
  { label: "GitHub", href: "https://github.com/GainForest/gainforest-explorer" },
  { label: "gainforest.earth", href: GAINFOREST_URL },
];

// Social profiles — inline Bootstrap Icons (MIT, viewBox 0 0 16 16) so they
// follow `currentColor` and need no icon package. Mirrors gainforest-app.
const SOCIAL_LINKS: Array<{ label: string; href: string; path: string }> = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/gainforest",
    path: "M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951",
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/GainForestNow",
    path: "M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/gainforest/",
    path: "M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334",
  },
];

// Slim technical footer: the brand mark, the data sources it reads, the
// GainForest e.V. legal block (matching gainforest.earth), and a factual
// disclaimer. Always rendered on the editorial ink band.
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-border bg-ink text-ink-foreground">
      <div className="mx-auto w-full max-w-[1480px] px-6 py-10 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[520px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <LogoMark className="h-6 w-6 text-brand" title="Bumiscan" />
              <span className="font-garamond text-[20px] font-semibold text-ink-foreground">
                Bumiscan
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-[1.6] text-ink-foreground/60">
              Read-only view over the GainForest data commons. Records resolve
              from Hyperindex and each owner&apos;s ATProto PDS; donation totals
              mirror the indexer and may lag the chain. Not an official record.
            </p>

            <ul
              role="list"
              aria-label="GainForest on social media"
              className="mt-4 flex items-center gap-3"
            >
              {SOCIAL_LINKS.map((s) => (
                <li key={s.label}>
                  <Link
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`GainForest on ${s.label}`}
                    className="inline-grid h-8 w-8 place-items-center rounded-full text-ink-foreground/55 transition-colors hover:bg-ink-foreground/10 hover:text-brand"
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                      <path d={s.path} />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2.5 text-[13.5px] text-ink-foreground/78 lg:max-w-[420px] lg:justify-end">
            {LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-brand"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Legal block — GainForest e.V., matching gainforest.earth's footer. */}
        <div className="mt-8 flex flex-col gap-4 border-t border-ink-border pt-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-1.5 text-[12.5px] leading-[1.55] text-ink-foreground/55">
            <span>© {year} GainForest. All rights reserved.</span>
            <span>
              <span className="font-medium text-ink-foreground/85">GainForest e.V.</span>
              <span className="text-ink-foreground/35"> · </span>
              Schwandenacker 35, 8052 Zurich, Switzerland
            </span>
            <span>
              GainForest e.V. is a tax-exempt non-profit.
              <span className="text-ink-foreground/35"> · </span>
              <Link
                href="https://www.uid.admin.ch/Detail.aspx?uid_id=CHE181901605"
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 transition-colors hover:text-brand hover:underline"
              >
                UID: CHE-181.901.605
              </Link>
              <span className="text-ink-foreground/35"> · </span>
              <Link
                href="mailto:team@gainforest.net"
                className="underline-offset-4 transition-colors hover:text-brand hover:underline"
              >
                team@gainforest.net
              </Link>
            </span>
          </div>
          <span className="font-mono text-[12px] text-ink-foreground/40">
            hi.gainforest.app/graphql · certified.one · instatus
          </span>
        </div>
      </div>
    </footer>
  );
}
