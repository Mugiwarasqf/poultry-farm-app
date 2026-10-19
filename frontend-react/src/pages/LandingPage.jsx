

import { useState } from "react";
import { Activity, ArrowRight, ArrowUpRight, Menu, ShieldCheck, TrendingUp, X } from "lucide-react";
import Footer from "./homepage/Footer";

const NAV_LINKS = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

// function Logo() {
//   return (
//     <a href="#" className="flex items-center shrink-0">
//       <img
//         src="/images/track-farm-logo-no-est-transparent.png"
//         alt="Track Farm"
//         width={809}
//         height={440}
//         className="h-18 w-auto"
//       />
//     </a>
//   );
// }
export function Logo() {
  return (
    <a href="#" className="flex items-center shrink-0">
      <img
        src="/images/track-farm-logo-horizontal.png"
        
        alt="Track Farm"
        width={470}
        height={96}
        className="h-10 w-auto"
      />
    </a>
  );
}
function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-20 w-full">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />

        <nav className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[15px] font-medium text-neutral-700 transition-colors hover:text-neutral-950"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/login"
            className="text-[15px] font-medium text-neutral-700 hover:text-neutral-950"
          >
            Log in
          </a>
          <a
            href="/signup"
            className="rounded-full bg-black px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#094229]"
          >
            Get started
          </a>
        </div>

        <button
          className="flex items-center justify-center rounded-full p-2 text-neutral-900 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-neutral-200 bg-white px-6 py-5 md:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[15px] font-medium text-neutral-700"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-neutral-200 pt-4">
              <a href="/login" className="text-[15px] font-medium text-neutral-700">
                Log in
              </a>
              <a
                href="/signup"
                className="rounded-full bg-black px-5 py-2.5 text-center text-[14px] font-semibold text-white"
              >
                Get started
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        className="absolute inset-0 -z-10 bg-neutral-100"
        style={{
          backgroundImage: "url('/images/Gemini_Generated_Image_6mz3jr6mz3jr6mz3.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Soft fade so the white nav/content stay readable over any photo */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-white/10 to-white/10" />

      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-48 pt-10 text-center md:pb-40 md:pt-16">
        <h1 className="text-[42px] font-bold leading-[1.08] tracking-tight text-neutral-950 sm:text-[56px] md:text-[68px]">
          <span className="block overflow-hidden">
            <span className="hero-line hero-line-1 block">Every Batch, Every</span>
          </span>
          <span className="block overflow-hidden">
            <span className="hero-line hero-line-2 block">Bird, Tracked</span>
          </span>
        </h1>

        <p className="hero-subhead mt-6 max-w-[520px] text-[16px] leading-relaxed text-gray-600 md:text-[17px]">
          TrackFarm helps Nigerian poultry farmers replace paper records with
          simple digital tracking — feed, mortality, eggs, vaccinations, and
          profit, all in one place.
        </p>

        <a
          href="/signup"
          className="hero-cta mt-9 inline-flex items-center gap-2 rounded-full bg-black py-3.5 pl-6 pr-3 text-[15px] font-semibold text-white transition-colors hover:bg-coal-500"
        >
          Get started free
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-950">
            <ArrowUpRight size={16} strokeWidth={2.5} />
          </span>
        </a>
      </div>
    </section>
  );
}


function DashboardFeatureSection() {
  return (
    <section id="features" className="py-20 md:py-32 bg-stone-50/70 border-t border-stone-200/80">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Text & Features */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFFFC4] text-[#3D5200] border border-[#D5F08C] text-xs font-semibold w-fit mb-5">
              <span className="w-2 h-2 rounded-full bg-[#84A818] animate-pulse" />
              Live Farm Dashboard
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-neutral-950 font-heading leading-[1.15]">
              Everything on your farm, at a single glance.
            </h2>

            <p className="mt-5 text-base sm:text-lg text-neutral-600 leading-relaxed">
              No more messy paper logs or guessing your flock's health. TrackFarm brings your batches, daily logs, and farm metrics into one fast, intuitive dashboard.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-stone-200/70 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Activity size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Batch & Mortality Tracking</h3>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                    Track flock size, bird age, and daily losses by batch so you catch health issues early.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-stone-200/70 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <TrendingUp size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Daily Feed & Egg Production</h3>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                    Log daily bags used and crates collected. Watch your feed conversion and laying rates compute automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white border border-stone-200/70 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Vaccine & Medication Schedules</h3>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                    Pre-loaded vaccination calendars with due-date reminders so you never miss a vital dose.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-9 flex items-center gap-4">
              <a
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 shadow-sm"
              >
                <span>Try the dashboard free</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>

          {/* Right Column: Replica Dashboard Image */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl bg-gradient-to-tr from-[#17191A] to-[#252A2E] p-2.5 sm:p-3.5 shadow-2xl ring-1 ring-black/10">
              {/* Window Chrome Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="px-3 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-stone-300 font-mono">
                  trackfarm.cc/dashboard
                </div>
                <div className="w-8" />
              </div>

              {/* Replica Image (easily swappable) */}
              <div className="relative overflow-hidden rounded-xl bg-[#0F1112]">
                <img
                  src="/images/dashboard-preview.jpg"
                  alt="TrackFarm Poultry Management Dashboard preview"
                  className="w-full h-auto object-cover rounded-xl transition-transform duration-300 hover:scale-[1.01]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <DashboardFeatureSection />
      <Footer />
    </div>
  );
}

export default LandingPage;