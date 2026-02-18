# LinkedIn Engagement Improvement Assistant

Analyzes your LinkedIn feed with **rule-based shortlisting** and **AI-powered suggestions** for reactions, repost comments, and reply comments. MVP: you use the dashboard to open posts and engage manually (no bots, no bulk API actions).

## Features

- **Rule-based shortlist** (no AI required): filter by min reactions, comments, reposts; posts/comments mentioning a keyword (e.g. "me"); watchlist authors; hashtags. Configurable max posts (e.g. 500) and shortlist size (e.g. 50).
- **AI enrichment** (optional): for each shortlisted post — summary of why it matched, suggested reaction (Like / Respect / Support / Insightful), comment for repost, comment for reply. Uses Hugging Face (free) or local LMStudio.
- **MVP workflow**: run analysis → see results in dashboard with links to each post → copy suggestions and engage on LinkedIn yourself.

## Tech stack

- **Next.js** — landing page + app dashboard
- **LLM** — Hugging Face Inference (free) or local LMStudio

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) for the landing page and [http://localhost:3001/dashboard](http://localhost:3001/dashboard) for the analyzer.

## How to start analysis

1. **Configure `.env`**  
   Copy `env.example` to `.env`. Set at least:
   - `HUGGINGFACE_INFERENCE_URL` and `HUGGINGFACE_API_KEY` (for AI enrichment).
   - Optionally `NEXT_PUBLIC_MY_LINKEDIN_USERNAME` (your profile handle for the “mentions me” rule).
   - `CAPTURE_HEADLESS=false` so the capture browser is visible (or `true` to run headless after you’ve logged in once).

2. **Install Playwright (for capture)**  
   ```bash
   npx playwright install chromium
   ```

3. **Start the app**  
   ```bash
   npm run dev
   ```
   Open [http://localhost:3001/dashboard](http://localhost:3001/dashboard).

4. **Set analysis rules (Step 1 – Config)**  
   Adjust max posts, shortlist size, min reactions/comments/reposts, your LinkedIn username, watchlist, hashtags. Click **Save & continue**.

5. **Get feed data (Step 2 – Import feed)**  
   - **Best:** Use the [browser extension](browser-extension/README.md) on linkedin.com/feed → **Capture feed for Buzz Bytz** → back in the dashboard click **Load last capture (from extension)**.  
   - **Hybrid:** Click **"Hybrid: Capture URNs & Fetch from API"** (requires `LINKEDIN_ACCESS_TOKEN` — see [docs/HOW_TO_GET_LINKEDIN_ACCESS_TOKEN.md](docs/HOW_TO_GET_LINKEDIN_ACCESS_TOKEN.md)).  
   - Or click **Start capture** (Playwright; may require manual scroll).  
   - Or paste JSON / upload a `.json` file (e.g. [sample](public/sample-feed.json)).

6. **Run analysis & enrich**  
   Click **Start analysis & enrich**. The app shortlists posts by your rules, then calls Hugging Face for each shortlisted post (summary, suggested reaction, comment for repost, comment for reply).

7. **Use the results (Step 3 – Results)**  
   Open each post via the link, copy the suggested reaction and comments, and engage on LinkedIn manually.

## Getting feed data

LinkedIn does **not** offer an API to read your main feed (see [docs/LINKEDIN_API_AND_FEED.md](docs/LINKEDIN_API_AND_FEED.md)). Options:

### 1. Browser extension (recommended – scroll works)

A **Chrome/Edge extension** runs on linkedin.com/feed and scrolls the feed from **inside** the page, then sends the data to the app. Scrolling works because the extension runs in the same context as the feed and can find and scroll the real feed container (see [docs/FEED_SCROLLING_AND_EXTENSION.md](docs/FEED_SCROLLING_AND_EXTENSION.md)). Playwright cannot reliably scroll the feed from outside.

- **Install:** [browser-extension/README.md](browser-extension/README.md) – load the `browser-extension` folder as an unpacked extension.
- **Use:** Open LinkedIn feed → click **Capture feed for Buzz Bytz** → in the dashboard click **Load last capture (from extension)**.

### 2. Import JSON (paste or upload)

- Use the **sample feed structure**: [public/sample-feed.json](public/sample-feed.json). Each item should have at least: `id`, `url`, `authorName`, `content`; optional: `reactions`, `comments`, `reposts`, `hashtags`, `commentSnippets`, `postedAt`.
- Paste JSON in the dashboard or upload a `.json` file. You can hand-craft a small JSON for testing, or use the capture script below to produce it.

### 3. Start capture from the dashboard (Playwright)

With the app running (`npm run dev`), go to **Dashboard → Import feed** and click **Start capture**. The server runs the Playwright script; a browser opens so you can log in. **Feed scrolling is unreliable** with Playwright (LinkedIn’s feed is in a scrollable div that we can’t reliably target from outside). If the feed doesn’t scroll, keep the capture running and **scroll manually** every few seconds; the script will collect newly visible posts and stop after 3 iterations with no new posts. For reliable scrolling, use the **browser extension** (option 1).

### 4. Local capture script (Playwright) from the terminal

Alternatively, run the script **on your machine** (you must be logged into LinkedIn in the browser it opens):

```bash
npx playwright install chromium
MAX_POSTS=100 npm run capture:feed
```

- First run: a Chromium window opens; log in to LinkedIn and go to your feed. The script scrolls and saves posts to `feed.json` in the project root.
- Optional: `USER_DATA_DIR=./my-profile OUT_FILE=./my-feed.json MAX_POSTS=200 npm run capture:feed` to reuse a profile and change output path.
- **Headless**: set `CAPTURE_HEADLESS=true` in `.env` (or `HEADLESS=1` when running from CLI). Log in once with headless off so the session is saved in `USER_DATA_DIR`.
- **Note**: LinkedIn’s DOM changes over time; selectors in `scripts/capture-feed.ts` may need updates. Use responsibly and at your own risk.

## Configuration (dashboard)

In **Step 1 – Config** you can set:

- Max posts to analyze, shortlist size
- Min reactions, min comments, min reposts (for the “high engagement” rule)
- My LinkedIn username — post or its comments that mention you (your profile handle) get shortlisted
- Watchlist: one author name or profile URL per line
- Hashtags: one per line (with or without `#`)

A post is **shortlisted** if it matches **any** of: high engagement (min reactions, comments, and reposts), mentions keyword, author in watchlist, or has any of the hashtags.

## AI enrichment (optional)

- **Without env**: the app still runs; enrichment uses fallback text (summary, “Insightful”, generic comments).

- **Hugging Face (default)**  
  Set in `.env`:
  ```env
  HUGGINGFACE_INFERENCE_URL=https://api-inference.huggingface.co/models/Qwen/Qwen2-0.5B-Instruct
  HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxx
  ```
  **How to get `HUGGINGFACE_API_KEY`:**  
  1. Go to [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).  
  2. Click **New token**, name it (e.g. “feed-analyzer”), choose **Read** or the scope that allows “Make calls to the serverless Inference API”.  
  3. Copy the token (starts with `hf_`) into `.env` as `HUGGINGFACE_API_KEY`.

  **Suggested free models** ([Serverless Inference API](https://huggingface.co/docs/api-inference); small monthly credit):
  | Model | URL |
  |-------|-----|
  | Qwen2 0.5B | `https://api-inference.huggingface.co/models/Qwen/Qwen2-0.5B-Instruct` |
  | Phi-3 mini | `https://api-inference.huggingface.co/models/microsoft/Phi-3-mini-4k-instruct` |
  | Flan-T5 large | `https://api-inference.huggingface.co/models/google/flan-t5-large` |

- **LMStudio (optional)**  
  To use a local model instead, set `LMSTUDIO_BASE_URL=http://localhost:1234` in `.env` and leave `HUGGINGFACE_INFERENCE_URL` unset. LMStudio is only used when its URL is set and HF URL is not.

## LinkedIn developer keys & connecting to your feed

**Why we can't use the API for the feed:** LinkedIn does not expose a “get my feed” endpoint, and the permission needed to read posts (`r_member_social`) is restricted. See [docs/LINKEDIN_API_AND_FEED.md](docs/LINKEDIN_API_AND_FEED.md) for details and the recommended approach (browser extension).

### Environment variables

Add your LinkedIn app credentials to `.env` (from [LinkedIn Developers](https://www.linkedin.com/developers/) → your app → **Auth** tab):

- **LINKEDIN_CLIENT_ID** — Client ID  
- **LINKEDIN_CLIENT_SECRET** — Primary client secret  

These are stored in `env.example` as placeholders. The app does not use them yet; they are for future OAuth or API integration.

### How does the app get *my* feed? (e.g. linkedin.com/in/deepaksshettigar)

Right now the app **does not** call LinkedIn’s API to load your feed. It gets feed data in one of two ways:

1. **Capture script (recommended)**  
   You run the Playwright script on your machine. It opens a browser where **you are already logged in** to LinkedIn (e.g. as deepaksshettigar). The script goes to the feed, scrolls, and extracts posts from the page into a JSON file. So the “connection” to your feed is your own browser session — no server-side login.

2. **Import JSON**  
   You paste or upload a JSON file (e.g. produced by the capture script, or built by another tool). The app then only analyzes that data; it never talks to LinkedIn.

So your profile (e.g. https://linkedin.com/in/deepaksshettigar) is used only when **you** are logged in as that user in the browser the capture script uses. The app never fetches your feed by API.

### Do we need LinkedIn OAuth?

- **For reading your feed today: no.**  
  LinkedIn’s public API does not expose a “get my main feed” endpoint. So we can’t use OAuth to fetch your feed server-side. That’s why the MVP uses the capture script (your existing session) or manual import.

- **For future features: possibly.**  
  OAuth is useful if we later add:
  - **“Sign in with LinkedIn”** — to know it’s you (e.g. deepaksshettigar) and maybe personalize the dashboard.  
  - **Posting on your behalf** — if we ever automate likes/comments/reposts, we’d need the right OAuth scopes and LinkedIn’s posting APIs (with their limits and ToS).

So: add **Client ID** and **Primary client secret** to `.env` for future use; the current flow does not require OAuth to connect to your feed.

### Alternative LinkedIn API endpoints (what *does* exist)

LinkedIn doesn’t offer a single “get my main feed” endpoint, but these endpoints can be used to get post-related data in other ways:

| Endpoint / API | What it gives you | Limitation |
|----------------|-------------------|------------|
| **Posts API – Get by URN** | Full post details (commentary, author, content) for a **specific** post. | You must already have the post URN (`urn:li:ugcPost:{id}` or `urn:li:share:{id}`). No way to “list” the main feed. |
| **Posts API – Find by author** | All (recent) posts **by one person or organization**. `GET /rest/posts?author={Person URN or Organization URN}` with pagination (`start`, `count`). | One author per request. You need that author’s URN. Useful if you have a list of authors (e.g. connections) and call it per author, then merge/sort by date to approximate a feed. |
| **Connections API** | List of the authenticated user’s 1st-degree connections (Person URNs). `GET /v2/connections?q=viewer&start=0&count=50`. | Requires `r_1st_connections`. Gives you *who* to query, not their posts. You’d then use “Find by author” for each (or a subset) to get posts. |
| **Social Metadata API** | Reactions, comments, and other engagement on posts. | You need the post URNs first. Complements Posts API when you already have posts. |
| **Activity Feed API** | Previously allowed some feed-like access. | **Deprecated**; no longer granted as of 2025. |

**Permission catch:** Reading other people’s posts (and sometimes your own feed-like data) typically requires **`r_member_social`**. That permission is **restricted** — only approved partners get it, and LinkedIn has stated they are not accepting new access requests. So even “Find by author” and “Connections + find by author” are not usable for most third-party apps today.

**Practical takeaway:** For a feed-like stream, the options are (1) **capture script or manual import** (what this app does now), or (2) a future LinkedIn product that exposes a proper feed API with broader access. The endpoints above are alternatives in terms of *what exists*, but they either need post URNs you already have, or restricted permissions most apps can’t get.

## Project structure

- `app/` — Next.js App Router: landing (`page.tsx`), dashboard (`dashboard/`), API routes (`api/analyze`, `api/enrich`)
- `app/dashboard/components/` — ConfigForm, FeedImport, AnalysisResults
- `lib/` — types, default config, rule-based analysis (`analyze.ts`)
- `scripts/capture-feed.ts` — Playwright script to capture feed to JSON
- `public/sample-feed.json` — example feed shape for import

## License

See [LICENSE](LICENSE).
