"use client"

import { useState } from "react"
import {
  SlidersHorizontal,
  Webhook,
  Boxes,
  Palette,
  Plus,
  RotateCw,
  Copy,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { tenants } from "@/lib/data"

const sections = [
  { id: "general", label: "General", icon: SlidersHorizontal },
  { id: "api", label: "API & Webhooks", icon: Webhook },
  { id: "bindings", label: "Sub-project Bindings", icon: Boxes },
  { id: "branding", label: "Branding & Whitelabeling", icon: Palette },
]

export function SystemSettings() {
  const [active, setActive] = useState("general")

  return (
    <div className="flex min-h-0 flex-1">
      {/* Sticky inner subnav */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">System Settings</h2>
          <p className="font-mono text-[11px] text-muted-foreground">Parent company config</p>
        </div>
        <nav className="sticky top-0 p-2">
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-xs transition-colors",
                  active === s.id
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {s.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content */}
      <section className="min-h-0 flex-1 overflow-auto bg-background scrollbar-thin">
        <div className="mx-auto max-w-3xl space-y-4 p-6">
          {active === "general" && <GeneralSection />}
          {active === "api" && <ApiSection />}
          {active === "bindings" && <BindingsSection />}
          {active === "branding" && <BrandingSection />}
        </div>
      </section>
    </div>
  )
}

function Card({
  title,
  desc,
  children,
  footer,
}: {
  title: string
  desc: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="space-y-4 p-4">{children}</div>
      {footer && (
        <div className="flex items-center justify-end gap-2 border-t border-border bg-background px-4 py-2.5">
          {footer}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-8 w-full rounded-sm border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
    />
  )
}

function SaveBtn() {
  return (
    <button className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
      Save Changes
    </button>
  )
}

function GeneralSection() {
  return (
    <Card
      title="Parent Company Variables"
      desc="Global identity propagated to every sub-dashboard."
      footer={<SaveBtn />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organization Name">
          <Input defaultValue="NULLSPACE LAB" />
        </Field>
        <Field label="Control Unit ID">
          <Input defaultValue="MCU-PRIME-01" />
        </Field>
        <Field label="Primary Region">
          <Input defaultValue="eu-west-3" />
        </Field>
        <Field label="Support Contact">
          <Input defaultValue="ops@nullspace.lab" />
        </Field>
      </div>
      <Field label="Operational Mandate">
        <textarea
          defaultValue="Maintain cross-tenant operational integrity and zero-trust security posture."
          rows={2}
          className="w-full rounded-sm border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:border-ring focus:outline-none"
        />
      </Field>
    </Card>
  )
}

function ApiSection() {
  const keys = [
    { id: "key_live_a91f", label: "Production", created: "2026-02-11", masked: "sk_live_••••a91f" },
    { id: "key_test_4c20", label: "Staging", created: "2026-04-02", masked: "sk_test_••••4c20" },
  ]
  const hooks = [
    { url: "https://hooks.halcyon.io/mcu", events: "staff.*, auth.*", status: "active" },
    { url: "https://obsidian.edge/ingest", events: "logs.critical", status: "active" },
    { url: "https://meridian.cloud/sync", events: "rbac.grant", status: "paused" },
  ]
  return (
    <>
      <Card
        title="API Key Rotation"
        desc="Manage and rotate parent-scope API credentials."
        footer={
          <button className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary">
            <Plus className="size-3.5" /> Generate Key
          </button>
        }
      >
        <div className="space-y-2">
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center gap-3 rounded-sm border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground">{k.label}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{k.masked}</p>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{k.created}</span>
              <button className="flex size-7 items-center justify-center rounded-sm border border-border text-muted-foreground hover:text-foreground" title="Copy">
                <Copy className="size-3.5" />
              </button>
              <button className="flex size-7 items-center justify-center rounded-sm border border-border text-warning hover:bg-warning/10" title="Rotate">
                <RotateCw className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Webhook Destinations" desc="System-wide outbound event delivery targets.">
        <div className="space-y-2">
          {hooks.map((h) => (
            <div
              key={h.url}
              className="flex items-center gap-3 rounded-sm border border-border bg-background px-3 py-2"
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  h.status === "active" ? "bg-success" : "bg-warning",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] text-foreground">{h.url}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{h.events}</p>
              </div>
              <button className="flex size-7 items-center justify-center rounded-sm border border-border text-destructive hover:bg-destructive/10">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <button className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-border py-2 text-[11px] text-muted-foreground hover:border-muted-foreground hover:text-foreground">
            <Plus className="size-3.5" /> Add destination
          </button>
        </div>
      </Card>
    </>
  )
}

function BindingsSection() {
  return (
    <Card
      title="Sub-project Bindings"
      desc="Link tenant environments to the parent control unit."
      footer={<SaveBtn />}
    >
      <div className="space-y-2">
        {tenants
          .filter((t) => t.id !== "all")
          .map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-sm border border-border bg-background px-3 py-2.5"
            >
              <span
                className="flex size-7 items-center justify-center rounded-sm border border-border text-[10px] font-bold"
                style={{ color: t.color }}
              >
                {t.code.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground">{t.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {t.code}.nullspace.lab • bound
                </p>
              </div>
              <span className="rounded-[3px] border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-[10px] text-success">
                SYNCED
              </span>
            </div>
          ))}
      </div>
    </Card>
  )
}

function BrandingSection() {
  const tokens = [
    { name: "--accent", value: "#5B8DEF", color: "oklch(0.68 0.16 250)" },
    { name: "--background", value: "#212121", color: "oklch(0.13 0 0)" },
    { name: "--foreground", value: "#F5F5F5", color: "oklch(0.96 0 0)" },
    { name: "--success", value: "#3FCF8E", color: "oklch(0.7 0.16 155)" },
  ]
  return (
    <Card
      title="Branding & Whitelabeling"
      desc="Inject custom design tokens into sub-dashboards."
      footer={<SaveBtn />}
    >
      <Field label="White-label Display Name">
        <Input defaultValue="NULLSPACE Command" />
      </Field>
      <div>
        <p className="mb-2 text-xs font-medium text-foreground">Global Design Tokens</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {tokens.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-2.5 rounded-sm border border-border bg-background px-3 py-2"
            >
              <span
                className="size-6 shrink-0 rounded-sm border border-border"
                style={{ backgroundColor: t.color }}
              />
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-foreground">{t.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{t.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
