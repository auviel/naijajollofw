"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormBanner } from "@/components/ui/form-banner";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  formatCentsAsDollarsInput,
  parseDollarsToCents,
} from "@/lib/domain/menu/format";
import {
  hasMenuItemFormErrors,
  validateMenuItemForm,
  type MenuItemFieldErrors,
  type MenuItemGroupErrors,
  type MenuItemModifierErrors,
} from "@/lib/domain/menu/form-validation";
import { readApiError, readApiErrorResponse } from "@/lib/forms/read-api-error";
import {
  MENU_IMAGE_ACCEPT,
  MENU_IMAGE_ALLOWED_TYPES,
  MENU_IMAGE_MAX_BYTES,
  MENU_IMAGE_MAX_COUNT,
} from "@/lib/domain/menu/media";
import type { MenuItemDetail, MenuItemImageView } from "@/lib/domain/menu/types";

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
  const [savedImages, setSavedImages] = useState<MenuItemImageView[]>(
    () => item?.images ?? [],
  );
  const [pendingFiles, setPendingFiles] = useState<
    Array<{ key: string; file: File; previewUrl: string }>
  >([]);
  const [clearAllImages, setClearAllImages] = useState(false);
  const [groups, setGroups] = useState<ModifierGroupDraft[]>(() => groupsFromItem(item));
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<MenuItemFieldErrors>({});
  const [groupErrors, setGroupErrors] = useState<MenuItemGroupErrors>({});
  const [modifierErrors, setModifierErrors] = useState<MenuItemModifierErrors>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCategories = categories.filter((category) => category.active || category.id === categoryId);
  const totalPhotoCount =
    (clearAllImages ? 0 : savedImages.length) + pendingFiles.length;

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
      ...(clearAllImages && pendingFiles.length === 0 ? { imageUrl: null } : {}),
      modifierGroups,
    };
  }

  function addPendingFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const room = MENU_IMAGE_MAX_COUNT - totalPhotoCount;
    if (room <= 0) {
      toastError(`At most ${MENU_IMAGE_MAX_COUNT} photos per item.`);
      return;
    }

    const next: Array<{ key: string; file: File; previewUrl: string }> = [];
    for (const file of Array.from(fileList)) {
      if (next.length >= room) break;
      const type = (file.type || "").toLowerCase();
      if (!MENU_IMAGE_ALLOWED_TYPES.has(type)) {
        toastError("Use JPEG, PNG, WebP, or GIF only.");
        continue;
      }
      if (file.size <= 0 || file.size > MENU_IMAGE_MAX_BYTES) {
        toastError(
          `Each photo must be at most ${Math.floor(MENU_IMAGE_MAX_BYTES / (1024 * 1024))} MB.`,
        );
        continue;
      }
      next.push({
        key: newKey(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (next.length === 0) return;
    setClearAllImages(false);
    setPendingFiles((current) => [...current, ...next]);
  }

  async function removeSavedImage(imageId: string) {
    if (mode !== "edit" || !item) {
      setSavedImages((current) => current.filter((image) => image.id !== imageId));
      return;
    }
    const response = await fetch(
      `/api/menu/items/${item.id}/images/${imageId}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      toastError(await readApiError(response));
      return;
    }
    setSavedImages((current) => current.filter((image) => image.id !== imageId));
    success("Photo removed");
  }

  function removePendingFile(key: string) {
    setPendingFiles((current) => {
      const target = current.find((row) => row.key === key);
      if (target?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((row) => row.key !== key);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateMenuItemForm({
      categoryId,
      name,
      priceDollars,
      groups,
    });
    setFieldErrors(validation.fieldErrors);
    setGroupErrors(validation.groupErrors);
    setModifierErrors(validation.modifierErrors);
    if (hasMenuItemFormErrors(validation)) {
      setFormError("Fix the highlighted fields first.");
      return;
    }

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
        const { message, fieldErrors: apiFields } =
          await readApiErrorResponse(response);
        setFieldErrors((current) => ({
          ...current,
          categoryId: apiFields.categoryId ?? current.categoryId,
          name: apiFields.name ?? current.name,
          priceDollars: apiFields.priceCents ?? current.priceDollars,
        }));
        setFormError(message);
        toastError(message);
        return;
      }

      const body = (await response.json()) as {
        data: { id: string; imageUrl?: string | null; images?: MenuItemImageView[] };
      };
      const itemId = body.data.id;

      if (pendingFiles.length > 0) {
        for (const pending of pendingFiles) {
          const formData = new FormData();
          formData.set("file", pending.file);
          const uploadResponse = await fetch(`/api/menu/items/${itemId}/image`, {
            method: "POST",
            body: formData,
          });
          if (!uploadResponse.ok) {
            const message = await readApiError(uploadResponse);
            setFormError(
              mode === "create"
                ? `Item saved, but a photo failed to upload: ${message}`
                : message,
            );
            toastError(message);
            router.push(`/dashboard/menu/${itemId}`);
            router.refresh();
            return;
          }
        }
        for (const pending of pendingFiles) {
          if (pending.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(pending.previewUrl);
          }
        }
        setPendingFiles([]);
      }

      success(mode === "create" ? "Item created." : "Item saved.");
      router.push(`/dashboard/menu/${itemId}`);
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
          <FormField
            id="itemCategory"
            label="Category"
            error={fieldErrors.categoryId}
          >
            <Select
              value={categoryId}
              onChange={(next) => {
                setCategoryId(next);
                if (fieldErrors.categoryId) {
                  setFieldErrors((current) => ({
                    ...current,
                    categoryId: undefined,
                  }));
                }
              }}
              options={activeCategories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          </FormField>

          <FormField id="itemName" label="Name" error={fieldErrors.name}>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((current) => ({
                    ...current,
                    name: undefined,
                  }));
                }
              }}
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

          <FormField
            id="itemPrice"
            label="Price (CAD)"
            hint="Example: 14.50"
            error={fieldErrors.priceDollars}
          >
            <Input
              value={priceDollars}
              onChange={(event) => {
                setPriceDollars(event.target.value);
                if (fieldErrors.priceDollars) {
                  setFieldErrors((current) => ({
                    ...current,
                    priceDollars: undefined,
                  }));
                }
              }}
              inputMode="decimal"
              placeholder="14.50"
            />
          </FormField>

          <FormField
            id="itemImages"
            label="Photos"
            hint={`Up to ${MENU_IMAGE_MAX_COUNT} images · JPEG/PNG/WebP/GIF · max ${Math.floor(MENU_IMAGE_MAX_BYTES / (1024 * 1024))} MB each`}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {!clearAllImages
                  ? savedImages.map((image) => (
                      <div
                        key={image.id}
                        className="relative h-24 w-24 overflow-hidden rounded-2xl bg-surface"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => void removeSavedImage(image.id)}
                          className="absolute top-1 right-1 rounded-full bg-background/90 px-1.5 text-xs font-medium text-foreground"
                          aria-label="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  : null}
                {pendingFiles.map((pending) => (
                  <div
                    key={pending.key}
                    className="relative h-24 w-24 overflow-hidden rounded-2xl bg-surface ring-2 ring-accent/40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pending.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePendingFile(pending.key)}
                      className="absolute top-1 right-1 rounded-full bg-background/90 px-1.5 text-xs font-medium text-foreground"
                      aria-label="Remove pending photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {totalPhotoCount === 0 ? (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-surface text-center text-xs text-text-tertiary">
                    No photos
                  </div>
                ) : null}
              </div>
              <Input
                type="file"
                accept={MENU_IMAGE_ACCEPT}
                multiple
                disabled={totalPhotoCount >= MENU_IMAGE_MAX_COUNT}
                onChange={(event) => {
                  addPendingFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              {totalPhotoCount > 0 ? (
                <button
                  type="button"
                  className="text-sm font-medium text-text-secondary underline-offset-2 hover:underline"
                  onClick={() => {
                    for (const pending of pendingFiles) {
                      if (pending.previewUrl.startsWith("blob:")) {
                        URL.revokeObjectURL(pending.previewUrl);
                      }
                    }
                    setPendingFiles([]);
                    setSavedImages([]);
                    setClearAllImages(true);
                  }}
                >
                  Remove all photos
                </button>
              ) : null}
            </div>
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
                    <FormField
                      id={`group-name-${group.key}`}
                      label="Group name"
                      error={groupErrors[group.key]?.name}
                    >
                      <Input
                        value={group.name}
                        onChange={(event) => {
                          updateGroup(group.key, { name: event.target.value });
                          if (groupErrors[group.key]?.name) {
                            setGroupErrors((current) => ({
                              ...current,
                              [group.key]: {
                                ...current[group.key],
                                name: undefined,
                              },
                            }));
                          }
                        }}
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
                  <FormField
                    id={`min-${group.key}`}
                    label="Min select"
                    error={groupErrors[group.key]?.minSelect}
                  >
                    <Input
                      value={group.minSelect}
                      onChange={(event) => {
                        updateGroup(group.key, {
                          minSelect: event.target.value,
                        });
                        if (groupErrors[group.key]?.minSelect) {
                          setGroupErrors((current) => ({
                            ...current,
                            [group.key]: {
                              ...current[group.key],
                              minSelect: undefined,
                            },
                          }));
                        }
                      }}
                      inputMode="numeric"
                    />
                  </FormField>
                  <FormField
                    id={`max-${group.key}`}
                    label="Max select"
                    error={groupErrors[group.key]?.maxSelect}
                  >
                    <Input
                      value={group.maxSelect}
                      onChange={(event) => {
                        updateGroup(group.key, {
                          maxSelect: event.target.value,
                        });
                        if (groupErrors[group.key]?.maxSelect) {
                          setGroupErrors((current) => ({
                            ...current,
                            [group.key]: {
                              ...current[group.key],
                              maxSelect: undefined,
                            },
                          }));
                        }
                      }}
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
                      <div className="space-y-1">
                        <Input
                          value={modifier.name}
                          onChange={(event) => {
                            updateModifier(group.key, modifier.key, {
                              name: event.target.value,
                            });
                            if (modifierErrors[modifier.key]?.name) {
                              setModifierErrors((current) => ({
                                ...current,
                                [modifier.key]: {
                                  ...current[modifier.key],
                                  name: undefined,
                                },
                              }));
                            }
                          }}
                          placeholder="Extra cheese"
                          aria-label="Modifier name"
                          aria-invalid={
                            modifierErrors[modifier.key]?.name
                              ? true
                              : undefined
                          }
                        />
                        {modifierErrors[modifier.key]?.name ? (
                          <p role="alert" className="text-sm text-error">
                            {modifierErrors[modifier.key]?.name}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <Input
                          value={modifier.priceDollars}
                          onChange={(event) => {
                            updateModifier(group.key, modifier.key, {
                              priceDollars: event.target.value,
                            });
                            if (modifierErrors[modifier.key]?.priceDollars) {
                              setModifierErrors((current) => ({
                                ...current,
                                [modifier.key]: {
                                  ...current[modifier.key],
                                  priceDollars: undefined,
                                },
                              }));
                            }
                          }}
                          inputMode="decimal"
                          placeholder="1.50"
                          aria-label="Modifier price"
                          aria-invalid={
                            modifierErrors[modifier.key]?.priceDollars
                              ? true
                              : undefined
                          }
                        />
                        {modifierErrors[modifier.key]?.priceDollars ? (
                          <p role="alert" className="text-sm text-error">
                            {modifierErrors[modifier.key]?.priceDollars}
                          </p>
                        ) : null}
                      </div>
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

      {formError ? <FormBanner>{formError}</FormBanner> : null}

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
