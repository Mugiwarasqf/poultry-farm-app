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

function LinkedinIcon({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
    </svg>
  );
}

function YoutubeIcon({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

/**
 * Shared logo mark — a simple rounded tag/checkmark shape standing in for
 * "a record, logged" rather than a literal bird/egg icon (avoids the
 * generic farm-icon look most competitors use). Works on light or dark
 * backgrounds via the `variant` prop.
 */
export function Logo({ variant = "dark", className = "" }) {
  const textColor = variant === "dark" ? "text-neutral-900" : "text-white";
  const accent = "text-emerald-500";

  return (
    <a href="#" className={`flex items-center gap-2 shrink-0 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <rect
          x="1"
          y="1"
          width="24"
          height="24"
          rx="7"
          className={variant === "dark" ? "fill-neutral-900" : "fill-white"}
        />
        <path
          d="M7.5 13.2L11 16.7L18.5 9.2"
          stroke={variant === "dark" ? "white" : "#0a0a0a"}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`text-[20px] font-bold tracking-tight ${textColor}`}>
        farm<span className={accent}>book</span>
      </span>
    </a>
  );
}

const COMPANY_LINKS = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About us", href: "#about" },
];

const SOCIALS = [
  { icon: FacebookIcon, href: "#", label: "Facebook" },
  { icon: InstagramIcon, href: "#", label: "Instagram" },
  { icon: TwitterIcon, href: "#", label: "X" },
  { icon: LinkedinIcon, href: "#", label: "LinkedIn" },
  { icon: YoutubeIcon, href: "#", label: "YouTube" },
];

export default function Footer() {
  return (
    <footer className="bg-neutral-950 pt-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col justify-between gap-12 pb-14 md:flex-row md:gap-8">
          <h2 className="max-w-[480px] text-[34px] font-bold leading-[1.15] tracking-tight text-white sm:text-[42px]">
            TrackFarm helps farmers
            <br />
            turn daily records
            <br />
            into real profit
          </h2>

          <div className="flex gap-16">
            <div>
              <h3 className="text-[14px] font-semibold text-white">Contact</h3>
              <p className="mt-4 max-w-[220px] text-[14px] leading-relaxed text-neutral-400">
                Questions or feedback? Reach us anytime.
              </p>
              <a
                href="mailto:hello@trackfarm.cc"
                className="mt-1 inline-block text-[14px] text-neutral-300 underline-offset-4 hover:text-white hover:underline"
              >
                hello@trackfarm.cc
              </a>

              <div className="mt-5 flex items-center gap-3">
                {SOCIALS.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  >
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[14px] font-semibold text-white">Company</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {COMPANY_LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[14px] text-neutral-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 py-8">
          <Logo variant="light" />
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-6">
        <p className="mx-auto max-w-6xl text-[13px] text-neutral-500">
          © 2026 TrackFarm. All rights reserved.
        </p>
      </div>
    </footer>
  );
}