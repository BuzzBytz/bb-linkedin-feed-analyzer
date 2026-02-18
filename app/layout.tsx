import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkedIn Engagement Assistant | Buzz Bytz",
  description:
    "Analyze your LinkedIn feed and get AI-powered engagement suggestions—reactions, comments, and repost ideas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
