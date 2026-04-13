"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  LayoutDashboard,
  Search,
  History,
  Settings,
  LogOut,
  CreditCard,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Toaster } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/scrape", label: "Scrape", icon: Search },
  { href: "/dashboard/jobs", label: "Jobs", icon: History },
  { href: "/dashboard/credits", label: "Credits", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.push("/login");
    }
  }, [mounted, token, router]);

  if (!mounted || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#408A71] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex">
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

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[#B0E4CC]/5 bg-[#0a1816]">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-[#B0E4CC]/5">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#285A48] to-[#408A71] flex items-center justify-center">
                <Leaf className="w-5 h-5 text-[#B0E4CC]" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                TikTok<span className="text-[#B0E4CC]">Scraper</span>
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? "active" : ""}`}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-3 border-t border-[#B0E4CC]/5">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#408A71]/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#285A48] to-[#408A71] flex items-center justify-center text-sm font-semibold text-[#B0E4CC]">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium truncate">{user?.name || "User"}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email || ""}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute bottom-full left-0 right-0 mb-2 p-1.5 rounded-lg glass border border-[#B0E4CC]/10"
                  >
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-[#0a1816] border-r border-[#B0E4CC]/5 z-50 lg:hidden"
            >
              <div className="flex flex-col h-full">
                <div className="p-5 border-b border-[#B0E4CC]/5 flex items-center justify-between">
                  <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#285A48] to-[#408A71] flex items-center justify-center">
                      <Leaf className="w-5 h-5 text-[#B0E4CC]" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">
                      TikTok<span className="text-[#B0E4CC]">Scraper</span>
                    </span>
                  </Link>
                  <button onClick={() => setSidebarOpen(false)}>
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`sidebar-link ${isActive ? "active" : ""}`}
                      >
                        <item.icon className="w-[18px] h-[18px]" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="p-3 border-t border-[#B0E4CC]/5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 glass border-b border-[#B0E4CC]/5">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-[#408A71]/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden lg:block">
              <h1 className="text-lg font-semibold capitalize">
                {pathname === "/dashboard"
                  ? "Overview"
                  : pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#408A71]/10 border border-[#408A71]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] pulse-dot" />
                <span className="text-xs text-[#B0E4CC] font-medium">Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
