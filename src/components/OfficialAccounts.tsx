import { ornamentLine } from "@/lib/utils";

const ACCOUNTS = [
  {
    name: "Discord",
    href: "https://discord.gg/0lrp",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8">
        <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3c-.21.375-.444.882-.608 1.28a18.27 18.27 0 0 0-5.487 0C12.3 3.882 12.066 3.375 11.855 3a19.74 19.74 0 0 0-3.76 1.37C3.47 9.03 2.72 13.58 2.36 18.06a19.9 19.9 0 0 0 6.06 3.06c.49-.67.927-1.383 1.302-2.127a12.9 12.9 0 0 1-2.05-.985c.172-.126.34-.259.502-.394a14.2 14.2 0 0 0 12.06 0c.164.138.332.271.502.394-.654.388-1.343.717-2.052.986.375.743.81 1.455 1.302 2.126a19.85 19.85 0 0 0 6.06-3.06c-.44-5.18-1.504-9.69-3.66-13.69ZM9.34 15.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm5.32 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z" />
      </svg>
    ),
  },
  {
    name: "X",
    href: "https://x.com/0utlawrp?s=11",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-6 w-6 sm:h-7 sm:w-7">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://youtube.com/@olclip?si=jpYL_i85eG_Ae9dh",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
      </svg>
    ),
  },
];

export function OfficialAccounts() {
  return (
    <section
      dir="rtl"
      className="relative z-10 w-full max-w-2xl px-2 pb-2 pt-10"
    >
      <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-card via-[color-mix(in_oklab,var(--primary)_5%,var(--card))] to-[oklch(0.16_0.022_215)] px-6 py-8 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)] sm:px-10 sm:py-10">
        {/* soft celestial glow */}
        <span className="pointer-events-none absolute -top-24 right-1/2 h-48 w-72 translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-primary-glow/10 blur-3xl" />

        <div className="relative flex flex-col items-center text-center sm:items-end sm:text-end">
          {/* ornament line */}
          <div className="ornament-line w-16" />

          <h2 className="mt-4 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            حسابات سيرفر <span className="text-primary drop-shadow-[0_0_14px_var(--primary)]">أوت لاو</span> الرسمية
          </h2>

          <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
            تابع حسابات اوت لاو الرسمية وكن على اطلاع بآخر الأخبار والإعلانات والمستجدات.
          </p>

          {/* cards */}
          <div className="mt-7 flex w-full items-center justify-center gap-3 sm:mt-8 sm:justify-end sm:gap-4">
            {ACCOUNTS.map((acc) => (
              <a
                key={acc.name}
                href={acc.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={acc.name}
                className="group relative grid h-16 w-16 place-items-center rounded-2xl border border-primary/20 bg-[oklch(0.21_0.03_213)] text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:text-primary hover:shadow-[0_0_24px_-4px_var(--primary)] sm:h-20 sm:w-20"
              >
                {/* celestial glow on hover */}
                <span className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/0 transition-colors duration-300 group-hover:bg-primary/5" />
                <span className="pointer-events-none absolute -inset-1 rounded-2xl bg-primary/0 blur-xl transition-colors duration-300 group-hover:bg-primary/15" />
                <span className="relative">{acc.icon}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
