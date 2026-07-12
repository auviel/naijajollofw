"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

export function CreateCategoryForm() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
    <Card>
      <CardHeader className="py-4">
        <h2 className="text-base font-semibold text-foreground">Add category</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Group items like Mains, Drinks, or Sides.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <FormField id="categoryName" label="Name" error={formError ?? undefined}>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Mains"
                disabled={isSubmitting}
              />
            </FormField>
          </div>
          <Button type="submit" disabled={isSubmitting} className="sm:mb-0.5">
            {isSubmitting ? "Adding…" : "Add category"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
