"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Language } from "@/lib/types";

export function LanguageBar({ languages, legend = true }: { languages: Language[]; legend?: boolean }) {
  const reduce = useReducedMotion();
  if (!languages.length) return null;
  return (
    <div className="w-full">
      <div
        className="flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={languages.map((l) => `${l.name} ${l.percent}%`).join(", ")}
      >
        {languages.map((l, i) => (
          <motion.span
            key={l.name}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: l.color }}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${l.percent}%` }}
            transition={{ duration: 0.7, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
      {legend && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted">
          {languages.map((l) => (
            <li key={l.name} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-[2px]" style={{ backgroundColor: l.color }} aria-hidden />
              {l.name}
              <span className="text-dim">{l.percent}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
