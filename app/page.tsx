import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-xl font-semibold text-linkedin-blue">
            Buzz Bytz · Feed Analyzer
          </span>
          <Link
            href="/dashboard"
            className="rounded-full bg-linkedin-blue px-5 py-2 text-sm font-medium text-white transition hover:bg-linkedin-dark"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
          LinkedIn engagement,{" "}
          <span className="text-linkedin-blue">without the guesswork</span>
        </h1>
        <p className="mb-10 max-w-2xl text-lg text-gray-600">
          Screen your feed by reach and engagement, get a shortlist of posts
          worth reacting to, and use AI-generated comments and repost ideas—then
          engage manually so you stay in control.
        </p>

        <div className="mb-14 grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-2xl">📋</div>
            <h2 className="mb-2 font-semibold text-gray-900">
              Rule-based shortlist
            </h2>
            <p className="text-sm text-gray-600">
              Filter by followers, reactions, comments, your watchlist, or
              hashtags. You choose the rules; we surface the posts.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-2xl">✨</div>
            <h2 className="mb-2 font-semibold text-gray-900">
              AI suggestions
            </h2>
            <p className="text-sm text-gray-600">
              For each shortlisted post: a short summary, suggested reaction
              (Like, Respect, Support, Insightful), and comment ideas for reply
              and repost.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-2xl">👤</div>
            <h2 className="mb-2 font-semibold text-gray-900">You post, we don’t</h2>
            <p className="text-sm text-gray-600">
              MVP uses analysis only. You copy suggestions and engage on
              LinkedIn yourself—no bots, no API limits.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-linkedin-blue/30 bg-linkedin-blue/5 p-6">
          <h3 className="mb-2 font-semibold text-linkedin-dark">
            How it works
          </h3>
          <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700">
            <li>Capture or import your LinkedIn feed (e.g. run the local script or upload JSON).</li>
            <li>Set your criteria: max posts, shortlist size, min followers/reactions/comments, watchlist, hashtags.</li>
            <li>Run analysis to get a rule-based shortlist of up to 50 posts.</li>
            <li>Run AI enrichment to get summaries, reaction suggestions, and comment drafts.</li>
            <li>Use the dashboard to open each post on LinkedIn and engage manually.</li>
          </ol>
        </div>

        <div className="mt-12 flex gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-full bg-linkedin-blue px-6 py-3 font-medium text-white transition hover:bg-linkedin-dark"
          >
            Go to Dashboard
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            View on GitHub
          </a>
        </div>
      </main>
    </div>
  );
}
