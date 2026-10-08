"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";

/** Pages are cached, so relative times are computed in the browser to stay accurate. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setLabel(timeAgo(iso));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return (
    <time dateTime={iso} className={className} title={new Date(iso).toUTCString()}>
      {label ?? new Date(iso).toISOString().slice(0, 10)}
    </time>
  );
}
