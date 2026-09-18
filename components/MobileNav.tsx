"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground text-xs font-bold">
            A
          </div>
          <span className="text-sm font-semibold">Ads Manager</span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-border p-2 text-muted"
          aria-label="Abrir menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="border-b border-border bg-surface">
          <Sidebar />
        </div>
      )}
    </div>
  );
}
