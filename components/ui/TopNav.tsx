"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Create table" },
  { href: "/join", label: "Join with code" },
  { href: "/demo", label: "Table preview" },
];

// Top-right navigation menu (dropdown). `extra` renders below the links,
// e.g. a "Leave seat" action inside a game.
export function TopNav({ extra }: { extra?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        className="btn-ghost rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-sm"
      >
        <span className="flex flex-col gap-[3px]">
          <span className="w-4 h-px bg-current" />
          <span className="w-4 h-px bg-current" />
          <span className="w-4 h-px bg-current" />
        </span>
        Menu
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 glass-strong rounded-xl p-1.5 z-50">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-parchment hover:text-gold-100 hover:bg-white/5 transition"
            >
              {l.label}
            </Link>
          ))}
          {extra && (
            <div className="mt-1 pt-1 border-t border-gold-500/15" onClick={() => setOpen(false)}>
              {extra}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
