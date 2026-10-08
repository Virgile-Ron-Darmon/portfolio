"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

export interface ShellScript {
  prompt: string;
  session: { cmd: string; out: string[] }[];
}

type Line = { kind: "cmd" | "out"; text: string };

/** Replays a recorded terminal session. Stand-in for a live web shell from the demo service. */
export function MockShell({ script }: { script: ShellScript }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [typing, setTyping] = useState("");
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

    (async () => {
      setLines([]);
      setDone(false);
      await sleep(400);
      for (const step of script.session) {
        for (let i = 1; i <= step.cmd.length; i++) {
          if (cancelled) return;
          setTyping(step.cmd.slice(0, i));
          await sleep(45 + Math.random() * 40);
        }
        await sleep(250);
        if (cancelled) return;
        setTyping("");
        setLines((l) => [...l, { kind: "cmd", text: step.cmd }]);
        for (const out of step.out) {
          await sleep(out.startsWith("[") ? 220 : 60);
          if (cancelled) return;
          setLines((l) => [...l, { kind: "out", text: out }]);
        }
        await sleep(700);
      }
      if (!cancelled) setDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [script, run]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines, typing]);

  const prompt = (
    <>
      <span className="text-ok">{script.prompt}</span>
      <span className="text-dim">:~$ </span>
    </>
  );

  return (
    <div className="overflow-hidden rounded-md border border-line bg-[#0a0c0e]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2 font-mono text-xs text-dim">
        <span>{script.prompt}: bash</span>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          disabled={!done}
          className="inline-flex items-center gap-1.5 hover:text-fg disabled:opacity-0"
        >
          <RotateCcw className="size-3" /> Replay
        </button>
      </div>
      <div
        ref={bodyRef}
        className="h-[380px] overflow-y-auto p-4 font-mono text-[13px] leading-[1.7]"
        role="log"
        aria-live="polite"
      >
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap break-words">
            {l.kind === "cmd" ? (
              <>
                {prompt}
                <span className="text-fg">{l.text}</span>
              </>
            ) : (
              <span className={/passed|ok$|0 issues/.test(l.text) ? "text-ok" : /cached|cache hit/.test(l.text) ? "text-warn" : "text-muted"}>
                {l.text || " "}
              </span>
            )}
          </div>
        ))}
        <div className="whitespace-pre-wrap">
          {prompt}
          <span className="text-fg">{typing}</span>
          <span className="ml-px inline-block h-[1.05em] w-[0.55em] translate-y-[3px] animate-blink bg-fg/80" aria-hidden />
        </div>
      </div>
    </div>
  );
}
