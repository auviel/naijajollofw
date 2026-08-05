"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormBanner } from "@/components/ui/form-banner";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { ArrowDown, ArrowLeft, ArrowUp, Plus, X } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ModifierSourcePicker } from "@/components/features/menu/modifier-source-picker";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import {
  formatCentsAsDollarsInput,
  parseDollarsToCents,
} from "@/lib/domain/menu/format";
import { MODIFIER_GROUP_MAX_SELECT_DEFAULT } from "@/lib/domain/menu/limits";
import {
  clearMenuItemGroupError,
  hasMenuItemFormErrors,
  validateMenuItemForm,
  type MenuItemFieldErrors,
  type MenuItemGroupErrors,
} from "@/lib/domain/menu/form-validation";
import { readApiError, readApiErrorResponse } from "@/lib/forms/read-api-error";
import {
  MENU_IMAGE_ACCEPT,
  MENU_IMAGE_ALLOWED_TYPES,
  MENU_IMAGE_MAX_BYTES,
  MENU_IMAGE_MAX_COUNT,
} from "@/lib/domain/menu/media";
import type {
  MenuItemDetail,
  MenuItemImageView,
  MenuPickerItem,
} from "@/lib/domain/menu/types";
import {
  MENU_ITEM_DESCRIPTION_MAX,
  MENU_ITEM_NAME_MAX,
} from "@/lib/domain/menu/limits";
import { formatCadFromCents } from "@/lib/utils/currency";

type CategoryOption = {
  id: string;
  name: string;
  active: boolean;
};

type LegacyModifierDraft = {
  key: string;
  name: string;
  priceDeltaCents: number;
};

type ModifierGroupDraft = {
  key: string;
  name: string;
  maxSelect: string;
  source: "items" | "category";
  sourceCategoryId: string;
  sourceItemIds: string[];
  legacyModifiers: LegacyModifierDraft[];
};

type MenuItemFormProps = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  pickerItems: MenuPickerItem[];
  item?: MenuItemDetail;
};

type DestroyTarget =
  | { type: "photo"; id: string }
  | { type: "group"; key: string; name: string };

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function groupsFromItem(item?: MenuItemDetail): ModifierGroupDraft[] {
  if (!item) {
    return [];
  }

  return item.modifierGroups.map((group) => {
    const linkedIds = group.modifiers
      .map((modifier) => modifier.sourceItemId)
      .filter((id): id is string => Boolean(id));
    const legacyModifiers = group.modifiers
      .filter((modifier) => !modifier.sourceItemId)
      .map((modifier) => ({
        key: modifier.id,
        name: modifier.name,
        priceDeltaCents: modifier.priceDeltaCents,
      }));

    return {
      key: group.id,
      name: group.name,
      maxSelect: String(group.maxSelect),
      source: group.sourceCategoryId ? "category" : "items",
      sourceCategoryId: group.sourceCategoryId ?? "",
      sourceItemIds: group.sourceCategoryId ? [] : linkedIds,
      legacyModifiers: group.sourceCategoryId ? [] : legacyModifiers,
    };
  });
}

export function MenuItemForm({
  mode,
  categories,
  pickerItems,
  item,
}: MenuItemFormProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categoryId, setCategoryId] = useState(item?.categoryId ?? categories[0]?.id ?? "");
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>(
    () => item?.additionalCategoryIds ?? [],
  );
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
  const [groups, setGroups] = useState<ModifierGroupDraft[]>(() => groupsFromItem(item));
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<MenuItemFieldErrors>({});
  const [groupErrors, setGroupErrors] = useState<MenuItemGroupErrors>(
    () => new Map(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [destroyTarget, setDestroyTarget] = useState<DestroyTarget | null>(null);
  const [destroyPending, setDestroyPending] = useState(false);

  const activeCategories = categories.filter(
    (category) => category.active || category.id === categoryId,
  );
  const alsoShowCategories = activeCategories.filter(
    (category) => category.id !== categoryId,
  );
  const totalPhotoCount = savedImages.length + pendingFiles.length;

  function updateGroup(key: string, patch: Partial<ModifierGroupDraft>) {
    setGroups((current) =>
      current.map((group) => (group.key === key ? { ...group, ...patch } : group)),
    );
  }

  function moveGroup(key: string, direction: -1 | 1) {
    setGroups((current) => {
      const index = current.findIndex((group) => group.key === key);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
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

      const maxSelect = Number.parseInt(
        group.maxSelect || String(MODIFIER_GROUP_MAX_SELECT_DEFAULT),
        10,
      );
      if (!Number.isFinite(maxSelect) || maxSelect < 1) {
        throw new Error("Check modifier group max");
      }

      return {
        name: group.name.trim(),
        required: false,
        minSelect: 0,
        maxSelect,
        sortOrder: groupIndex,
        sourceCategoryId:
          group.source === "category" ? group.sourceCategoryId || null : null,
        sourceItemIds: group.source === "items" ? group.sourceItemIds : [],
        modifiers:
          group.source === "items"
            ? group.legacyModifiers.map((modifier, modifierIndex) => ({
                name: modifier.name,
                priceDeltaCents: modifier.priceDeltaCents,
                sortOrder: group.sourceItemIds.length + modifierIndex,
              }))
            : [],
      };
    });

    return {
      categoryId,
      additionalCategoryIds: additionalCategoryIds.filter(
        (id) => id !== categoryId,
      ),
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      priceCents,
      available,
      ...(savedImages.length === 0 && pendingFiles.length === 0
        ? { imageUrl: null }
        : {}),
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
    setPendingFiles((current) => [...current, ...next]);
  }

  async function removeSavedImage(imageId: string): Promise<boolean> {
    if (mode !== "edit" || !item) {
      setSavedImages((current) => current.filter((image) => image.id !== imageId));
      return true;
    }
    try {
      const response = await fetch(
        `/api/menu/items/${item.id}/images/${imageId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        toastError(await readApiError(response));
        return false;
      }
      setSavedImages((current) => current.filter((image) => image.id !== imageId));
      success("Photo removed");
      return true;
    } catch {
      toastError("Unable to remove photo.");
      return false;
    }
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

  async function applyDestroy() {
    if (!destroyTarget) {
      return;
    }

    if (destroyTarget.type === "photo") {
      setDestroyPending(true);
      const removed = await removeSavedImage(destroyTarget.id);
      setDestroyPending(false);
      if (removed) {
        setDestroyTarget(null);
      }
      return;
    }

    if (destroyTarget.type === "group") {
      setGroups((current) =>
        current.filter((entry) => entry.key !== destroyTarget.key),
      );
      setDestroyTarget(null);
      return;
    }
  }

  async function toggleAvailability() {
    if (mode !== "edit" || !item) {
      setAvailable((current) => !current);
      return;
    }

    const next = !available;
    setAvailable(next);
    try {
      const response = await fetch(`/api/menu/items/${item.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: next }),
      });
      if (!response.ok) {
        setAvailable(!next);
        toastError(await readApiError(response));
        return;
      }
      success(next ? "Item available" : "Marked sold out");
      router.refresh();
    } catch {
      setAvailable(!next);
      toastError("Unable to update availability.");
    }
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
      <div className="space-y-4">
        <Link
          href="/dashboard/menu"
          className="inline-flex h-11 items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Menu
        </Link>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-text-secondary">
              Add a category first, then create menu items.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/menu"
          className="inline-flex h-11 items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Menu
        </Link>
        <button
          type="button"
          onClick={() => void toggleAvailability()}
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-medium",
            available
              ? "bg-surface text-text-secondary hover:bg-border"
              : "bg-amber-100 text-amber-950 hover:bg-amber-200",
          )}
          aria-pressed={available}
        >
          {available ? "Available" : "Sold out"}
        </button>
      </header>

      <Card>
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
                setAdditionalCategoryIds((current) =>
                  current.filter((id) => id !== next),
                );
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

          {alsoShowCategories.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-text-secondary">
                Also show in
              </legend>
              <p className="text-sm text-text-tertiary">
                Same product can appear under more than one category.
              </p>
              <ul className="space-y-1 rounded-2xl bg-surface-elevated p-3">
                {alsoShowCategories.map((category) => {
                  const checked = additionalCategoryIds.includes(category.id);
                  return (
                    <li key={category.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm text-foreground hover:bg-surface">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border accent-foreground"
                          checked={checked}
                          onChange={() => {
                            setAdditionalCategoryIds((current) =>
                              checked
                                ? current.filter((id) => id !== category.id)
                                : [...current, category.id],
                            );
                          }}
                        />
                        <span>{category.name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor="itemName"
              className="text-sm font-medium text-text-secondary"
            >
              Name
            </label>
            <Input
              id="itemName"
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
              maxLength={MENU_ITEM_NAME_MAX}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby="itemName-count"
            />
            <div className="flex items-start justify-between gap-3">
              {fieldErrors.name ? (
                <p role="alert" className="text-sm text-error">
                  {fieldErrors.name}
                </p>
              ) : (
                <span />
              )}
              <p
                id="itemName-count"
                className="shrink-0 text-right text-xs tabular-nums text-text-tertiary"
              >
                {name.length}/{MENU_ITEM_NAME_MAX}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="itemDescription"
              className="text-sm font-medium text-text-secondary"
            >
              Description (Optional)
            </label>
            <textarea
              id="itemDescription"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Angus beef, lettuce, tomato, house sauce"
              maxLength={MENU_ITEM_DESCRIPTION_MAX}
              rows={3}
              aria-describedby="itemDescription-count"
              className="flex min-h-[5.5rem] w-full resize-y rounded-md border border-border-strong bg-background px-4 py-3 text-base text-foreground placeholder:text-text-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p
              id="itemDescription-count"
              className="text-right text-xs tabular-nums text-text-tertiary"
            >
              {description.length}/{MENU_ITEM_DESCRIPTION_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="itemPrice"
              className="text-sm font-medium text-text-secondary"
            >
              Price
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base text-text-secondary"
                aria-hidden
              >
                $
              </span>
              <Input
                id="itemPrice"
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
                className="pl-8"
                aria-invalid={fieldErrors.priceDollars ? true : undefined}
              />
            </div>
            {fieldErrors.priceDollars ? (
              <p role="alert" className="text-sm text-error">
                {fieldErrors.priceDollars}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-secondary">Photos</p>
              <p className="text-xs text-text-tertiary">
                Up to {MENU_IMAGE_MAX_COUNT} · JPEG, PNG, WebP, GIF
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {savedImages.map((image) => (
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
                        <IconButton
                          onClick={() =>
                            setDestroyTarget({ type: "photo", id: image.id })
                          }
                          className="absolute top-1 right-1 h-7 w-7 bg-background/90 text-foreground hover:bg-background"
                          aria-label="Remove photo"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </IconButton>
                      </div>
                    ))}
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
                    <IconButton
                      onClick={() => removePendingFile(pending.key)}
                      className="absolute top-1 right-1 h-7 w-7 bg-background/90 text-foreground hover:bg-background"
                      aria-label="Remove pending photo"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </IconButton>
                  </div>
                ))}
                {totalPhotoCount < MENU_IMAGE_MAX_COUNT ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface text-text-tertiary transition-colors hover:border-foreground hover:text-foreground"
                    aria-label="Add photos"
                  >
                    <Plus className="h-6 w-6" aria-hidden />
                  </button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={MENU_IMAGE_ACCEPT}
                multiple
                className="sr-only"
                tabIndex={-1}
                disabled={totalPhotoCount >= MENU_IMAGE_MAX_COUNT}
                onChange={(event) => {
                  addPendingFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Options</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Link products or a category so prices stay in sync. Group order
              is how diners see options.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() =>
              setGroups((current) => [
                ...current,
                {
                  key: newKey(),
                  name: "",
                  maxSelect: String(MODIFIER_GROUP_MAX_SELECT_DEFAULT),
                  source: "items",
                  sourceCategoryId: "",
                  sourceItemIds: [],
                  legacyModifiers: [],
                },
              ])
            }
          >
            Add group
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-text-secondary">No options yet.</p>
          ) : (
            groups.map((group, groupIndex) => (
              <div
                key={group.key}
                className="space-y-3 rounded-2xl bg-surface-elevated p-4"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <FormField
                      id={`group-name-${group.key}`}
                      label="Group name"
                      error={groupErrors.get(group.key)?.name}
                    >
                      <Input
                        value={group.name}
                        onChange={(event) => {
                          updateGroup(group.key, { name: event.target.value });
                          if (groupErrors.get(group.key)?.name) {
                            setGroupErrors((current) =>
                              clearMenuItemGroupError(current, group.key, "name"),
                            );
                          }
                        }}
                        placeholder="Toppings"
                      />
                    </FormField>
                  </div>
                  <FormField
                    id={`max-${group.key}`}
                    label="Max"
                    className="w-20 shrink-0 sm:w-24"
                    error={groupErrors.get(group.key)?.maxSelect}
                  >
                    <Input
                      value={group.maxSelect}
                      onChange={(event) => {
                        updateGroup(group.key, {
                          maxSelect: event.target.value,
                        });
                        if (groupErrors.get(group.key)?.maxSelect) {
                          setGroupErrors((current) =>
                            clearMenuItemGroupError(
                              current,
                              group.key,
                              "maxSelect",
                            ),
                          );
                        }
                      }}
                      inputMode="numeric"
                      aria-label="Max selections"
                    />
                  </FormField>
                  <div className="mt-7 flex shrink-0 items-center gap-1">
                    <IconButton
                      className="h-12 w-12"
                      aria-label="Move group up"
                      disabled={groupIndex === 0}
                      onClick={() => moveGroup(group.key, -1)}
                    >
                      <ArrowUp className="h-5 w-5" aria-hidden />
                    </IconButton>
                    <IconButton
                      className="h-12 w-12"
                      aria-label="Move group down"
                      disabled={groupIndex === groups.length - 1}
                      onClick={() => moveGroup(group.key, 1)}
                    >
                      <ArrowDown className="h-5 w-5" aria-hidden />
                    </IconButton>
                    <IconButton
                      className="h-12 w-12"
                      aria-label="Remove group"
                      onClick={() =>
                        setDestroyTarget({
                          type: "group",
                          key: group.key,
                          name: group.name.trim(),
                        })
                      }
                    >
                      <X className="h-5 w-5" aria-hidden />
                    </IconButton>
                  </div>
                </div>

                <FormField
                  id={`source-${group.key}`}
                  label="Options"
                  error={groupErrors.get(group.key)?.sourceCategoryId}
                >
                  <ModifierSourcePicker
                    id={`source-${group.key}`}
                    source={group.source}
                    sourceCategoryId={group.sourceCategoryId}
                    sourceItemIds={group.sourceItemIds}
                    categories={categories}
                    pickerItems={pickerItems}
                    excludeItemId={item?.id}
                    error={groupErrors.get(group.key)?.sourceCategoryId}
                    onSourceChange={(nextSource) =>
                      updateGroup(group.key, { source: nextSource })
                    }
                    onToggleProduct={(itemId) => {
                      const selected = group.sourceItemIds.includes(itemId);
                      updateGroup(group.key, {
                        source: "items",
                        sourceItemIds: selected
                          ? group.sourceItemIds.filter((id) => id !== itemId)
                          : [...group.sourceItemIds, itemId],
                      });
                    }}
                    onSelectCategory={(categoryId) => {
                      updateGroup(group.key, {
                        source: "category",
                        sourceCategoryId: categoryId,
                      });
                      if (groupErrors.get(group.key)?.sourceCategoryId) {
                        setGroupErrors((current) =>
                          clearMenuItemGroupError(
                            current,
                            group.key,
                            "sourceCategoryId",
                          ),
                        );
                      }
                    }}
                  />
                </FormField>

                {group.source === "category" && group.sourceCategoryId ? (
                  <ul className="space-y-1 rounded-2xl bg-surface p-3">
                    {pickerItems
                      .filter(
                        (entry) =>
                          entry.categoryId === group.sourceCategoryId &&
                          entry.id !== item?.id,
                      )
                      .map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 truncate text-foreground">
                            {entry.name}
                            {!entry.available ? (
                              <span className="text-text-tertiary"> · sold out</span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-text-secondary">
                            {formatCadFromCents(entry.priceCents)}
                          </span>
                        </li>
                      ))}
                    {pickerItems.every(
                      (entry) =>
                        entry.categoryId !== group.sourceCategoryId ||
                        entry.id === item?.id,
                    ) ? (
                      <li className="text-sm text-text-secondary">
                        No products in this category yet.
                      </li>
                    ) : null}
                  </ul>
                ) : null}

                {group.source === "items" &&
                (group.sourceItemIds.length > 0 ||
                  group.legacyModifiers.length > 0) ? (
                  <ul className="space-y-1">
                    {group.sourceItemIds.map((sourceItemId) => {
                      const entry = pickerItems.find(
                        (row) => row.id === sourceItemId,
                      );
                      return (
                        <li
                          key={sourceItemId}
                          className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                            {entry?.name ?? "Unavailable product"}
                          </span>
                          <span className="shrink-0 text-sm text-text-secondary">
                            {entry ? formatCadFromCents(entry.priceCents) : "—"}
                          </span>
                          <IconButton
                            className="h-8 w-8"
                            aria-label={`Remove ${entry?.name ?? "product"}`}
                            onClick={() =>
                              updateGroup(group.key, {
                                sourceItemIds: group.sourceItemIds.filter(
                                  (id) => id !== sourceItemId,
                                ),
                              })
                            }
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </IconButton>
                        </li>
                      );
                    })}
                    {group.legacyModifiers.map((modifier) => (
                      <li
                        key={modifier.key}
                        className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {modifier.name}
                          <span className="text-text-tertiary"> · custom</span>
                        </span>
                        <span className="shrink-0 text-sm text-text-secondary">
                          {formatCadFromCents(modifier.priceDeltaCents)}
                        </span>
                        <IconButton
                          className="h-8 w-8"
                          aria-label={`Remove ${modifier.name}`}
                          onClick={() =>
                            updateGroup(group.key, {
                              legacyModifiers: group.legacyModifiers.filter(
                                (row) => row.key !== modifier.key,
                              ),
                            })
                          }
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </IconButton>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {formError ? <FormBanner>{formError}</FormBanner> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Saving…"
            : mode === "create"
              ? "Create item"
              : "Save changes"}
        </Button>
      </div>

      <ConfirmDialog
        open={destroyTarget !== null}
        title={
          destroyTarget?.type === "photo"
            ? "Remove this photo?"
            : "Remove this group?"
        }
        description={
          destroyTarget?.type === "photo"
            ? "This photo will be deleted from the item."
            : `${destroyTarget?.name || "This group"} and its options will be removed.`
        }
        confirmLabel={
          destroyTarget?.type === "photo" ? "Remove photo" : "Remove group"
        }
        cancelLabel="Keep"
        pending={destroyPending}
        onCancel={() => {
          if (!destroyPending) {
            setDestroyTarget(null);
          }
        }}
        onConfirm={() => void applyDestroy()}
      />
    </form>
  );
}
