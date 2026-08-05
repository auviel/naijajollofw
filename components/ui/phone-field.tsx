import { cn } from "@/lib/utils/cn";

type PhoneFieldProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  name?: string;
  disabled?: boolean;
  autoComplete?: string;
};

function toLocalDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length >= 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

function formatLive(digits: string): string {
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function PhoneField({
  id,
  label = "Phone",
  value,
  onChange,
  error,
  name,
  disabled,
  autoComplete = "tel",
}: PhoneFieldProps) {
  const digits = toLocalDigits(value);
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">
        {label}
      </label>
      <div
        className={cn(
          "flex h-12 overflow-hidden rounded-md border bg-background focus-within:outline focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-foreground",
          error ? "border-error" : "border-border-strong",
        )}
      >
        <span className="flex items-center border-r border-border px-3 text-sm text-text-secondary">
          +1
        </span>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete}
          disabled={disabled}
          value={formatLive(digits)}
          onChange={(event) => onChange(toLocalDigits(event.target.value))}
          placeholder="(519) 555-0100"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-base text-foreground outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
