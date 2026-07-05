import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-black px-6 py-12">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-950/80 p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-400">
          ACCESS DENIED // Staff credentials required
        </p>
        <p className="mt-4 font-mono text-sm text-zinc-400">
          Your account is not on the NULLSPACE LAB staff allowlist.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-10 items-center justify-center border border-zinc-700 px-6 font-mono text-xs uppercase tracking-widest text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Return to nullspacelab.com
        </Link>
      </div>
    </div>
  )
}
