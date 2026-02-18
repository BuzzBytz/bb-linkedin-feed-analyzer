# Why Feed Scrolling Fails in Playwright (and How the Extension Fixes It)

## The problem with Playwright

LinkedIn’s feed is a **single-page app**. The scrollable area is **not** the main window or `document.body`. It’s a **specific `<div>`** in the center column that has:

- `overflow-y: auto` (or similar)
- Its own `scrollHeight` / `scrollTop`
- No stable, public class name (minified or A/B’d)

Playwright runs **outside** the page. It can:

- Call `window.scrollTo()` / `window.scrollBy()` → the **window** scrolls, but the feed lives inside a div that doesn’t move with the window.
- Call `page.evaluate()` and walk the DOM to find elements with `scrollHeight > clientHeight` → we tried that, but the **right** scrollable div is hard to identify from outside (nested layout, shadow DOM, or timing), so we often scroll the wrong element or none.
- Use CDP mouse wheel or keyboard → the **focused** element scrolls; focus isn’t guaranteed to be the feed div, so scrolling is unreliable.

So with Playwright we never reliably scroll **the** feed container. Result: **feed scrolling often doesn’t happen**.

## How the extension solves it

The **browser extension** runs a **content script** on `linkedin.com/feed`. That script runs in the **same JavaScript context** as the page:

1. **Same DOM**  
   It uses `document.querySelector('div[data-id^="urn:li:activity"]')` on the **exact** DOM the feed is using.

2. **Find the real scroll container**  
   From that first feed card it walks **up** the DOM (`element.parentElement`) and picks the first ancestor where `scrollHeight > clientHeight`. That **is** the feed’s scroll container — no guessing.

3. **Scroll it directly**  
   It does `container.scrollTop += 800` (or similar). That’s the same property the page itself uses when you scroll with the mouse. So scrolling **always** works as long as the feed is loaded.

4. **No focus, no window**  
   It doesn’t depend on window scroll or keyboard focus. It runs inside the page, so it has direct access to the same elements and the same scroll behavior.

So we **don’t** fix scrolling inside Playwright. We **recommend the extension** as the way to capture the feed when you need scrolling to work. Playwright remains an option for URN-only capture or for users who accept manual scrolling; for full feed capture with automatic scroll, use the extension.
