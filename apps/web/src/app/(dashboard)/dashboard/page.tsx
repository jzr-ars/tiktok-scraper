"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  HardDrive,
  Activity,
  TrendingUp,
  ArrowUpRight,
  Search,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Balance {
  balance: number;
  usedStorageBytes: number;
}

interface Job {
  id: string;
  status: string;
  keyword: string;
  triggerType: string;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "badge-pending",
    queued: "badge-pending",
    processing: "badge-processing",
    rendering: "badge-processing",
    completed: "badge-done",
    done: "badge-done",
    failed: "badge-error",
    error: "badge-error",
  };
  return map[status.toLowerCase()] || "badge-pending";
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function DashboardPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [balRes, jobRes] = await Promise.all([
          api.scraper.getBalance(),
          api.scraper.getJobs(),
        ]);
        setBalance(balRes.data);
        setJobs(jobRes.data.slice(0, 5));
      } catch {
        // Will show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-[#408A71]" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Credit Balance",
      value: balance?.balance?.toString() || "0",
      icon: Wallet,
      color: "from-[#285A48] to-[#408A71]",
    },
    {
      label: "Storage Used",
      value: formatBytes(balance?.usedStorageBytes || 0),
      icon: HardDrive,
      color: "from-[#408A71] to-[#6bc9a3]",
    },
    {
      label: "Total Jobs",
      value: jobs.length.toString(),
      icon: Activity,
      color: "from-[#285A48] to-[#B0E4CC]",
    },
    {
      label: "Completed",
      value: jobs.filter((j) => j.status === "completed" || j.status === "done").length.toString(),
      icon: TrendingUp,
      color: "from-emerald-600 to-teal-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="glass rounded-xl p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}
              >
                <stat.icon className="w-5 h-5 text-[#e8f5ef]" />
              </div>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Link
          href="/dashboard/scrape"
          className="glass rounded-xl p-6 group hover:border-[#408A71]/30 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Start Scraping</h3>
              <p className="text-sm text-muted-foreground">
                Enter a keyword to start downloading TikTok videos
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#408A71]/10 flex items-center justify-center group-hover:bg-[#408A71]/20 transition-colors">
              <Search className="w-5 h-5 text-[#B0E4CC]" />
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/credits"
          className="glass rounded-xl p-6 group hover:border-[#408A71]/30 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Buy Credits</h3>
              <p className="text-sm text-muted-foreground">
                Purchase credits to run more scraping jobs
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#408A71]/10 flex items-center justify-center group-hover:bg-[#408A71]/20 transition-colors">
              <Wallet className="w-5 h-5 text-[#B0E4CC]" />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Recent Jobs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="glass rounded-xl"
      >
        <div className="p-5 border-b border-[#B0E4CC]/5 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Jobs</h3>
          <Link
            href="/dashboard/jobs"
            className="flex items-center gap-1 text-sm text-[#408A71] hover:text-[#B0E4CC] transition-colors"
          >
            View All
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {jobs.length > 0 ? (
          <div className="divide-y divide-[#B0E4CC]/5">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{job.keyword}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {job.triggerType} · {timeAgo(job.createdAt)}
                  </div>
                </div>
                <span className={`badge ${getStatusBadge(job.status)} flex-shrink-0`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-muted-foreground text-sm">
            No jobs yet. Start by scraping your first keyword!
          </div>
        )}
      </motion.div>
    </div>
  );
}
