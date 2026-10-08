"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { StatusDot } from "./CIStatusBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import type { CiState } from "@/lib/types";
import { cn } from "@/lib/utils";

const WINDOWS: { href: string; label: string; short?: string }[] = [
  { href: "/", label: "home" },
  { href: "/projects", label: "projects" },
  { href: "/infrastructure", label: "infrastructure", short: "infra" },
  { href: "/observability", label: "metrics" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{now ?? "--:--"}</span>;
}

/** Site navigation, styled as a tmux status line: session name, numbered windows, then system status. */
export function StatusBar({
  session,
  projects,
}: {
  session: string;
  projects: { slug: string; name: string; state: CiState | null }[];
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex h-10 max-w-6xl items-center gap-2 px-4 font-mono text-[12px] sm:gap-3 sm:px-6 sm:text-[13px]"
      >
        <Link href="/" className="shrink-0 text-ok hover:text-fg">
          [{session}]
        </Link>

        <ul className="-mx-1 flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none]">
          {WINDOWS.map((w, i) => {
            const active = isActive(pathname, w.href);
            return (
              <li key={w.href} className="relative">
                <Link
                  href={w.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative z-10 flex items-center whitespace-nowrap px-1.5 py-1 transition-colors sm:px-2",
                    active ? "text-bg" : "text-muted hover:text-fg",
                  )}
                >
                  <span className={cn(active ? "text-bg/70" : "text-dim")}>{i}:</span>
                  {w.short ? (
                    <>
                      <span className="sm:hidden">{w.short}</span>
                      <span className="hidden sm:inline">{w.label}</span>
                    </>
                  ) : (
                    w.label
                  )}
                  {active && <span aria-hidden>*</span>}
                </Link>
                {active && (
                  <motion.span
                    layoutId="status-window"
                    className="absolute inset-0 rounded-[3px] bg-ok"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
              </li>
            );
          })}
        </ul>

        <div className="hidden shrink-0 items-center gap-3 text-dim sm:flex">
          <span className="flex items-center gap-1.5" aria-label="CI status per project">
            {projects.map((p) => (
              <Tooltip key={p.slug}>
                <TooltipTrigger asChild>
                  <Link href={`/projects/${p.slug}`} className="flex size-4 items-center justify-center">
                    <StatusDot state={p.state ?? "unknown"} />
                    <span className="sr-only">{p.name}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  {p.name}: {p.state?.replace("_", " ") ?? "no runs"}
                </TooltipContent>
              </Tooltip>
            ))}
          </span>
          <Clock />
        </div>
      </nav>
    </header>
  );
}
