"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { HANDBOOK_SECTIONS } from "@/lib/mcu-handbook"

export function HandbookModule() {
  const [activeId, setActiveId] = useState(HANDBOOK_SECTIONS[0]?.id ?? "intro")
  const active = HANDBOOK_SECTIONS.find((s) => s.id === activeId) ?? HANDBOOK_SECTIONS[0]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-zinc-800/80 px-4 py-3">
        <h1 className="font-mono text-sm font-semibold tracking-widest">STAFF HANDBOOK</h1>
        <p className="font-mono text-[10px] text-muted-foreground">Procedures, policies &amp; MCU guide</p>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden border-t border-zinc-800/60">
        <nav
          className="w-[220px] shrink-0 overflow-y-auto border-r border-zinc-800/60 bg-zinc-950/40 py-2"
          aria-label="Handbook sections"
        >
          {HANDBOOK_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveId(section.id)}
              className={cn(
                "block w-full border-l-[3px] px-4 py-2.5 text-left font-mono text-[11px] leading-snug transition-colors",
                activeId === section.id
                  ? "border-l-amber-400 bg-zinc-900/80 font-semibold text-amber-400"
                  : "border-l-transparent text-muted-foreground hover:bg-zinc-900/40 hover:text-foreground",
              )}
            >
              {section.title}
            </button>
          ))}
        </nav>

        <div className="handbook-content min-w-0 flex-1 overflow-y-auto px-8 py-6">
          <style>{`
            .handbook-content h2 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.875rem; color: #fafafa; }
            .handbook-content h3 { font-size: 0.9375rem; font-weight: 700; margin: 1.125rem 0 0.5rem; color: #e4e4e7; }
            .handbook-content p, .handbook-content li { font-size: 0.8125rem; line-height: 1.6; margin-bottom: 0.5rem; color: #a1a1aa; }
            .handbook-content ul, .handbook-content ol { margin: 0.5rem 0 0.75rem 1.25rem; }
            .handbook-content code { font-family: ui-monospace, monospace; font-size: 0.75rem; color: #d4d4d8; }
            .handbook-content kbd { border: 1px solid #52525b; border-radius: 4px; padding: 0 0.35rem; font-size: 0.7rem; }
            .handbook-content .hb-good { border-left: 3px solid #34d399; padding: 0.75rem 1rem; margin: 0.75rem 0; background: rgba(52,211,153,0.08); border-radius: 0 0.5rem 0.5rem 0; color: #d1fae5; font-size: 0.8125rem; }
            .handbook-content .hb-bad { border-left: 3px solid #f87171; padding: 0.75rem 1rem; margin: 0.75rem 0; background: rgba(248,113,113,0.08); border-radius: 0 0.5rem 0.5rem 0; color: #fecaca; font-size: 0.8125rem; }
            .handbook-content .hb-danger { border: 1px solid rgba(239,68,68,0.4); background: rgba(239,68,68,0.08); padding: 1rem; margin: 0.75rem 0; border-radius: 0.5rem; color: #fecaca; font-size: 0.8125rem; }
            .handbook-content .hb-table { width: 100%; border-collapse: collapse; margin: 0.75rem 0 1rem; font-size: 0.75rem; }
            .handbook-content .hb-table th, .handbook-content .hb-table td { border: 1px solid rgba(255,255,255,0.08); padding: 0.5rem 0.625rem; text-align: left; }
            .handbook-content .hb-table th { color: #d4d4d8; font-weight: 600; background: rgba(255,255,255,0.03); }
            .handbook-content .hb-table td { color: #a1a1aa; }
          `}</style>
          {active && (
            <div dangerouslySetInnerHTML={{ __html: active.content }} />
          )}
        </div>
      </div>
    </div>
  )
}
