import Image from "next/image";
import Wizard from "@/components/Wizard";

export default function Home() {
  return (
    <div className="min-h-screen bg-lupin-ink">
      <div className="absolute inset-0 bg-hero-pattern opacity-80" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-24 pt-16 md:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/assets/lupin-logo.png" alt="Lupin logo" width={40} height={40} />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">Lupin</p>
              <p className="text-base font-semibold text-white">Rental Sale Calculator</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 md:block">
            PWA Ready
          </div>
        </header>

        <main>
          <Wizard />
        </main>
      </div>
    </div>
  );
}
