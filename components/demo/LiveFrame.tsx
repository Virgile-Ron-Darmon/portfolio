"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button } from "../ui/button";

const TIMEOUT_MS = 10_000;

/** Embeds a live service. Shows a placeholder while loading and a way out if it never answers. */
export function LiveFrame({ src, title, height = 560 }: { src: string; title: string; height?: number }) {
  const [state, setState] = useState<"loading" | "ready" | "timeout">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState("loading");
    const id = setTimeout(() => setState((s) => (s === "loading" ? "timeout" : s)), TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [attempt]);

  const host = new URL(src).host;

  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-panel" style={{ height }}>
      <iframe
        key={attempt}
        src={src}
        title={title}
        onLoad={() => setState("ready")}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        className="size-full"
      />
      {state !== "ready" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-panel p-6 text-center"
        >
          {state === "loading" ? (
            <p className="font-mono text-sm text-muted">
              Connecting to {host}
              <span className="animate-blink">_</span>
            </p>
          ) : (
            <>
              <p className="max-w-[44ch] text-sm text-muted">
                {host} didn&apos;t respond within {TIMEOUT_MS / 1000} seconds. It may be restarting.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAttempt((a) => a + 1)}>
                  Try again
                </Button>
                <Button asChild variant="ghost">
                  <a href={src} target="_blank" rel="noopener noreferrer">
                    Open in a new tab
                  </a>
                </Button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
