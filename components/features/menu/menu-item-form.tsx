"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  formatCentsAsDollarsInput,
  parseDollarsToCents,
} from "@/lib/domain/menu/format";
import type { MenuItemDetail } from "@/lib/domain/menu/types";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Something went wrong. Please try again.";
}

type CategoryOption = {
  id: string;
  name: string;
  active: boolean;
};

type ModifierDraft = {
  key: string;
  name: string;
  priceDollars: string;
  available: boolean;
};

type ModifierGroupDraft = {
  key: string;
  name: string;
  required: boolean;
  minSelect: string;
  maxSelect: string;
  modifiers: ModifierDraft[];
};

type MenuItemFormProps = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  item?: MenuItemDetail;
};

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function groupsFromItem(item?: MenuItemDetail): ModifierGroupDraft[] {
  if (!item) {
    return [];
  }

  return item.modifierGroups.map((group) => ({
    key: group.id,
    name: group.name,
    required: group.required,
    minSelect: String(group.minSelect),
    maxSelect: String(group.maxSelect),
    modifiers: group.modifiers.map((modifier) => ({
      key: modifier.id,
      name: modifier.name,
      priceDollars: formatCentsAsDollarsInput(modifier.priceDeltaCents),
      available: modifier.available,
    })),
  }));
}

export function MenuItemForm({ mode, categories, item }: MenuItemFormProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [categoryId, setCategoryId] = useState(item?.categoryId ?? categories[0]?.id ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [priceDollars, setPriceDollars] = useState(
    item ? formatCentsAsDollarsInput(item.priceCents) : "",
  );
  const [available, setAvailable] = useState(item?.available ?? true);
  const [groups, setGroups] = useState<ModifierGroupDraft[]>(() => groupsFromItem(item));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCategories = categories.filter((category) => category.active || category.id === categoryId);

  function updateGroup(key: string, patch: Partial<ModifierGroupDraft>) {
    setGroups((current) =>
      current.map((group) => (group.key === key ? { ...group, ...patch } : group)),
    );
  }

  function updateModifier(
    groupKey: string,
    modifierKey: string,
    patch: Partial<ModifierDraft>,
  ) {
    setGroups((current) =>
      current.map((group) => {
        if (group.key !== groupKey) {
          return group;
        }
        return {
          ...group,
          modifiers: group.modifiers.map((modifier) =>
            modifier.key === modifierKey ? { ...modifier, ...patch } : modifier,
          ),
        };
      }),
    );
  }

  function buildPayload() {
    const priceCents = parseDollarsToCents(priceDollars);
    if (priceCents === null) {
      throw new Error("Enter a valid price like 12.50");
    }

    if (!categoryId) {
      throw new Error("Choose a category");
    }

    if (!name.trim()) {
      throw new Error("Item name is required");
    }

    const modifierGroups = groups.map((group, groupIndex) => {
      if (!group.name.trim()) {
        throw new Error("Each modifier group needs a name");
      }

      const minSelect = Number.parseInt(group.minSelect || "0", 10);
      const maxSelect = Number.parseInt(group.maxSelect || "1", 10);
      if (!Number.isFinite(minSelect) || !Number.isFinite(maxSelect) || maxSelect < 1) {
        throw new Error("Check modifier group min/max select values");
      }

      return {
        name: group.name.trim(),
        required: group.required,
        minSelect,
        maxSelect,
        sortOrder: groupIndex,
        modifiers: group.modifiers.map((modifier, modifierIndex) => {
          if (!modifier.name.trim()) {
            throw new Error("Each modifier needs a name");
          }
          const priceDeltaCents = parseDollarsToCents(modifier.priceDollars || "0");
          if (priceDeltaCents === null) {
            throw new Error(`Invalid price on modifier “${modifier.name}”`);
          }
          return {
            name: modifier.name.trim(),
            priceDeltaCents,
            available: modifier.available,
            sortOrder: modifierIndex,
          };
        }),
      };
    });

    return {
      categoryId,
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      priceCents,
      available,
      modifierGroups,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = buildPayload();
      const response = await fetch(
        mode === "create" ? "/api/menu/items" : `/api/menu/items/${item!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const message = await readApiError(response);
        setFormError(message);
        toastError(message);
        return;
      }

      const body = (await response.json()) as { data: { id: string } };
      success(mode === "create" ? "Item created." : "Item saved.");
      router.push(`/dashboard/menu/${body.data.id}`);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save menu item.";
      setFormError(message);
      toastError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-text-secondary">
            Add a category first, then create menu items.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Card>
        <CardHeader className="py-4">
          <h2 className="text-base font-semibold text-foreground">Item details</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="itemCategory" label="Category">
            <Select
              value={categoryId}
              onChange={setCategoryId}
              options={activeCategories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          </FormField>

          <FormField id="itemName" label="Name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Classic burger"
            />
          </FormField>

          <FormField id="itemDescription" label="Description" hint="Optional">
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Angus beef, lettuce, tomato, house sauce"
            />
          </FormField>

          <FormField id="itemPrice" label="Price (CAD)" hint="Example: 14.50">
            <Input
              value={priceDollars}
              onChange={(event) => setPriceDollars(event.target.value)}
              inputMode="decimal"
              placeholder="14.50"
            />
          </FormField>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={available}
              onChange={(event) => setAvailable(event.target.checked)}
              className="h-4 w-4 rounded-md border-border-strong"
            />
            Available for ordering
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Modifiers</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Optional add-ons or required choices (size, toppings).
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setGroups((current) => [
                ...current,
                {
                  key: newKey(),
                  name: "",
                  required: false,
                  minSelect: "0",
                  maxSelect: "1",
                  modifiers: [],
                },
              ])
            }
          >
            Add group
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-text-secondary">No modifier groups yet.</p>
          ) : (
            groups.map((group) => (
              <div
                key={group.key}
                className="space-y-3 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <FormField id={`group-name-${group.key}`} label="Group name">
                      <Input
                        value={group.name}
                        onChange={(event) =>
                          updateGroup(group.key, { name: event.target.value })
                        }
                        placeholder="Toppings"
                      />
                    </FormField>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setGroups((current) =>
                        current.filter((entry) => entry.key !== group.key),
                      )
                    }
                  >
                    Remove group
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-1">
                    <input
                      type="checkbox"
                      checked={group.required}
                      onChange={(event) =>
                        updateGroup(group.key, { required: event.target.checked })
                      }
                      className="h-4 w-4 rounded-md border-border-strong"
                    />
                    Required
                  </label>
                  <FormField id={`min-${group.key}`} label="Min select">
                    <Input
                      value={group.minSelect}
                      onChange={(event) =>
                        updateGroup(group.key, { minSelect: event.target.value })
                      }
                      inputMode="numeric"
                    />
                  </FormField>
                  <FormField id={`max-${group.key}`} label="Max select">
                    <Input
                      value={group.maxSelect}
                      onChange={(event) =>
                        updateGroup(group.key, { maxSelect: event.target.value })
                      }
                      inputMode="numeric"
                    />
                  </FormField>
                </div>

                <div className="space-y-2">
                  {group.modifiers.map((modifier) => (
                    <div
                      key={modifier.key}
                      className="grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[1fr_7rem_auto_auto]"
                    >
                      <Input
                        value={modifier.name}
                        onChange={(event) =>
                          updateModifier(group.key, modifier.key, {
                            name: event.target.value,
                          })
                        }
                        placeholder="Extra cheese"
                        aria-label="Modifier name"
                      />
                      <Input
                        value={modifier.priceDollars}
                        onChange={(event) =>
                          updateModifier(group.key, modifier.key, {
                            priceDollars: event.target.value,
                          })
                        }
                        inputMode="decimal"
                        placeholder="1.50"
                        aria-label="Modifier price"
                      />
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={modifier.available}
                          onChange={(event) =>
                            updateModifier(group.key, modifier.key, {
                              available: event.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded-md border-border-strong"
                        />
                        On
                      </label>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          updateGroup(group.key, {
                            modifiers: group.modifiers.filter(
                              (entry) => entry.key !== modifier.key,
                            ),
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      updateGroup(group.key, {
                        modifiers: [
                          ...group.modifiers,
                          {
                            key: newKey(),
                            name: "",
                            priceDollars: "0.00",
                            available: true,
                          },
                        ],
                      })
                    }
                  >
                    Add modifier
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {formError ? (
        <p className="text-sm text-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/dashboard/menu")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving…"
            : mode === "create"
              ? "Create item"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
