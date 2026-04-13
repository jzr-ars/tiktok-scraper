"use client";

import { motion } from "framer-motion";
import {
  Download,
  Zap,
  Settings,
  BarChart3,
  Video,
  Shield,
  ArrowRight,
  Leaf,
} from "lucide-react";

const features = [
  {
    icon: Download,
    title: "Video Scraping",
    description: "Download TikTok videos by keyword with one click. Built-in smart filtering.",
    color: "from-[#285A48] to-[#408A71]",
  },
  {
    icon: Zap,
    title: "Auto Processing",
    description: "Process videos in the background with overlays, watermarks, and comment boxes.",
    color: "from-[#408A71] to-[#6bc9a3]",
  },
  {
    icon: Settings,
    title: "Custom Watermarks",
    description: "Add text or image watermarks with full position, size, and color control.",
    color: "from-[#285A48] to-[#B0E4CC]",
  },
  {
    icon: BarChart3,
    title: "Job Dashboard",
    description: "Monitor scraping jobs in real-time. Track progress, storage, and credits.",
    color: "from-emerald-600 to-teal-500",
  },
  {
    icon: Video,
    title: "FFmpeg Pipeline",
    description: "Professional video rendering with blurred backgrounds and comment overlays.",
    color: "from-[#408A71] to-emerald-400",
  },
  {
    icon: Shield,
    title: "Auth & Security",
    description: "JWT-based authentication with role-based access control built in.",
    color: "from-[#285A48] to-[#408A71]",
  },
];

const stats = [
  { label: "Videos Processed", value: "12K+" },
  { label: "Active Users", value: "240+" },
  { label: "Uptime", value: "99.9%" },
  { label: "Avg. Process Time", value: "~8s" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#285A48]/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#408A71]/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-[#B0E4CC]/5 rounded-full blur-[80px]" />
      </div>

      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="glass sticky top-0 z-50 border-b border-[#B0E4CC]/5"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#285A48] to-[#408A71] flex items-center justify-center">
              <Leaf className="w-5 h-5 text-[#B0E4CC]" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              TikTok<span className="text-[#B0E4CC]">Scraper</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </a>
            <a
              href="/register"
              className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-[#285A48] to-[#408A71] text-[#e8f5ef] font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </a>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-[#408A71]/30 bg-[#408A71]/10 text-sm text-[#B0E4CC]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] pulse-dot" />
            Platform is live
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Scrape TikTok{" "}
            <span className="gradient-text">Videos at Scale</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
            Download, process, and manage TikTok content with automated
            watermarks, comment overlays, and background processing. Built for
            creators and agencies.
          </p>

          <div className="flex items-center justify-center gap-4">
            <motion.a
              href="/register"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#285A48] to-[#408A71] text-[#e8f5ef] font-semibold text-base shadow-lg shadow-[#408A71]/20 hover:shadow-[#408A71]/30 transition-shadow"
            >
              Start Scraping
              <ArrowRight className="w-4 h-4" />
            </motion.a>
            <motion.a
              href="#features"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#B0E4CC]/10 text-muted-foreground hover:text-foreground font-medium text-base transition-colors"
            >
              Learn More
            </motion.a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-xl p-5 text-center glow-sm"
            >
              <div className="text-2xl md:text-3xl font-bold gradient-text">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to{" "}
            <span className="gradient-text">scale content</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A complete toolkit for downloading, processing, and managing TikTok
            videos at scale.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              whileHover={{ y: -4 }}
              className="glass rounded-2xl p-6 group cursor-pointer hover:border-[#408A71]/30 transition-all duration-300"
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="w-5 h-5 text-[#e8f5ef]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden p-12 md:p-16 text-center animated-border"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#285A48]/15 via-[#408A71]/5 to-transparent rounded-3xl" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to automate your workflow?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
              Join hundreds of creators who use TikTokScraper to manage their
              content pipeline.
            </p>
            <motion.a
              href="/register"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#285A48] to-[#408A71] text-[#e8f5ef] font-semibold text-lg shadow-lg shadow-[#408A71]/25"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#B0E4CC]/5">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Leaf className="w-4 h-4 text-[#408A71]" />
            <span>TikTokScraper © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Docs
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              API
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
