import { Mail, MapPin } from "lucide-react";
import {Logo} from "../LandingPage"

function FacebookIcon({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TwitterIcon({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const LINK_COLUMNS = [
  {
    title: "Links",
    links: [
      { label: "Features", href: "#features" },
      { label: "Batches & Mortality", href: "/batches" },
      { label: "Feed & Inventory", href: "/inventory" },
      { label: "Vaccination Schedule", href: "/dashboard" },
    ],
  },
  {
    title: "Links",
    links: [
      { label: "About TrackFarm", href: "#" },
      { label: "Support & Contact", href: "mailto:hello@trackfarm.cc" },
      { label: "Log in", href: "/login" },
      { label: "Get started free", href: "/signup" },
    ],
  },
  {
    title: "Links",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms & Conditions", href: "#" },
      { label: "Offline Resilience", href: "#" },
      { label: "Farm Security", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative bg-[#0d140f] text-white overflow-hidden">
      {/* Background artwork */}
      <div
        className="relative w-full bg-cover bg-bottom bg-no-repeat pt-44 sm:pt-60 md:pt-72 pb-16"
        style={{
          backgroundImage: "url('/images/Gemini_Generated_Image_12whj312whj312wh.jpg')",
        }}
      >
        {/* Soft top gradient to blend cleanly from page above */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-stone-50/80 via-white/20 to-transparent pointer-events-none" />

        {/* Shading gradient over lower forest to ensure high contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a110c] via-[#0a110c]/85 via-45% to-transparent pointer-events-none" />

        {/* Links & Contact Container */}
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 items-start">
            
            {/* 3 Columns of Links with Underline Headers matching reference image */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8">
              {LINK_COLUMNS.map((col, idx) => (
                <div key={idx}>
                  <div className="border-b border-white/30 pb-2 mb-3.5">
                    <h3 className="text-sm font-bold tracking-wide text-white">
                      {col.title}
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className="text-[13.5px] text-stone-300 hover:text-white transition-colors"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Right side: Circular Social Icons & Address / Contact */}
            <div className="md:col-span-5 flex flex-col md:items-end md:text-right">
              {/* Circular Social Icons matching reference image */}
              <div className="flex items-center gap-3 mb-6">
                <a
                  href="mailto:hello@trackfarm.cc"
                  aria-label="Email"
                  className="w-10 h-10 rounded-full border border-white/50 hover:border-white hover:bg-white/15 flex items-center justify-center text-white transition-all shadow-sm"
                >
                  <Mail size={16} />
                </a>
                <a
                  href="#"
                  aria-label="Facebook"
                  className="w-10 h-10 rounded-full border border-white/50 hover:border-white hover:bg-white/15 flex items-center justify-center text-white transition-all shadow-sm"
                >
                  <FacebookIcon size={15} />
                </a>
                <a
                  href="#"
                  aria-label="Instagram"
                  className="w-10 h-10 rounded-full border border-white/50 hover:border-white hover:bg-white/15 flex items-center justify-center text-white transition-all shadow-sm"
                >
                  <InstagramIcon size={15} />
                </a>
                <a
                  href="#"
                  aria-label="Twitter / X"
                  className="w-10 h-10 rounded-full border border-white/50 hover:border-white hover:bg-white/15 flex items-center justify-center text-white transition-all shadow-sm"
                >
                  <TwitterIcon size={15} />
                </a>
              </div>

              {/* Company Info & Contact Details */}
              <div className="space-y-1.5 text-stone-300">
                <div className="text-base font-bold text-white tracking-tight">
                  TrackFarm.cc
                </div>
                <div className="flex items-center gap-1.5 md:justify-end text-xs text-stone-300">
                  <MapPin size={13} className="text-emerald-400 shrink-0" />
                  <span>Ikorodu & Lagos, Nigeria ↗</span>
                </div>
                <div className="flex items-center gap-1.5 md:justify-end text-xs text-stone-300">
                  <Mail size={13} className="text-emerald-400 shrink-0" />
                  <a href="mailto:hello@trackfarm.cc" className="hover:text-white transition-colors">
                    hello@trackfarm.cc
                  </a>
                </div>
                <div className="text-xs text-stone-400 pt-1">
                  Built for Nigerian Poultry Farmers
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Very Bottom Bar: Contains the requested tagline and copyright */}
      <div className="border-t border-white/10 bg-[#080d09] px-6 py-5">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          
          {/* User's requested tagline: "TrackFarm helps farmers turn daily records into real profit" */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <p className="text-xs sm:text-sm font-medium text-emerald-300 tracking-tight">
              TrackFarm helps farmers turn daily records into real profit
            </p> 
            <span className="hidden sm:inline text-white/30 text-sm">|</span>
          </div>

          {/* Legal / Copyright (NO credit cards) */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[12px] text-stone-400">
            <a href="#" className="hover:text-white transition-colors">
              End User License Agreement
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms & Conditions
            </a>
            <span>© 2026 TrackFarm. All rights reserved.</span>
          </div>

        </div>
      </div>
    </footer>
  );
}
