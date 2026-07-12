"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { CustomerSearchResult } from "@/lib/domain/customer/types";
import { phoneE164ToFormValue } from "@/lib/domain/customer/format";

type CustomerNameAutocompleteProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (customer: CustomerSearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
};

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Unable to load customers.";
}

export function CustomerNameAutocomplete({
  id,
  name,
  value,
  onChange,
  onSelect,
  placeholder = "Jane Doe",
  disabled,
}: CustomerNameAutocompleteProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextSearchRef = useRef(false);
  const userEditedRef = useRef(false);

  const [suggestions, setSuggestions] = useState<CustomerSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!userEditedRef.current) {
      return;
    }

    const trimmed = value.trim();

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    if (trimmed.length < 1) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setSearchError(null);

      try {
        const params = new URLSearchParams({ q: trimmed });
        const response = await fetch(`/api/customers/search?${params.toString()}`);

        if (!response.ok) {
          setSuggestions([]);
          setIsOpen(false);
          setSearchError(await readApiError(response));
          return;
        }

        const body = (await response.json()) as { data: { items: CustomerSearchResult[] } };
        setSuggestions(body.data.items);
        setIsOpen(body.data.items.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
        setSearchError("Unable to load customers.");
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function chooseCustomer(customer: CustomerSearchResult) {
    skipNextSearchRef.current = true;
    onSelect(customer);
    onChange(customer.name);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const selected = suggestions.at(activeIndex);
      if (selected) {
        chooseCustomer(selected);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(event) => {
          userEditedRef.current = true;
          const nextValue = event.target.value;
          onChange(nextValue);
          if (nextValue.trim().length < 1) {
            setSuggestions([]);
            setIsOpen(false);
            setActiveIndex(-1);
            setSearchError(null);
          }
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        role="combobox"
        disabled={disabled}
      />

      {isLoading ? (
        <p className="mt-1 text-xs text-text-tertiary">Searching saved customers…</p>
      ) : null}

      {searchError ? (
        <p className="mt-1 text-xs text-destructive">{searchError}</p>
      ) : null}

      {isOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-background py-1 shadow-lg"
        >
          {suggestions.map((customer, index) => (
            <li key={customer.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors duration-fast hover:bg-surface",
                  index === activeIndex && "bg-surface",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseCustomer(customer)}
              >
                <span className="font-medium text-foreground">{customer.name}</span>
                <span className="text-sm text-text-secondary">
                  {customer.phoneDisplay} · {customer.addressFormatted}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function customerSearchResultToFormValues(customer: CustomerSearchResult) {
  return {
    dropoffName: customer.name,
    dropoffPhone: phoneE164ToFormValue(customer.phoneE164),
    dropoffAddress: customer.addressFormatted,
  };
}
