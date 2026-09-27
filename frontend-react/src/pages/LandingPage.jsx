

import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Footer from "./homepage/Footer";

const NAV_LINKS = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

function Logo() {
  return (
    <a href="#" className="flex items-center gap-1 shrink-0">
      <span className="text-[22px] font-bold tracking-tight text-neutral-900">
        farm<span className="text-emerald-600">book</span>
      </span>
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
                href="#signup"
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
          backgroundImage: "url('/images/hero-chickens-field.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Soft fade so the white nav/content stay readable over any photo */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-white/80 to-white/10" />

      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-28 pt-10 text-center md:pb-40 md:pt-16">
        <h1 className="text-[42px] font-bold leading-[1.08] tracking-tight text-neutral-950 sm:text-[56px] md:text-[68px]">
          <span className="block overflow-hidden">
            <span className="hero-line hero-line-1 block">Every Batch, Every</span>
          </span>
          <span className="block overflow-hidden">
            <span className="hero-line hero-line-2 block">Bird, Tracked</span>
          </span>
        </h1>

        <p className="hero-subhead mt-6 max-w-[520px] text-[16px] leading-relaxed text-neutral-600 md:text-[17px]">
          FarmBook helps Nigerian poultry farmers replace paper records with
          simple digital tracking — feed, mortality, eggs, vaccinations, and
          profit, all in one place.
        </p>

        <a
          href="/login"
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


export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Footer />
    </div>
  );
}

export default LandingPage;