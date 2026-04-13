"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Cog,
  FileVideo,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Job {
  id: string;
  status: string;
  triggerType: string;
  keyword: string;
  filePath: string | null;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "done")
    return <CheckCircle2 className="w-4 h-4 text-[#B0E4CC]" />;
  if (s === "failed" || s === "error")
    return <AlertCircle className="w-4 h-4 text-red-400" />;
  if (s === "processing" || s === "rendering")
    return <Cog className="w-4 h-4 text-[#408A71] animate-spin" />;
  return <Clock className="w-4 h-4 text-yellow-400" />;
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const res = await api.scraper.getJobs();
      setJobs(res.data);
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const handleDelete = async (jobId: string) => {
    setDeleting(jobId);
    try {
      await api.scraper.deleteJob(jobId);
      setJobs(jobs.filter((j) => j.id !== jobId));
      toast.success("Job deleted and storage reclaimed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete job";
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-[#408A71]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold mb-1">Job History</h2>
          <p className="text-muted-foreground text-sm">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </motion.div>

      {/* Jobs Table */}
      {jobs.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl overflow-hidden"
        >
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-[#B0E4CC]/5">
            <div className="col-span-1">Status</div>
            <div className="col-span-3">Keyword</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-[#B0E4CC]/5">
            <AnimatePresence>
              {jobs.map((job) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 items-center hover:bg-[#408A71]/5 transition-colors"
                >
                  {/* Status */}
                  <div className="col-span-1 flex items-center gap-2">
                    <StatusIcon status={job.status} />
                    <span className={`badge ${getStatusBadge(job.status)} md:hidden`}>
                      {job.status}
                    </span>
                  </div>

                  {/* Keyword */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <FileVideo className="w-4 h-4 text-muted-foreground hidden md:block" />
                      <span className="text-sm font-medium truncate">{job.keyword}</span>
                    </div>
                    {job.errorMessage && (
                      <p className="text-xs text-red-400 mt-1 truncate">{job.errorMessage}</p>
                    )}
                  </div>

                  {/* Type */}
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground capitalize">
                      {job.triggerType}
                    </span>
                  </div>

                  {/* Size */}
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">
                      {job.fileSizeBytes ? formatBytes(job.fileSizeBytes) : "—"}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={deleting === job.id}
                      className="p-2 rounded-lg hover:bg-red-400/10 text-red-400/60 hover:text-red-400 transition-colors"
                      title="Delete job"
                    >
                      {deleting === job.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-16 text-center"
        >
          <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No jobs yet</h3>
          <p className="text-sm text-muted-foreground">
            Start by scraping your first keyword to see your history here.
          </p>
        </motion.div>
      )}
    </div>
  );
}
