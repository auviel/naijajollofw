import Link from "next/link";

type BlogPaginationProps = {
  page: number;
  totalPages: number;
};

export function BlogPagination({ page, totalPages }: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav
      aria-label="Blog pagination"
      className="mt-12 flex items-center justify-center gap-4 text-sm text-text-secondary"
    >
      {prev ? (
        <Link
          href={prev === 1 ? "/blog" : `/blog?page=${prev}`}
          className="font-medium text-foreground no-underline hover:opacity-80"
        >
          Prev
        </Link>
      ) : (
        <span className="opacity-40">Prev</span>
      )}
      <span>
        Page {page} of {totalPages}
      </span>
      {next ? (
        <Link
          href={`/blog?page=${next}`}
          className="font-medium text-foreground no-underline hover:opacity-80"
        >
          Next
        </Link>
      ) : (
        <span className="opacity-40">Next</span>
      )}
    </nav>
  );
}
