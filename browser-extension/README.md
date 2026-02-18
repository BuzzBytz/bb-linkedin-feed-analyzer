# Buzz Bytz Feed Capture – Browser Extension

This extension runs **inside** your LinkedIn feed page, so it can scroll the real feed container and capture posts reliably (no manual scroll, no Playwright).

## Install (Chrome / Edge)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `browser-extension` folder in this repo (the one that contains `manifest.json`).

## Use

1. **Start the app** so it’s listening: `npm run dev` → app at http://localhost:3001.
2. Open **LinkedIn** and go to **Feed** (https://www.linkedin.com/feed/).
3. Click the blue button **“Capture feed for Buzz Bytz”** (top right on the page).
4. The extension will scroll the feed and collect posts. When done it will:
   - **If the app is running:** send the data to the app and show: *“Sent N posts to Buzz Bytz. Open the dashboard and click ‘Load last capture’.”*
   - **If the app isn’t reachable:** copy the JSON to your clipboard. Paste it in the dashboard’s Feed JSON area.
5. In the **Buzz Bytz dashboard** → **Import feed** → click **“Load last capture (from extension)”** to load the captured posts, then run **“Start analysis & enrich”**.

## Why this works

- The extension’s script runs in the same page as the feed, so it can find the real scrollable div and call `scrollTop` on it. Scrolling works without guessing from outside (Playwright).
- It uses the same JSON shape as the app (id, url, authorName, content, reactions, comments, hashtags).
- Data is sent to `http://localhost:3001/api/feed-import` or copied to clipboard if the app isn’t running.

## Permissions

- **linkedin.com**: to run on the feed page and read the DOM.
- **localhost:3001**: to POST the captured feed to your local app.

No data is sent to any other server.
