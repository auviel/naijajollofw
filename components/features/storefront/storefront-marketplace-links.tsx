import { ExternalLink } from "@/components/ui/icons";

const MARKETPLACE_LINKS = [
  {
    name: "Uber Eats",
    href: "https://www.ubereats.com/ca/store/naija-jollof-waterloo/",
    eyebrow: "Order with",
    brand: "Uber Eats",
    className:
      "border-transparent bg-[#06C167] text-black hover:brightness-[0.97]",
    eyebrowClassName: "text-black/70",
  },
  {
    name: "DoorDash",
    href: "https://www.doordash.com/store/naija-jollof-waterloo-waterloo-24719789/35249748/",
    eyebrow: "Order online with",
    brand: "DoorDash",
    className:
      "border-transparent bg-[#FF3008] text-white hover:brightness-[0.97]",
    eyebrowClassName: "text-white/85",
  },
] as const;

export function StorefrontMarketplaceLinks() {
  return (
    <section
      id="also-order"
      aria-labelledby="also-order-heading"
      className="mt-12 scroll-mt-24 border-t border-border pt-16 sm:mt-16 sm:pt-20"
    >
      <div className="w-full text-left">
        <h2
          id="also-order-heading"
          className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Also on Uber Eats &amp; DoorDash
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary sm:text-[15px]">
          Already a regular on those apps? Open our store there to reorder with
          your saved favourites.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {MARKETPLACE_LINKS.map((link) => (
            <li key={link.name}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${link.eyebrow} ${link.brand}`}
                className={`group flex flex-col items-center justify-center gap-0.5 rounded-xl border px-4 py-2.5 text-center transition-[filter] ${link.className}`}
              >
                <span
                  className={`text-[10px] font-semibold tracking-[0.08em] uppercase ${link.eyebrowClassName}`}
                >
                  {link.eyebrow}
                </span>
                <span className="flex items-center gap-1.5 text-base font-bold tracking-tight">
                  {link.brand}
                  <ExternalLink
                    className="h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
