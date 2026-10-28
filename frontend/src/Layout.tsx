import { useCallback, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import "./default.css";
import "./transitions.css";
import { playSand } from "./sand.ts";
import { SandNavContext } from "./sand-context.ts";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4";

/**
 * Persistent shell: the background video lives here so it keeps playing
 * while pages swap, and the sand canvas sits above everything.
 */
export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busy = useRef(false);
  const dim = pathname.startsWith("/audit-setup");

  const go = useCallback(
    (to: string) => {
      const canvas = canvasRef.current;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!canvas || reduced) {
        navigate(to);
        return;
      }
      if (busy.current) return;
      busy.current = true;
      playSand(canvas, () => navigate(to)).finally(() => {
        busy.current = false;
      });
    },
    [navigate],
  );

  return (
    <SandNavContext.Provider value={go}>
      <div data-appearance="dark" className="relative min-h-dvh bg-background">
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 size-full object-cover"
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
        <div
          aria-hidden="true"
          className="shell-scrim pointer-events-none fixed inset-0 z-0"
          data-dim={dim}
        />
        <div className="relative z-10">
          <Outlet />
        </div>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="fixed inset-0 z-[100] size-full"
          style={{ display: "none" }}
        />
      </div>
    </SandNavContext.Provider>
  );
}
