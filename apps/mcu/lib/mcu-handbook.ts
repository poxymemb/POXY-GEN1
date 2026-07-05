export type HandbookSection = {
  id: string
  title: string
  content: string
}

export const HANDBOOK_SECTIONS: HandbookSection[] = [
  {
    id: "intro",
    title: "1. Introduction & Values",
    content: `
<h2>POXY MCU Staff Handbook</h2>
<p><strong>POXY WORLD</strong> is a crypto-verified gacha collectibles ecosystem. The <strong>MCU</strong> (Mission Control Unit) is the internal operations platform for staff — not a public-facing product.</p>
<h3>Core values</h3>
<ol>
<li><strong>Integrity</strong> — ledger events are append-only; never alter hashes, RNG outcomes, or audit trails.</li>
<li><strong>Player-first fairness</strong> — treat every ticket as if the player is watching the thread.</li>
<li><strong>Confidentiality</strong> — player data stays inside MCU; no screenshots in public channels.</li>
<li><strong>Calm precision</strong> — short, factual replies beat emotional debates.</li>
<li><strong>Escalate early</strong> — when in doubt, loop in mod or superadmin before acting.</li>
</ol>
<div class="hb-good"><strong>What MCU is:</strong> Support queue, dossier, economy oversight, alerts, RNG audit, internal messenger, and command tools — one staff session, role-gated sidebar.</div>
`,
  },
  {
    id: "roles",
    title: "2. Roles & Access",
    content: `
<h2>Roles &amp; permissions</h2>
<table class="hb-table"><thead><tr><th>Role</th><th>Departments</th><th>Typical duties</th></tr></thead><tbody>
<tr><td><strong>Superadmin</strong></td><td>All</td><td>Roles, CMS, compensations, escalations, asset approvals, policy updates</td></tr>
<tr><td><strong>Mod</strong></td><td>Support + Tech + Shared</td><td>Tickets, disputes, alerts, RNG audit, higher compensation limits</td></tr>
<tr><td><strong>Support</strong></td><td>Support + Shared</td><td>Ticket queue, dossier, handbook, disputes (read), player comms</td></tr>
<tr><td><strong>Marketing</strong></td><td>Marketing + Shared</td><td>Campaigns, calendar, analytics, creative assets</td></tr>
<tr><td><strong>Dev</strong></td><td>Tech + Shared</td><td>Telemetry, economy, sys health, audit log</td></tr>
</tbody></table>
<h3>Permission matrix (summary)</h3>
<table class="hb-table"><thead><tr><th>Action</th><th>Support</th><th>Mod</th><th>Superadmin</th></tr></thead><tbody>
<tr><td>Reply to tickets</td><td>✓</td><td>✓</td><td>✓</td></tr>
<tr><td>Issue PC compensation</td><td>Limited</td><td>Medium</td><td>Full</td></tr>
<tr><td>Ban / freeze account</td><td>—</td><td>Escalate</td><td>✓</td></tr>
<tr><td>Approve marketing assets</td><td>—</td><td>—</td><td>✓</td></tr>
<tr><td>Publish MCU updates</td><td>—</td><td>✓</td><td>✓</td></tr>
<tr><td>View audit log</td><td>—</td><td>✓</td><td>✓</td></tr>
</tbody></table>
<div class="hb-danger"><strong>Never share credentials or player PII</strong> with other staff via personal messengers. Use MCU messenger or ticket internal notes only. Transferring dossier exports outside POXY is grounds for immediate access revocation.</div>
`,
  },
  {
    id: "tickets",
    title: "3. Working with Tickets",
    content: `
<h2>Support tickets workflow</h2>
<h3>SLA — first staff response to player message</h3>
<table class="hb-table"><thead><tr><th>Level</th><th>Wait time</th><th>Indicator</th><th>Action</th></tr></thead><tbody>
<tr><td>OK</td><td>&lt; 1 hour</td><td>Green</td><td>Normal queue</td></tr>
<tr><td>Warning</td><td>1 – 4 hours</td><td>Yellow</td><td>Prioritize reply</td></tr>
<tr><td>Breach</td><td>&gt; 4 hours</td><td>Red (pulse)</td><td>Reply immediately or escalate</td></tr>
</tbody></table>
<h3>8-step process</h3>
<ol>
<li>Open queue → filter Open / In progress</li>
<li>Assign ticket to yourself (auto → In progress)</li>
<li>Read full thread + check Player Snapshot / Dossier</li>
<li>Verify claim against ledger, RNG, or inventory</li>
<li>Reply with clear outcome — use quick replies when appropriate</li>
<li>Document compensation or escalation in ticket + audit trail</li>
<li>Resolve or escalate — never leave ambiguous open threads</li>
<li>Close ticket → CSAT may follow; stats update on close</li>
</ol>
<div class="hb-good"><strong>Good tone:</strong> "Hi @player — I checked your drop log. Round #abc completed at 14:02 UTC with an EPIC reveal. Everything matches the commit-reveal record. Let me know if you still see a UI issue."</div>
<div class="hb-bad"><strong>Bad tone:</strong> "lol that's not a bug", "you should have read the FAQ", blaming the player for latency.</div>
<h3>When to escalate</h3>
<ul>
<li>Suspected RNG manipulation, economy exploit, or duplicate mint</li>
<li>Compensation above your role limit</li>
<li>Abuse, threats, or chargeback risk</li>
<li>Any request involving account takeover or credential reset edge cases</li>
</ul>
`,
  },
  {
    id: "compensation",
    title: "4. Compensation Policy",
    content: `
<h2>Compensation policy</h2>
<h3>When to compensate</h3>
<ul>
<li>Verified server-side bug (failed open, lost PC, wrong tier after proven RNG reveal)</li>
<li>Documented downtime affecting a paid action during the incident window</li>
<li>Superadmin-approved goodwill gesture for VIP / launch partners</li>
</ul>
<h3>When NOT to compensate</h3>
<ul>
<li>Bad gacha luck — RNG outcomes are provably fair and final</li>
<li>User error (wrong wallet, sold asset, ignored cooldown)</li>
<li>Marketplace OTC disputes without ledger proof</li>
<li>Repeated claims from same account without new evidence</li>
</ul>
<h3>Limits by role (PC)</h3>
<table class="hb-table"><thead><tr><th>Role</th><th>Per incident</th><th>Per player / month</th></tr></thead><tbody>
<tr><td>Support</td><td>50 PC</td><td>100 PC</td></tr>
<tr><td>Mod</td><td>200 PC</td><td>500 PC</td></tr>
<tr><td>Superadmin</td><td>No hard cap</td><td>Document in audit log</td></tr>
</tbody></table>
<h3>Documentation</h3>
<p>Every compensation must include: ticket ID, player ID, amount, reason code, and link to evidence (ledger event, RNG round, or dispute ID). Use <strong>Disputes → Execute compensation</strong> or ticket notes — never manual balance edits without audit entry.</p>
`,
  },
  {
    id: "violators",
    title: "5. Working with Violators",
    content: `
<h2>Violators &amp; enforcement</h2>
<table class="hb-table"><thead><tr><th>Violation</th><th>First offense</th><th>Repeat</th></tr></thead><tbody>
<tr><td>Spam / harassment in tickets</td><td>Warning + close</td><td>24h messaging mute</td></tr>
<tr><td>OTC scam / phishing</td><td>Freeze OTC 24h</td><td>Permanent OTC ban</td></tr>
<tr><td>Multi-account abuse</td><td>Flag + review</td><td>Ban secondary accounts</td></tr>
<tr><td>Exploit / economy manipulation</td><td>Freeze + escalate</td><td>Account ban + clawback</td></tr>
<tr><td>Chargeback fraud</td><td>Immediate freeze</td><td>Permanent ban</td></tr>
</tbody></table>
<h3>Ban procedure</h3>
<ol>
<li>Confirm evidence in dossier + audit log</li>
<li>Superadmin or mod executes via Account Ops</li>
<li>Post internal note with ticket / dispute reference</li>
<li>Do not discuss ban reason in public channels</li>
</ol>
<h3>Freeze procedure</h3>
<p>OTC air-gap: new login triggers 24h OTC freeze by design — do not bypass. Economy freezes require tech/mod approval and timestamped reason in audit log.</p>
`,
  },
  {
    id: "forbidden",
    title: "6. Forbidden Actions",
    content: `
<div class="hb-danger"><strong>Strictly forbidden for all staff</strong>
<ul style="margin:8px 0 0 18px">
<li>Sharing player emails, balances, or inventory outside MCU</li>
<li>Editing or deleting <code>ledger_events</code> or RNG commits</li>
<li>Personal compensation from staff accounts</li>
<li>Promising outcomes we cannot verify on-chain / in ledger</li>
<li>Using admin tools on friends or alt accounts without disclosure</li>
<li>Exporting audit logs or dossiers to personal devices</li>
</ul></div>
<table class="hb-table"><thead><tr><th>Action</th><th>Consequence</th></tr></thead><tbody>
<tr><td>PII leak</td><td>Immediate access revoke + review</td></tr>
<tr><td>Ledger tampering attempt</td><td>Termination + legal review</td></tr>
<tr><td>Unauthorized compensation</td><td>Clawback + disciplinary</td></tr>
<tr><td>Social engineering players</td><td>Permanent ban from staff</td></tr>
</tbody></table>
`,
  },
  {
    id: "confidential",
    title: "7. Confidentiality",
    content: `
<h2>Data confidentiality</h2>
<h3>Never do</h3>
<ul>
<li>Screenshot dossier, ticket threads, or economy reports to Discord/Telegram</li>
<li>Store player data in personal notes apps</li>
<li>Use production data in public test streams</li>
<li>Share admin_emails list or Supabase keys</li>
</ul>
<h3>On departure</h3>
<ol>
<li>Access revoked same day — admin removes email from <code>admin_emails</code></li>
<li>Return any hardware 2FA devices</li>
<li>Delete local MCU exports and cached CSVs</li>
<li>Confirm no pending tickets assigned to your account</li>
</ol>
<div class="hb-good">Use MCU <strong>Notes</strong> for personal work notes — RLS keeps them private to your staff ID.</div>
`,
  },
  {
    id: "emergency",
    title: "8. Emergency Protocols",
    content: `
<h2>Emergency protocols</h2>
<h3>1 — Mass bug (opens fail, wrong tier wave)</h3>
<ol>
<li>Pause CMS maintenance banner + post urgent MCU update</li>
<li>Notify superadmin + dev in <strong>#urgent</strong> messenger</li>
<li>Do not mass-compensate until root cause is logged</li>
<li>Track affected round IDs in shared doc / task</li>
</ol>
<h3>2 — Suspected account / infra breach</h3>
<ol>
<li>Rotate staff sessions — sign out all terminals</li>
<li>Superadmin reviews audit log + admin actions stream</li>
<li>Freeze suspicious accounts via Account Ops</li>
<li>Preserve logs — no destructive SQL</li>
</ol>
<h3>3 — Data leak</h3>
<ol>
<li>Contain — revoke leaked tokens/keys immediately</li>
<li>Document scope: what data, which players, when</li>
<li>Superadmin coordinates player notification if required</li>
<li>Post-mortem in Updates Center (policy type)</li>
</ol>
`,
  },
  {
    id: "modules",
    title: "9. MCU Modules Guide",
    content: `
<h2>MCU / POXY OS modules</h2>
<table class="hb-table"><thead><tr><th>Module</th><th>Route</th><th>Dept</th><th>Purpose</th></tr></thead><tbody>
<tr><td>Updates</td><td>/mcu/updates</td><td>Shared</td><td>Policies &amp; announcements</td></tr>
<tr><td>Tasks</td><td>/mcu/tasks</td><td>Shared</td><td>Kanban all depts</td></tr>
<tr><td>Messenger</td><td>/mcu/messenger</td><td>Shared</td><td>Internal channels &amp; DM</td></tr>
<tr><td>Notes</td><td>/mcu/notes</td><td>Shared</td><td>Private staff notes</td></tr>
<tr><td>Support Tickets</td><td>/mcu/tickets</td><td>Support</td><td>Player ticket queue</td></tr>
<tr><td>Player Dossier</td><td>/mcu/dossier</td><td>Support</td><td>Full player profile</td></tr>
<tr><td>Disputes</td><td>/mcu/disputes</td><td>Support</td><td>Incidents &amp; compensation</td></tr>
<tr><td>RNG Audit</td><td>/mcu/rng</td><td>Support</td><td>Provably fair verification</td></tr>
<tr><td>Economy</td><td>/mcu/economy</td><td>Tech</td><td>Supply &amp; mint/burn</td></tr>
<tr><td>System Health</td><td>/mcu/system</td><td>Tech</td><td>Infra monitoring</td></tr>
<tr><td>Marketing</td><td>/mcu/marketing/*</td><td>Marketing</td><td>Campaigns, calendar, assets</td></tr>
<tr><td>Changelog</td><td>/mcu/changelog</td><td>Shared</td><td>Release notes</td></tr>
<tr><td>Handbook</td><td>/mcu/handbook</td><td>Shared</td><td>This guide</td></tr>
<tr><td>Staff</td><td>/mcu/staff</td><td>Command</td><td>Team profiles &amp; leaderboard</td></tr>
</tbody></table>
<h3>Keyboard shortcuts</h3>
<table class="hb-table"><thead><tr><th>Shortcut</th><th>Action</th></tr></thead><tbody>
<tr><td><kbd>Ctrl+K</kbd></td><td>Universal search (profiles, assets, rounds)</td></tr>
<tr><td><kbd>Escape</kbd></td><td>Close top modal / search overlay</td></tr>
<tr><td><kbd>?</kbd></td><td>Open handbook (legacy POXY OS)</td></tr>
</tbody></table>
`,
  },
]

export const CHANGELOG_CATEGORIES = ["ALL", "FEATURE", "BUGFIX", "ECONOMY", "URGENT"] as const

export function changelogCategoryMeta(category: string) {
  const map: Record<string, { label: string; className: string }> = {
    feature: { label: "FEATURE", className: "border-blue-500/40 bg-blue-500/10 text-blue-400" },
    bugfix: { label: "BUGFIX", className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" },
    economy: { label: "ECONOMY", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
    urgent: { label: "URGENT", className: "border-red-500/40 bg-red-500/10 text-red-400" },
  }
  return map[category.toLowerCase()] ?? map.feature
}

export function canEditChangelog(role: string) {
  const r = role.toLowerCase()
  return r === "superadmin" || r === "admin" || r === "mod"
}
