import { PortableText, type PortableTextComponents } from "@portabletext/react";
import Image from "next/image";
import { sanityImageUrl } from "@/lib/sanity/image";

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight text-foreground">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 font-display text-xl font-semibold tracking-tight text-foreground">
        {children}
      </h3>
    ),
    normal: ({ children }) => (
      <p className="mt-4 text-[15px] leading-relaxed text-foreground">{children}</p>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-foreground">
        {children}
      </ol>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em>{children}</em>,
    link: ({ children, value }) => {
      const href = (value as { href?: string } | undefined)?.href ?? "#";
      const external = href.startsWith("http");
      return (
        <a
          href={href}
          className="text-link underline underline-offset-2"
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {children}
        </a>
      );
    },
  },
  types: {
    image: ({ value }) => {
      const src = sanityImageUrl(value, 1200);
      if (!src) return null;
      const alt = (value as { alt?: string })?.alt || "";
      return (
        <figure className="relative my-8 aspect-[16/10] overflow-hidden rounded-2xl bg-surface">
          <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" />
        </figure>
      );
    },
  },
};

type BlogPortableTextProps = {
  value: unknown[];
};

export function BlogPortableText({ value }: BlogPortableTextProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <PortableText value={value} components={components} />
    </div>
  );
}
