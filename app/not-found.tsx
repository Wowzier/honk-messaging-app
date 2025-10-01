import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-journal-paper via-journal-paper-alt to-white flex items-center justify-center p-6">
      <div className="relative w-full max-w-lg rounded-[2.5rem] border border-journal-frame/30 bg-white/85 p-12 text-center shadow-xl backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-journal-accent/15 text-3xl">
          📭
        </div>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-journal-text">Page not found</h1>
        <p className="mt-4 text-base text-gray-600">
          We looked everywhere but couldn&apos;t locate that page. Try heading back to your workspace or opening your inbox.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-journal-accent px-8 py-3 text-sm font-medium text-journal-accent-foreground shadow transition hover:bg-journal-accent/90"
          >
            Return home
          </Link>
          <Link
            href="/inbox"
            className="inline-flex items-center justify-center rounded-full border border-journal-accent px-8 py-3 text-sm font-medium text-journal-accent transition hover:bg-journal-accent/10"
          >
            Open inbox
          </Link>
        </div>
      </div>
    </div>
  );
}
