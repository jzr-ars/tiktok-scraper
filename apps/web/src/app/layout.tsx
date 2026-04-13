import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "TikTok Scraper — Dashboard",
  description: "Automated TikTok video scraping and processing platform. Download, process, and manage TikTok content at scale.",
  keywords: ["tiktok", "scraper", "video", "automation", "dashboard"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen">
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "#0f1f1c",
              border: "1px solid #1a3830",
              color: "#e8f5ef",
            },
          }}
        />
      </body>
    </html>
  );
}
