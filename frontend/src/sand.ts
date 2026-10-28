/**
 * "Sand" page transition.
 *
 * Phase 1 (cover): digits pour down every column and pile up from the bottom
 * until the screen is full. Phase 2 (reveal): the pile sinks and drains away,
 * uncovering the new page. All rendering is on one canvas.
 */

const GLYPHS = "0123456789012345678901234567890123456789<%*↑";
const CELL = 20;
const COVER_MS = 1100;
const HOLD_MS = 260;
const REVEAL_MS = 1100;

const SAND = "10,11,16"; // pile fill (matches the dark page)
const SURFACE = "255,214,10"; // accent, used sparingly on the surface

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function playSand(
  canvas: HTMLCanvasElement,
  onCovered: () => void,
): Promise<void> {
  return new Promise((resolve) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.display = "block";
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const cols = Math.ceil(w / CELL);
    const rows = Math.ceil(h / CELL);
    const rand = mulberry32(Math.floor(Math.random() * 1e9));

    // Stable glyph per cell, plus per-column character for falling grains.
    const grid = Array.from({ length: cols * rows }, () =>
      GLYPHS[Math.floor(rand() * GLYPHS.length)],
    );
    const colSeed = Array.from({ length: cols }, () => rand());
    const coverDelay = Array.from({ length: cols }, (_, c) =>
      clamp(0.18 * (0.5 + 0.5 * Math.sin(c * 0.23 + 1.2)) + colSeed[c] * 0.14, 0, 0.32),
    );
    const revealDelay = Array.from({ length: cols }, (_, c) =>
      clamp(0.2 * (0.5 + 0.5 * Math.sin(c * 0.17 + 4)) + colSeed[c] * 0.12, 0, 0.32),
    );
    const dune = (c: number) =>
      Math.sin(c * 0.31) * 1.6 + Math.sin(c * 0.77 + 2) * 0.9 + Math.sin(c * 1.9) * 0.4;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `500 ${CELL - 6}px "Geist Mono", ui-monospace, Menlo, monospace`;

    /** Height of the pile in rows for column c. */
    function pileRows(c: number, t: number, phase: "cover" | "reveal") {
      const delay = phase === "cover" ? coverDelay[c] : revealDelay[c];
      const p = clamp((t - delay) / (1 - 0.34));
      const shaped = phase === "cover" ? p * p * (3 - 2 * p) * 0.55 + p * 0.45 : easeInOut(p);
      const amount = phase === "cover" ? shaped : 1 - shaped;
      const wobble = dune(c) * 4 * amount * (1 - amount);
      return clamp(amount * rows + wobble, 0, rows);
    }

    function drawFrame(t: number, phase: "cover" | "reveal", now: number) {
      ctx.clearRect(0, 0, w, h);
      for (let c = 0; c < cols; c++) {
        const x = c * CELL + CELL / 2;
        const rowsFilled = pileRows(c, t, phase);
        const full = Math.floor(rowsFilled);
        const topY = h - rowsFilled * CELL;

        // pile body
        if (rowsFilled > 0) {
          ctx.fillStyle = `rgb(${SAND})`;
          ctx.fillRect(c * CELL, topY, CELL + 0.5, h - topY);
        }
        // pile digits: brighter near the surface, fading with depth
        for (let r = 0; r < full; r++) {
          const y = h - (r + 0.5) * CELL;
          const depth = (full - r) / Math.max(full, 1); // 0 at surface
          const surface = r >= full - 1;
          const a = surface ? 0.95 : 0.1 + 0.4 * (1 - depth) ** 2;
          ctx.fillStyle = surface
            ? `rgba(${SURFACE},${a})`
            : `rgba(255,255,255,${a})`;
          ctx.fillText(grid[r * cols + c], x, y);
        }

        // falling grains: pour in during cover, sink through during reveal
        const active =
          phase === "cover" ? rowsFilled < rows - 0.5 : rowsFilled > 0.5;
        if (!active) continue;
        const fallTop = phase === "cover" ? 0 : h - rowsFilled * CELL;
        const fallBottom = phase === "cover" ? topY : h;
        const span = fallBottom - fallTop;
        if (span < CELL) continue;
        const speed = 0.0009 + colSeed[c] * 0.0006;
        for (let k = 0; k < 3; k++) {
          const f = (now * speed + colSeed[c] * 7 + k / 3) % 1;
          const y = fallTop + f * span;
          const head = phase === "cover" ? 0.85 : 0.5;
          // trail of 4 glyphs behind the head
          for (let j = 0; j < 4; j++) {
            const ty = y - j * CELL;
            if (ty < fallTop) break;
            ctx.fillStyle = `rgba(255,255,255,${head * (1 - j * 0.25) * (phase === "cover" ? 1 - f * 0.3 : 1 - f * 0.5)})`;
            ctx.fillText(grid[((Math.floor(ty / CELL) + c * 3 + k) % rows + rows) % rows * cols + c], x, ty);
          }
        }
      }
    }

    let start = 0;
    let phase: "cover" | "hold" | "reveal" = "cover";
    let holdStart = 0;

    function frame(now: number) {
      if (!start) start = now;
      if (phase === "cover") {
        const t = clamp((now - start) / COVER_MS);
        drawFrame(t, "cover", now);
        if (t >= 1) {
          phase = "hold";
          holdStart = now;
          onCovered();
        }
      } else if (phase === "hold") {
        drawFrame(1, "cover", now);
        if (now - holdStart >= HOLD_MS) {
          phase = "reveal";
          start = now;
        }
      } else {
        const t = clamp((now - start) / REVEAL_MS);
        drawFrame(t, "reveal", now);
        if (t >= 1) {
          ctx.clearRect(0, 0, w, h);
          canvas.style.display = "none";
          resolve();
          return;
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}
