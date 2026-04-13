"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Trash2,
  ArrowRight,
  Loader2,
  Type,
  Image,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

interface TextWatermark {
  type: "text";
  text: string;
  position: WatermarkPosition;
  fontSize?: number;
  color?: string;
}

interface ImageWatermark {
  type: "image";
  imageUrl: string;
  position: WatermarkPosition;
  scale?: number;
}

type Watermark = TextWatermark | ImageWatermark;

const positions: { value: WatermarkPosition; label: string }[] = [
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "center", label: "Center" },
];

export default function ScrapePage() {
  const [keyword, setKeyword] = useState("");
  const [watermarks, setWatermarks] = useState<Watermark[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWatermarks, setShowWatermarks] = useState(false);

  const addTextWatermark = () => {
    setWatermarks([
      ...watermarks,
      { type: "text", text: "", position: "bottom-right", fontSize: 24, color: "#FFFFFF" },
    ]);
  };

  const addImageWatermark = () => {
    setWatermarks([
      ...watermarks,
      { type: "image", imageUrl: "", position: "bottom-right", scale: 0.15 },
    ]);
  };

  const removeWatermark = (index: number) => {
    setWatermarks(watermarks.filter((_, i) => i !== index));
  };

  const updateWatermark = (index: number, updates: Partial<Watermark>) => {
    setWatermarks(
      watermarks.map((wm, i) => (i === index ? { ...wm, ...updates } as Watermark : wm))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    try {
      const validWatermarks = watermarks.filter((wm) =>
        wm.type === "text" ? wm.text.trim() : (wm as ImageWatermark).imageUrl.trim()
      );

      await api.scraper.manualScrape({
        keyword: keyword.trim(),
        watermarks: validWatermarks.length > 0 ? validWatermarks : undefined,
      });

      toast.success("Scraping job submitted! 1 credit deducted.");
      setKeyword("");
      setWatermarks([]);
      setShowWatermarks(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit job";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold mb-1">Manual Scrape</h2>
        <p className="text-muted-foreground">
          Enter a keyword to search and download TikTok videos
        </p>
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* Keyword Input */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm font-medium mb-3">
            <Search className="inline w-4 h-4 mr-1.5 text-[#408A71]" />
            Keyword
          </label>
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="input-field text-base"
              placeholder="e.g. cooking recipes, funny cats, tech reviews..."
              required
              minLength={1}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Each scrape costs 1 credit and processes 1 video from the search results.
          </p>
        </div>

        {/* Watermark Toggle */}
        <div className="glass rounded-xl p-6">
          <button
            type="button"
            onClick={() => setShowWatermarks(!showWatermarks)}
            className="flex items-center gap-2 text-sm font-medium text-[#B0E4CC] hover:text-white transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {showWatermarks ? "Hide" : "Add"} Watermarks (Optional)
          </button>

          <AnimatePresence>
            {showWatermarks && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-5 space-y-4">
                  {/* Watermark List */}
                  <AnimatePresence>
                    {watermarks.map((wm, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-4 rounded-lg bg-[#091413] border border-[#1a3830] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#408A71] uppercase tracking-wider">
                            {wm.type === "text" ? "Text" : "Image"} Watermark #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeWatermark(index)}
                            className="p-1 rounded hover:bg-red-400/10 text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {wm.type === "text" ? (
                          <>
                            <input
                              type="text"
                              value={wm.text}
                              onChange={(e) => updateWatermark(index, { text: e.target.value })}
                              className="input-field text-sm"
                              placeholder="Your watermark text..."
                            />
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs text-muted-foreground mb-1">Position</label>
                                <select
                                  value={wm.position}
                                  onChange={(e) => updateWatermark(index, { position: e.target.value as WatermarkPosition })}
                                  className="input-field text-xs"
                                >
                                  {positions.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-muted-foreground mb-1">Font Size</label>
                                <input
                                  type="number"
                                  value={wm.fontSize || 24}
                                  onChange={(e) => updateWatermark(index, { fontSize: Number(e.target.value) })}
                                  className="input-field text-xs"
                                  min={8}
                                  max={120}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-muted-foreground mb-1">Color</label>
                                <input
                                  type="color"
                                  value={wm.color || "#FFFFFF"}
                                  onChange={(e) => updateWatermark(index, { color: e.target.value })}
                                  className="w-full h-9 rounded-lg cursor-pointer border border-[#1a3830] bg-transparent"
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <input
                              type="url"
                              value={(wm as ImageWatermark).imageUrl}
                              onChange={(e) => updateWatermark(index, { imageUrl: e.target.value })}
                              className="input-field text-sm"
                              placeholder="https://example.com/logo.png"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-muted-foreground mb-1">Position</label>
                                <select
                                  value={wm.position}
                                  onChange={(e) => updateWatermark(index, { position: e.target.value as WatermarkPosition })}
                                  className="input-field text-xs"
                                >
                                  {positions.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-muted-foreground mb-1">Scale</label>
                                <input
                                  type="number"
                                  value={(wm as ImageWatermark).scale || 0.15}
                                  onChange={(e) => updateWatermark(index, { scale: Number(e.target.value) })}
                                  className="input-field text-xs"
                                  min={0.01}
                                  max={1}
                                  step={0.01}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Add Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={addTextWatermark}
                      className="btn-secondary text-xs py-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <Type className="w-3.5 h-3.5" />
                      Text
                    </button>
                    <button
                      type="button"
                      onClick={addImageWatermark}
                      className="btn-secondary text-xs py-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <Image className="w-3.5 h-3.5" />
                      Image
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !keyword.trim()}
          className="btn-primary w-full py-3.5 text-base"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Start Scraping
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </motion.form>
    </div>
  );
}
