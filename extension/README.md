# LinkedIn Feed Capture - Chrome Extension

Captures your LinkedIn feed for import into the Engagement Assistant dashboard.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension` folder from this project

## Usage

1. Go to [linkedin.com/feed](https://www.linkedin.com/feed/)
2. Scroll through your feed to load posts (the more you scroll, the more posts are captured)
3. Click the extension icon in the toolbar
4. Click **Capture Feed**
5. A JSON file will download - import it in the dashboard via drag & drop

## Note

LinkedIn's DOM structure changes frequently. If capture returns few or no posts, the content script selectors may need updating. Check the browser console for any extraction errors.
