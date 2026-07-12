"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

export function MenuCreateActions() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const dialogTitleId = useId();

  const [menuOpen, setMenuOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!categoryOpen) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        setCategoryOpen(false);
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [categoryOpen, isSubmitting]);

  function openCategoryDialog() {
    setMenuOpen(false);
    setName("");
    setFormError(null);
    setCategoryOpen(true);
  }

  async function handleCreateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Category name is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/menu/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const message = await readApiError(response);
        setFormError(message);
        toastError(message);
        return;
      }

      setCategoryOpen(false);
      setName("");
      success("Category added.");
      router.refresh();
    } catch {
      const message = "Unable to create category.";
      setFormError(message);
      toastError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div ref={rootRef} className="relative w-full sm:w-auto">
        <Button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          className="w-full gap-2 sm:w-auto"
          onClick={() => setMenuOpen((open) => !open)}
        >
          New
          <ArrowDown
            className={cn(
              "h-4 w-4 transition-transform duration-fast",
              menuOpen && "rotate-180",
            )}
            aria-hidden
          />
        </Button>

        {menuOpen ? (
          <ul
            id={menuId}
            role="menu"
            className="absolute top-full right-0 z-30 mt-2 w-full min-w-[12rem] overflow-hidden rounded-md border border-border bg-surface-elevated shadow-lg sm:w-48"
          >
            <li role="none">
              <Link
                role="menuitem"
                href="/dashboard/menu/new"
                className="block px-4 py-3 text-sm font-medium text-foreground no-underline transition-colors hover:bg-surface"
                onClick={() => setMenuOpen(false)}
              >
                New item
              </Link>
            </li>
            <li role="none" className="border-t border-border">
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface"
                onClick={openCategoryDialog}
              >
                New category
              </button>
            </li>
          </ul>
        ) : null}
      </div>

      {categoryOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setCategoryOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="w-full max-w-md rounded-lg border border-border bg-surface-elevated p-5 shadow-lg sm:p-6"
          >
            <h2
              id={dialogTitleId}
              className="text-base font-semibold text-foreground"
            >
              New category
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Group items like Mains, Drinks, or Sides.
            </p>
            <form onSubmit={handleCreateCategory} className="mt-5 space-y-4">
              <FormField
                id="categoryName"
                label="Name"
                error={formError ?? undefined}
              >
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Mains"
                  autoFocus
                  disabled={isSubmitting}
                />
              </FormField>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting}
                  onClick={() => setCategoryOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding…" : "Add category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
