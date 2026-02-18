import type { LinkedInPost } from "@/types";

/**
 * Sample feed data for testing when no browser extension or import is used
 */
export const SAMPLE_FEED: LinkedInPost[] = [
  {
    id: "1",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:1234567890/",
    authorName: "Satya Nadella",
    authorProfileUrl: "https://www.linkedin.com/in/satyanadella/",
    authorFollowers: 10500000,
    content:
      "The future of work is hybrid. Here's how we're reimagining productivity at Microsoft. #FutureOfWork #Microsoft #Productivity",
    reactions: 12500,
    comments: 450,
    postedAt: new Date().toISOString(),
    hashtags: ["FutureOfWork", "Microsoft", "Productivity"],
    commentsPreview: ["Great insights!", "This resonates with me"],
  },
  {
    id: "2",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:1234567891/",
    authorName: "Sarah Chen",
    authorProfileUrl: "https://www.linkedin.com/in/sarahchen/",
    authorFollowers: 25000,
    content:
      "5 lessons I learned from building a startup in 2024. Thread 🧵 #Startup #Entrepreneurship #LessonsLearned",
    reactions: 850,
    comments: 120,
    postedAt: new Date(Date.now() - 86400000).toISOString(),
    hashtags: ["Startup", "Entrepreneurship", "LessonsLearned"],
  },
  {
    id: "3",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:1234567892/",
    authorName: "Alex Rivera",
    authorProfileUrl: "https://www.linkedin.com/in/alexrivera/",
    authorFollowers: 15000,
    content:
      "AI is transforming every industry. Here's what you need to know to stay ahead. #AI #Innovation #Tech",
    reactions: 620,
    comments: 95,
    postedAt: new Date(Date.now() - 172800000).toISOString(),
    hashtags: ["AI", "Innovation", "Tech"],
  },
  {
    id: "4",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:1234567893/",
    authorName: "Emma Watson",
    authorProfileUrl: "https://www.linkedin.com/in/emmawatson/",
    authorFollowers: 8500000,
    content:
      "Leadership isn't about being in charge. It's about taking care of those in your charge. #Leadership #Management",
    reactions: 3200,
    comments: 280,
    postedAt: new Date(Date.now() - 259200000).toISOString(),
    hashtags: ["Leadership", "Management"],
  },
  {
    id: "5",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:1234567894/",
    authorName: "David Kim",
    authorProfileUrl: "https://www.linkedin.com/in/davidkim/",
    authorFollowers: 45000,
    content:
      "Remote work tips that actually work. After 3 years of full remote, here's what I've learned. #RemoteWork #Productivity",
    reactions: 1100,
    comments: 150,
    postedAt: new Date(Date.now() - 345600000).toISOString(),
    hashtags: ["RemoteWork", "Productivity"],
    commentsPreview: ["John mentioned you in a comment - great post!"],
  },
];
