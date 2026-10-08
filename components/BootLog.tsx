"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type Tone = "fg" | "muted" | "dim" | "ok" | "warn" | "fail" | "sand";
export type Segment = { text: string; tone?: Tone };
export type LogLine = Segment[];

const TONE: Record<Tone, string> = {
  fg: "text-fg",
  muted: "text-muted",
  dim: "text-dim",
  ok: "text-ok",
  warn: "text-warn",
  fail: "text-fail",
  sand: "text-sand",
};

const CHAR_MS = 38;
const LINE_MS = 130;
const NAME_CHAR_MS = 55;
const SEEN_KEY = "boot-seen";

/**
 * The home page's one orchestrated moment: the real sync log replays, then the name types in.
 * Plays once per browser session and is skipped entirely when reduced motion is requested.
 */
export function BootLog({
  command,
  lines,
  name,
  children,
}: {
  command: string;
  lines: LogLine[];
  name: string;
  children: React.ReactNode;
}) {
  const cmdEnd = command.length * CHAR_MS + 200;
  const linesEnd = cmdEnd + lines.length * LINE_MS + 260;
  const total = linesEnd + name.length * NAME_CHAR_MS;

  const [t, setT] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) {
      setT(total);
      return;
    }
    const start = performance.now();
    const loop = (now: number) => {
      const elapsed = now - start;
      setT(Math.min(elapsed, total));
      if (elapsed < total) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [total]);

  const skip = () => {
    cancelAnimationFrame(raf.current);
    setT(total);
  };

  const typedCmd = command.slice(0, Math.floor(t / CHAR_MS));
  const visibleLines = t < cmdEnd ? 0 : Math.floor((t - cmdEnd) / LINE_MS) + 1;
  const typedName = t < linesEnd ? "" : name.slice(0, Math.floor((t - linesEnd) / NAME_CHAR_MS) + 1);
  const done = t >= total;

  return (
    <section aria-label="Introduction" onClick={done ? undefined : skip} className="relative pt-16 sm:pt-24">
      <noscript>
        <style>{`.boot-hidden{visibility:visible!important}.boot-ghost{visibility:visible!important}.boot-overlay{display:none}`}</style>
      </noscript>

      <div className="-mx-4 overflow-x-auto px-4 font-mono text-[12px] leading-6 text-muted [scrollbar-width:none] sm:mx-0 sm:px-0 sm:text-[13px]" aria-hidden={!done}>
        <p>
          <span className="text-ok">$</span> {typedCmd}
          {t < cmdEnd && <span className="ml-px inline-block h-[1.05em] w-[0.55em] translate-y-[2px] bg-muted" />}
        </p>
        {lines.map((line, i) => (
          <p key={i} className={cn("whitespace-pre", i >= visibleLines && "boot-hidden invisible")}>
            {line.map((seg, j) => (
              <span key={j} className={TONE[seg.tone ?? "muted"]}>
                {seg.text}
              </span>
            ))}
          </p>
        ))}
      </div>

      <h1 className="relative mt-10 font-mono text-[clamp(2.6rem,8vw,5.75rem)] font-medium leading-[0.95] tracking-[-0.045em] text-fg">
        {/* Full name reserves the final size so nothing below moves while it types */}
        <span className="sr-only">{name}</span>
        <span aria-hidden className="boot-ghost invisible">
          {name}
        </span>
        <span aria-hidden className="boot-overlay absolute inset-0">
          {typedName}
          <span
            className={cn(
              "ml-[0.06em] inline-block h-[0.82em] w-[0.42em] translate-y-[0.06em] bg-ok",
              done && "animate-blink",
            )}
          />
        </span>
      </h1>

      <motion.div
        initial={false}
        animate={done ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>

      {!done && (
        <button
          type="button"
          onClick={skip}
          className="absolute right-0 top-16 font-mono text-xs text-dim underline-offset-4 hover:text-fg hover:underline sm:top-24"
        >
          Skip intro
        </button>
      )}
    </section>
  );
}
