"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  {
    label: "Rental Sale Calculator",
    href: "/",
    status: "Live",
  },
  {
    label: "Portfolio Optimizer",
    href: "/coming-soon",
    status: "Coming soon",
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-lupin-ink">
      <div className="absolute inset-0 bg-hero-pattern opacity-80" />

      <div className="relative flex min-h-screen">
        <aside
          className={`print-hide hidden flex-col border-r border-white/10 bg-black/40 py-8 transition-all duration-300 md:flex ${
            collapsed ? "w-24 px-4" : "w-72 px-6"
          }`}
        >
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <Image src="/assets/lupin-logo.png" alt="Lupin logo" width={36} height={36} />
            {collapsed ? null : (
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/40">Lupin</p>
                <p className="text-base font-semibold text-white">Real Estate Tools</p>
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
              {collapsed ? null : (
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Tools</p>
              )}
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:border-white/30"
                onClick={() => setCollapsed((value) => !value)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <span className="text-sm">{collapsed ? "»" : "«"}</span>
              </button>
            </div>
            <nav className="mt-4 flex flex-col gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`rounded-2xl border px-4 py-3 text-sm transition ${
                      active
                        ? "border-white/40 bg-white/10 text-white"
                        : "border-white/10 text-white/70 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{collapsed ? item.label[0] : item.label}</span>
                      {collapsed ? null : (
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                            item.status === "Live"
                              ? "bg-emerald-500/20 text-emerald-200"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {collapsed ? null : (
            <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
              <p className="text-white/80">Lupin Real Estate Tools</p>
              <p className="mt-2">A growing suite of decision-ready calculators.</p>
            </div>
          )}
        </aside>

        <div className="flex-1">
          <div className="print-hide flex items-center justify-between border-b border-white/10 px-6 py-5 md:px-10">
            <div className="flex items-center gap-3">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80 md:hidden"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <span className="text-xl">☰</span>
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Lupin</p>
                <p className="text-base font-semibold text-white">Real Estate Tools</p>
              </div>
            </div>
            <div className="hidden rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 md:block">
              Tools Suite
            </div>
          </div>

          <main className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-24 pt-12 md:px-10">
            {children}
          </main>
        </div>
      </div>

      {open ? (
        <div className="print-hide fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden">
          <div className="absolute left-0 top-0 h-full w-72 bg-lupin-ink p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image src="/assets/lupin-logo.png" alt="Lupin logo" width={32} height={32} />
                <span className="text-sm font-semibold text-white">Lupin Tools</span>
              </div>
              <button
                className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/60"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`rounded-2xl border px-4 py-3 text-sm transition ${
                      active
                        ? "border-white/40 bg-white/10 text-white"
                        : "border-white/10 text-white/70"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{item.label}</span>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                          item.status === "Live"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
