# LinkedIn Engagement Assistant

Analyzes your LinkedIn feed and provides engagement opportunities with AI-powered summaries and suggested comments.

## Features

- **Rule-based analysis**: Shortlist posts by engagement (followers, reactions, comments), mentions, watchlist, or hashtags
- **Configurable criteria**: Max posts to analyze, shortlist size, min followers/reactions/comments, watchlist, hashtags
- **AI enhancement**: Summaries, suggested reactions (Like/Respect/Support/Insightful), repost comments, reply comments
- **MVP workflow**: Copy suggestions and manually apply on LinkedIn to avoid bot detection

## Tech Stack

- **Next.js 14** (App Router)
- **LLM**: Hugging Face Inference API (free tier) or local LMStudio

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

### Analysis Criteria (Settings gear icon)

- **Max posts to analyze**: Default 500
- **Shortlist size**: Default 50
- **High engagement**: Min followers (10k), min reactions (500), min comments (100)
- **Mention keyword**: Your name for "mentions me" matching
- **Watchlist**: Comma-separated author names or profile URLs
- **Hashtags**: Comma-separated hashtags to match

### LLM Setup

**Hugging Face (recommended for quick start):**

1. Get a free API key at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create `.env.local`:
   ```
   HUGGINGFACE_API_KEY=your_key_here
   HF_MODEL=mistralai/Mistral-7B-Instruct-v0.2
   ```

**LMStudio (local, no API key):**

1. Install [LMStudio](https://lmstudio.ai/) and load a model
2. Start the local server (default port 1234)
3. Create `.env.local`:
   ```
   USE_LMSTUDIO=true
   LMSTUDIO_URL=http://localhost:1234/v1
   LMSTUDIO_MODEL=your-model-name
   ```

Without an LLM configured, the app uses template responses.

## Feed Data Source

### Option 1: Browser Extension

1. Open Chrome → Extensions → Load unpacked
2. Select the `extension` folder
3. Go to LinkedIn feed, scroll to load posts
4. Click the extension icon → Capture Feed
5. Import the downloaded JSON in the dashboard

### Option 2: Manual Import

Drag & drop a JSON file with feed data. Format:

```json
[
  {
    "id": "1",
    "url": "https://linkedin.com/feed/update/...",
    "authorName": "Author Name",
    "authorFollowers": 10000,
    "content": "Post content...",
    "reactions": 500,
    "comments": 100,
    "postedAt": "2025-02-18T12:00:00.000Z",
    "hashtags": ["AI", "Leadership"]
  }
]
```

### Option 3: Sample Data

Click **START Analysis** without importing to use built-in sample data.

## Usage

1. Configure criteria in Settings
2. Import feed data or use sample data
3. Click **START Analysis**
4. Review shortlisted posts with URLs, summaries, suggested reactions, and comments
5. Copy comments and manually apply on LinkedIn

## Project Structure

```
src/
  app/          # Next.js App Router
  components/   # React components
  lib/          # Analyzer, config, LLM, sample data
  types/        # TypeScript types
extension/      # Chrome extension for feed capture
```

## License

MIT
