"use client";

import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#091413] via-[#0f2420] to-[#285A48]/30" />
        <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-[#408A71]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#B0E4CC]/5 rounded-full blur-[80px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#285A48] to-[#408A71] flex items-center justify-center mx-auto mb-8">
            <Leaf className="w-8 h-8 text-[#B0E4CC]" />
          </div>
          <h2 className="text-3xl font-bold mb-4">TikTokScraper</h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
            Download, process, and manage TikTok content at scale. Built for creators and agencies.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-4 max-w-xs mx-auto">
            {[
              { value: "12K+", label: "Videos" },
              { value: "99.9%", label: "Uptime" },
              { value: "~8s", label: "Avg. Time" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-lg font-bold gradient-text">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#285A48] to-[#408A71] flex items-center justify-center">
                <Leaf className="w-5 h-5 text-[#B0E4CC]" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                TikTok<span className="text-[#B0E4CC]">Scraper</span>
              </span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
