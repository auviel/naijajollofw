import Image from "next/image";

type BlogArticleHeaderProps = {
  title: string;
  publishedAt: string;
};

export function BlogArticleHeader({
  title,
  publishedAt,
}: BlogArticleHeaderProps) {
  const date = new Date(publishedAt).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="mx-auto max-w-2xl text-center">
      <time dateTime={publishedAt} className="text-sm text-text-secondary">
        {date}
      </time>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.08]">
        {title}
      </h1>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Image
          src="/brand/naija-jollof-mark.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Naija Jollof</p>
          <p className="text-xs text-text-secondary">Waterloo</p>
        </div>
      </div>
    </header>
  );
}
