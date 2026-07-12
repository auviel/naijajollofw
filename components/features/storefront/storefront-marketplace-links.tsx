import { ExternalLink } from "@/components/ui/icons";

const MARKETPLACE_LINKS = [
  {
    name: "Uber Eats",
    href: "https://www.ubereats.com/ca/store/naija-jollof-waterloo/",
  },
  {
    name: "DoorDash",
    href: "https://www.doordash.com/store/naija-jollof-waterloo-waterloo-24719789/35249748/",
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
                className="group flex h-14 items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 text-[15px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface"
              >
                <span>Order on {link.name}</span>
                <ExternalLink
                  className="h-4 w-4 shrink-0 text-text-tertiary transition-colors group-hover:text-foreground"
                  aria-hidden
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
