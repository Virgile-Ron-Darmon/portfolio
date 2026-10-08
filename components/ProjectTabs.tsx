"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { TabType } from "@/lib/schema";
import { cn } from "@/lib/utils";

const LABELS: Record<TabType, string> = { description: "Description", demo: "Demo", code: "Code" };

/**
 * Title-page tabs. State lives in the URL (?tab=) so any panel can be linked to,
 * but switching only rewrites history: no navigation, no server round trip.
 */
export function ProjectTabs({
  tabs,
  initial,
  panels,
}: {
  tabs: TabType[];
  initial: TabType;
  panels: Partial<Record<TabType, ReactNode>>;
}) {
  const [active, setActive] = useState<TabType>(initial);
  const refs = useRef<Partial<Record<TabType, HTMLButtonElement | null>>>({});

  const select = (tab: TabType) => {
    setActive(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    if (tab !== "code") url.searchParams.delete("file");
    window.history.replaceState(window.history.state, "", url);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.indexOf(active);
    const next =
      e.key === "ArrowRight" ? tabs[(i + 1) % tabs.length]
      : e.key === "ArrowLeft" ? tabs[(i - 1 + tabs.length) % tabs.length]
      : e.key === "Home" ? tabs[0]
      : e.key === "End" ? tabs[tabs.length - 1]
      : null;
    if (!next) return;
    e.preventDefault();
    select(next);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Project sections" onKeyDown={onKeyDown} className="flex gap-1 border-b border-line">
        {tabs.map((tab) => {
          const selected = tab === active;
          return (
            <button
              key={tab}
              ref={(el) => {
                refs.current[tab] = el;
              }}
              role="tab"
              id={`tab-${tab}`}
              aria-selected={selected}
              aria-controls={`panel-${tab}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab)}
              className={cn(
                "relative -mb-px px-4 py-2.5 font-mono text-sm transition-colors",
                selected ? "text-fg" : "text-dim hover:text-muted",
              )}
            >
              {LABELS[tab]}
              {selected && (
                <motion.span
                  layoutId="project-tab"
                  className="absolute inset-x-2 -bottom-px h-[2px] bg-ok"
                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          role="tabpanel"
          id={`panel-${active}`}
          aria-labelledby={`tab-${active}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="pt-8"
        >
          {panels[active]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
