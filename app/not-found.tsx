import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-journal-paper to-journal-paper-alt">
      <div className="max-w-sm space-y-4 text-center">
        <div className="text-6xl">🪶</div>
        <h1 className="text-2xl font-bold text-gray-700">We couldn't find that page</h1>
        <p className="text-sm text-gray-600">
          The link might be outdated or the page may have moved. You can return home or jump back into your inbox.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm font-medium text-journal-accent">
          <Link href="/" className="transition hover:text-journal-accent/80">
            Go home
          </Link>
          <span aria-hidden="true" className="text-gray-300">
            •
          </span>
          <Link href="/inbox" className="transition hover:text-journal-accent/80">
            Open inbox
          </Link>
        </div>
      </div>
    </div>
  );
}
