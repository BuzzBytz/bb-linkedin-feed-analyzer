# LinkedIn API and Getting Your Feed

## Can the LinkedIn API give me my feed?

**No.** LinkedIn does not offer any API that returns “my main feed” (the stream of posts you see on linkedin.com/feed). So you cannot “leverage the LinkedIn API” to replace the capture script for reading your feed.

### What the API actually offers

| Capability | Endpoint / permission | Can we use it for “my feed”? |
|------------|----------------------|------------------------------|
| **Get a specific post** | `GET /rest/posts/{urn}` | Only if you already have the post URN. No way to list feed items. |
| **Get posts by one author** | `GET /rest/posts?author={personUrn}` | Yes in theory: get your connections, then for each connection request their posts and merge. **But** this needs `r_member_social`. |
| **Get my connections** | `GET /v2/connections?q=viewer` | Needs `r_1st_connections`. Gives Person URNs, not posts. |
| **Read posts / engagement** | Various (e.g. Social Metadata) | All require **`r_member_social`**. |

### The blocker: `r_member_social`

- **`r_member_social`** = “Retrieve posts, comments, and likes on behalf of an authenticated member.”
- It is **restricted**. Only approved LinkedIn partners get it.
- LinkedIn has stated they are **not accepting new access requests** for this permission.
- So even the “Connections + Find posts by author” approach is **not available** to typical third-party apps.

**Conclusion:** For a normal developer, the official LinkedIn API **cannot** be used to fetch your main feed. The only official path would be if LinkedIn one day adds a proper feed API or opens `r_member_social` again.

---

## Better solution: browser extension (no manual scroll)

Because the API doesn’t help, the reliable way to get feed data is to run code **inside** the same page as the LinkedIn feed:

- **Playwright from the outside** has to guess the scrollable element and fight the SPA; scrolling often fails.
- A **browser extension** runs in the same context as the feed. It can find the real scroll container and scroll it, then read the DOM and send the data to your app.

This repo includes a **Chrome extension** that:

1. Runs only on `linkedin.com/feed`.
2. Finds the feed’s scroll container from inside the page (so scrolling works).
3. Scrolls automatically and collects visible posts into the same JSON shape the app expects.
4. Sends the JSON to your local app (`http://localhost:3001/api/feed-import`) or lets you copy it.

You install the extension once, open LinkedIn and go to your feed, then click “Capture feed” in the extension. No manual scrolling and no Playwright.

See [Browser extension](../browser-extension/README.md) for install and use.

---

## Hybrid: Playwright URNs + LinkedIn API

You can split the work:

1. **Playwright** only scrolls the feed and collects **post URNs and URLs** (no full content). This writes `.feed-urns.json` (array of `{ urn, url }`). Same scroll/login as before, but minimal DOM reads.

2. **LinkedIn API** then fetches full post details for each URN (one request per post). The app calls `GET /rest/posts/{urn}` for each URN and builds the feed for analysis.

**Automated flow:** In the dashboard → **Import feed** → **Hybrid** section → click **"Hybrid: Capture URNs & Fetch from API"**. This runs Playwright to capture URNs, then automatically fetches post details from the LinkedIn API, and fills the Feed JSON — all in one click. No manual steps needed.

**Manual flow (if you prefer):** Run `npm run capture:urns` manually, then in the dashboard use **"Load URNs from .feed-urns.json"** → **"Fetch post details via LinkedIn API"**.

**Requirements:** Set `LINKEDIN_ACCESS_TOKEN` in `.env` (OAuth access token). Reading other people’s posts typically requires **`r_member_social`** (restricted); if you get 403, the token may not have that scope. Your own posts might work with fewer permissions.

### Getting URN from a post URL

When you use **More → Copy link to post** on LinkedIn, the URL looks like:

`https://www.linkedin.com/feed/update/urn:li:activity:7123456789012345678/`

The **URN is in the path**: `urn:li:activity:7123456789012345678`. The app extracts it via `lib/linkedin-utils.ts` (`getUrnFromPostUrl(url)`). In the dashboard, under **Hybrid**, paste a post URL and click **Add URL to URNs** to add that URN to your list, then **Fetch post details via LinkedIn API**.

---

## If you ever had `r_member_social` (for reference)

The flow would be:

1. **OAuth** with scopes including `r_1st_connections` and `r_member_social`.
2. **Connections:** `GET https://api.linkedin.com/v2/connections?q=viewer&start=0&count=500` → list of Person URNs.
3. **Posts by author (per connection):**  
   `GET https://api.linkedin.com/rest/posts?author={personUrn}&start=0&count=10` for each (or a subset of) connections.
4. Merge and sort by date to approximate a feed.

Again: this is not usable today because `r_member_social` is restricted and not granted to new apps.
