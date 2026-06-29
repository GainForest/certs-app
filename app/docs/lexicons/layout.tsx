// A single centered column — no second sidebar or brand bar, so the docs read
// as a native page inside the app shell rather than a site within a site.
export default function LexiconsLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">{children}</div>;
}
