"use client";

import { ShareActions } from "@/components/features/share-actions";

type BlogShareProps = {
  title: string;
};

export function BlogShare({ title }: BlogShareProps) {
  return (
    <ShareActions
      title={title}
      label="Share this article"
      align="center"
      className="mx-auto mt-12 max-w-2xl"
    />
  );
}
