"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { AddressSuggestion } from "@/lib/integrations/geocoding/types";

type AddressAutocompleteProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
};

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Unable to load address suggestions.";
}

export function AddressAutocomplete({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete = "off",
  disabled,
}: AddressAutocompleteProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const skipNextSuggestRef = useRef(false);

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  useEffect(() => {
    const query = value.trim();

    if (skipNextSuggestRef.current) {
      skipNextSuggestRef.current = false;
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      setSuggestError(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setSuggestError(null);

      try {
        const response = await fetch("/api/geocode/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          setSuggestions([]);
          setIsOpen(false);
          setSuggestError(await readApiError(response));
          return;
        }

        const body = (await response.json()) as { data: AddressSuggestion[] };
        setSuggestions(body.data);
        setIsOpen(body.data.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
        setSuggestError("Unable to load address suggestions.");
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
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectSuggestion(suggestion: AddressSuggestion) {
    skipNextSuggestRef.current = true;
    onChange(suggestion.label);
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
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
      />

      {isLoading ? (
        <p className="mt-1 text-xs text-text-tertiary">Searching…</p>
      ) : null}

      {suggestError ? (
        <p className="mt-1 text-xs text-text-tertiary">{suggestError}</p>
      ) : null}

      {isOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border-strong bg-background py-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                className={cn(
                  "block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-surface",
                  index === activeIndex && "bg-surface",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
