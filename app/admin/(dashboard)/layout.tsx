import { CyberConclaveFonts } from "@/components/shared/CyberConclaveFonts"
import { AdminSidebarNav } from "@/features/admin-auth/AdminSidebarNav"
import { SignOutButton } from "@/features/admin-auth/SignOutButton"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cc-scope cc-admin-base flex min-h-screen bg-[var(--cc-surface)] text-[var(--cc-on-surface)]">
      <CyberConclaveFonts />
      <aside className="cc-glass-panel m-3 flex w-56 shrink-0 flex-col gap-1 rounded-2xl p-3">
        <div className="px-2 py-3">
          <p className="cc-headline text-lg font-bold text-[var(--cc-primary)]">Vibe Corner</p>
          <p className="cc-label-tech text-[10px] tracking-widest text-[var(--cc-on-surface-variant)] uppercase">
            Admin
          </p>
        </div>
        <AdminSidebarNav />
        <SignOutButton />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
