# How to Get LINKEDIN_ACCESS_TOKEN

You need an OAuth 2.0 access token from LinkedIn to use the hybrid flow (fetch post details via API). Here are two ways:

---

## Option 1: LinkedIn Token Generator (Easiest - for testing)

LinkedIn provides a web tool to generate tokens manually:

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/) → your app → **Tools** → **OAuth Token Tool** (or direct: https://www.linkedin.com/developers/tools/oauth/token-generator)

2. Select your app (the one with your `LINKEDIN_CLIENT_ID`).

3. Choose scopes/permissions.

   **If you don’t see `r_member_social`:** That’s normal. **`r_member_social`** (“Retrieve posts, comments, and likes”) is a **restricted** scope — it does not appear in the token generator for standard apps; only approved LinkedIn partners get it. So most developers only see scopes like:
   - **`r_basicprofile`** / **`profile`** / **`openid`** — name, photo, basic profile
   - **`w_member_social`** — *create* posts, comments, reactions (write, not read)
   - **`r_organization_social`** — read *organization* pages’ posts (not your personal feed)
   - **`email`**, **`r_1st_connections_size`**, ads scopes, etc.

   **For “fetch post details by URN”** the LinkedIn Posts API expects **`r_member_social`**. Without it, calls to get a post by URN usually return **403**. So the hybrid “Capture URNs → Fetch from API” flow will often not work for reading others’ posts until that scope is available to your app.

   **What you can do:** Generate a token with the scopes you *do* see (e.g. **`r_basicprofile`**, **`profile`**) and add it to `.env` if you want to use it later (e.g. for profile or for posting with **`w_member_social`**). For **getting feed/post content today**, use the **browser extension** or **full Playwright capture** instead — they don’t need the API.

4. Click **Generate token**.

5. Copy the token (starts with something like `AQV...` or `AQU...`).

6. Add to `.env`:
   ```env
   LINKEDIN_ACCESS_TOKEN=AQV...your_token_here
   ```

**Limitation:** Tokens from the generator expire (usually 60 days). For production, use Option 2.

---

## Option 2: OAuth Flow in Your App (For production / auto-refresh)

Implement the standard OAuth 2.0 Authorization Code Flow:

### Step 1: Set redirect URI in LinkedIn app

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/) → your app → **Auth** tab.
2. Add **Authorized redirect URLs**: `http://localhost:3001/api/auth/linkedin/callback` (or your production URL).

### Step 2: User authorizes (one-time)

1. User visits: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3001/api/auth/linkedin/callback&scope=r_member_social%20r_liteprofile&state=random_string`

   Replace:
   - `YOUR_CLIENT_ID` with your actual Client ID
   - `redirect_uri` with the one you added in Step 1
   - `scope` with the permissions you need (space-separated, URL-encoded)

2. User logs in and grants permission → LinkedIn redirects to your callback with `?code=...&state=...`.

### Step 3: Exchange code for token

Your callback endpoint (`/api/auth/linkedin/callback`) makes a POST request:

```bash
POST https://www.linkedin.com/oauth/v2/accessToken
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=THE_CODE_FROM_STEP_2
&redirect_uri=http://localhost:3001/api/auth/linkedin/callback
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

Response:
```json
{
  "access_token": "AQV...",
  "expires_in": 5184000,
  "refresh_token": "..."
}
```

Save `access_token` to `.env` as `LINKEDIN_ACCESS_TOKEN`.

---

## Option 3: Quick script (for one-time token)

You can run a small Node script to get a token:

```javascript
// get-token.js
const readline = require('readline');
const https = require('https');

const CLIENT_ID = 'your_client_id';
const CLIENT_SECRET = 'your_client_secret';
const REDIRECT_URI = 'http://localhost:3001/api/auth/linkedin/callback';
const SCOPE = 'r_member_social r_liteprofile';

console.log('Visit this URL:');
console.log(`https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPE)}&state=test`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nPaste the code from the callback URL: ', (code) => {
  const data = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  
  const req = https.request({
    hostname: 'www.linkedin.com',
    path: '/oauth/v2/accessToken',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      const json = JSON.parse(body);
      console.log('\nAccess token:', json.access_token);
      console.log('\nAdd to .env:');
      console.log(`LINKEDIN_ACCESS_TOKEN=${json.access_token}`);
    });
  });
  req.write(data.toString());
  req.end();
  rl.close();
});
```

---

## Important Notes

- **`r_member_social` scope:** Reading posts via API typically requires this scope, but it's **restricted** (only approved partners). If you get 403 errors when fetching posts, your token likely doesn't have this scope. Your own posts might work with fewer permissions.

- **Token expiration:** Access tokens expire (often 60 days). The token generator shows expiration. For long-term use, implement refresh token flow (Option 2 with refresh_token).

- **Security:** Never commit `.env` with your token. Keep `LINKEDIN_CLIENT_SECRET` and `LINKEDIN_ACCESS_TOKEN` private.

---

## Quick Test

Once you have `LINKEDIN_ACCESS_TOKEN` in `.env`, test it:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Linkedin-Version: 202401" \
     -H "X-Restli-Protocol-Version: 2.0.0" \
     "https://api.linkedin.com/rest/posts/urn%3Ali%3Aactivity%3A1234567890"
```

Replace `urn:li:activity:1234567890` with a real post URN (URL-encoded). If you get 403, the token likely lacks `r_member_social`.
