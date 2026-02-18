document.getElementById("capture").addEventListener("click", async () => {
  const btn = document.getElementById("capture");
  const result = document.getElementById("result");
  btn.disabled = true;
  result.textContent = "Capturing...";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.url?.includes("linkedin.com")) {
      result.textContent = "Open LinkedIn in this tab first.";
      btn.disabled = false;
      return;
    }

    const [{ result: captureResult }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const capture = window.__LINKEDIN_FEED_CAPTURE__;
        if (!capture?.getPosts) return { posts: [], error: "Script not loaded" };
        const posts = capture.getPosts();
        return { posts };
      },
    });

    const posts = captureResult?.posts || [];
    if (posts.length === 0) {
      result.textContent =
        "No posts found. Scroll through your feed and try again.";
      btn.disabled = false;
      return;
    }

    // Download as JSON
    const blob = new Blob([JSON.stringify(posts, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `linkedin-feed-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    result.innerHTML = `<span class="count">${posts.length}</span> posts captured. File downloaded. Import in the dashboard.`;
  } catch (e) {
    result.textContent = "Error: " + (e.message || "Unknown");
  }
  btn.disabled = false;
});
