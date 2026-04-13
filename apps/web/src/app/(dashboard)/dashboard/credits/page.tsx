"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Plus,
  Loader2,
  CreditCard,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const creditPackages = [
  { amount: 10, label: "Starter", description: "Good for testing" },
  { amount: 50, label: "Creator", description: "For regular use" },
  { amount: 100, label: "Pro", description: "Best value" },
  { amount: 500, label: "Agency", description: "For teams" },
];

export default function CreditsPage() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.scraper.getBalance();
        setBalance(res.data.balance);
      } catch {
        // empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleBuy = async (amount: number) => {
    setBuying(amount);
    try {
      await api.scraper.buyCredits({ amount });
      setBalance((prev) => prev + amount);
      toast.success(`Purchased ${amount} credits!`);
      setCustomAmount("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Purchase failed";
      toast.error(message);
    } finally {
      setBuying(null);
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
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-8 text-center animated-border"
      >
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#285A48] to-[#408A71] flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7 text-[#B0E4CC]" />
          </div>
          <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
          <div className="text-5xl font-bold gradient-text mb-2">{balance}</div>
          <div className="text-sm text-muted-foreground">credits available</div>
        </div>
      </motion.div>

      {/* Packages */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#408A71]" />
          Credit Packages
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {creditPackages.map((pkg, i) => (
            <motion.button
              key={pkg.amount}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => handleBuy(pkg.amount)}
              disabled={buying !== null}
              className="glass rounded-xl p-5 text-center hover:border-[#408A71]/30 transition-all duration-300 group"
            >
              {buying === pkg.amount ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#408A71]" />
              ) : (
                <>
                  <div className="text-2xl font-bold gradient-text mb-1">{pkg.amount}</div>
                  <div className="text-sm font-medium mb-0.5">{pkg.label}</div>
                  <div className="text-xs text-muted-foreground">{pkg.description}</div>
                </>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-xl p-6"
      >
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#408A71]" />
          Custom Amount
        </h3>
        <div className="flex gap-3">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="input-field flex-1"
            placeholder="Enter amount..."
            min={1}
          />
          <button
            onClick={() => {
              const amount = parseInt(customAmount);
              if (amount > 0) handleBuy(amount);
            }}
            disabled={buying !== null || !customAmount || parseInt(customAmount) < 1}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Buy
          </button>
        </div>
      </motion.div>
    </div>
  );
}
