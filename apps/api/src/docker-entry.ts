/**
 * Docker / production entry: runs preload diagnostics before loading the app graph.
 * Avoids relying on `bun run --preload` (flag behavior differs by Bun version).
 */
import './preload';
import './index';
