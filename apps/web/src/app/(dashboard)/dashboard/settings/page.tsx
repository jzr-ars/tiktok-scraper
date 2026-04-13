"use client";

import { motion } from "framer-motion";
import { Settings, User, Lock, Bell } from "lucide-react";
import { useAuthStore } from "@/store/auth";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold mb-1">Settings</h2>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </motion.div>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <User className="w-5 h-5 text-[#408A71]" />
          <h3 className="text-base font-semibold">Profile</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Name</label>
            <input
              type="text"
              defaultValue={user?.name || ""}
              className="input-field"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
            <input
              type="email"
              defaultValue={user?.email || ""}
              className="input-field"
              placeholder="your@email.com"
              disabled
            />
          </div>
          <button className="btn-primary text-sm">Save Changes</button>
        </div>
      </motion.div>

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <Lock className="w-5 h-5 text-[#408A71]" />
          <h3 className="text-base font-semibold">Security</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Current Password</label>
            <input type="password" className="input-field" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">New Password</label>
            <input type="password" className="input-field" placeholder="Min. 6 characters" />
          </div>
          <button className="btn-primary text-sm">Update Password</button>
        </div>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <Bell className="w-5 h-5 text-[#408A71]" />
          <h3 className="text-base font-semibold">Notifications</h3>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm">Email when job completes</span>
            <div className="w-10 h-6 rounded-full bg-[#285A48] p-0.5 transition-colors group-hover:bg-[#408A71]">
              <div className="w-5 h-5 rounded-full bg-[#B0E4CC] shadow-sm transform transition-transform" />
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm">Email when credits are low</span>
            <div className="w-10 h-6 rounded-full bg-[#285A48] p-0.5 transition-colors group-hover:bg-[#408A71]">
              <div className="w-5 h-5 rounded-full bg-[#B0E4CC] shadow-sm transform transition-transform" />
            </div>
          </label>
        </div>
      </motion.div>
    </div>
  );
}
