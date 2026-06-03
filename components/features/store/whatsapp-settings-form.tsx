"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { StoreProfile } from "@/lib/domain/store/types";

type StaffPhone = {
  id: string;
  phoneE164: string;
  label: string | null;
};

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "Unable to save WhatsApp settings.";
}

export function WhatsAppSettingsForm({ store }: { store: StoreProfile }) {
  const { success, error: toastError } = useToast();
  const [whatsappEnabled, setWhatsappEnabled] = useState(store.whatsappEnabled);
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState(
    store.whatsappPhoneNumberId ?? "",
  );
  const [staffPhones, setStaffPhones] = useState<StaffPhone[]>([]);
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingPhone, setIsAddingPhone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/store/whatsapp");
        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        const body = (await response.json()) as {
          data: {
            whatsappEnabled: boolean;
            whatsappPhoneNumberId: string | null;
            staffPhones: StaffPhone[];
          };
        };

        if (cancelled) {
          return;
        }

        setWhatsappEnabled(body.data.whatsappEnabled);
        setWhatsappPhoneNumberId(body.data.whatsappPhoneNumberId ?? "");
        setStaffPhones(body.data.staffPhones);
      } catch (error) {
        if (!cancelled) {
          toastError(
            error instanceof Error ? error.message : "Unable to load WhatsApp settings.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [toastError]);

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/store/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappEnabled,
          whatsappPhoneNumberId: whatsappPhoneNumberId.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      success("WhatsApp settings saved.");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Unable to save WhatsApp settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddStaffPhone(event: React.FormEvent) {
    event.preventDefault();
    setIsAddingPhone(true);

    try {
      const response = await fetch("/api/store/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newStaffPhone.trim() }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const body = (await response.json()) as { data: StaffPhone };
      setStaffPhones((current) => [...current, body.data]);
      setNewStaffPhone("");
      success("Staff phone added.");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Unable to add staff phone.");
    } finally {
      setIsAddingPhone(false);
    }
  }

  async function handleRemoveStaffPhone(phoneE164: string) {
    try {
      const response = await fetch(
        `/api/store/whatsapp?phone=${encodeURIComponent(phoneE164)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setStaffPhones((current) => current.filter((phone) => phone.phoneE164 !== phoneE164));
      success("Staff phone removed.");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Unable to remove staff phone.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-foreground">WhatsApp dispatch</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Allowlisted staff can text your Meta WhatsApp test number to quote and send deliveries.
          See WHATSAPP_IMPLEMENTATION.md for Meta setup.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-text-secondary">Loading WhatsApp settings…</p>
        ) : (
          <>
            <form className="space-y-4" onSubmit={handleSaveSettings}>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border-strong"
                  checked={whatsappEnabled}
                  onChange={(event) => setWhatsappEnabled(event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Enable WhatsApp dispatch
                  </span>
                  <span className="block text-sm text-text-secondary">
                    Requires WHATSAPP_ENABLED=true and webhook credentials on the server.
                  </span>
                </span>
              </label>

              <FormField id="whatsappPhoneNumberId" label="Meta phone number ID">
                <Input
                  value={whatsappPhoneNumberId}
                  onChange={(event) => setWhatsappPhoneNumberId(event.target.value)}
                  placeholder="From Meta → WhatsApp → API Setup"
                />
              </FormField>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save WhatsApp settings"}
                </Button>
              </div>
            </form>

            <div className="space-y-3 border-t border-border pt-6">
              <h3 className="text-sm font-medium text-foreground">Allowlisted staff phones</h3>
              <p className="text-sm text-text-secondary">
                Only these numbers can dispatch via WhatsApp. Use the same number you verified in Meta.
              </p>

              {staffPhones.length > 0 ? (
                <ul className="space-y-2">
                  {staffPhones.map((phone) => (
                    <li
                      key={phone.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <span className="text-sm text-foreground">{phone.phoneE164}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void handleRemoveStaffPhone(phone.phoneE164)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-secondary">No staff phones added yet.</p>
              )}

              <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleAddStaffPhone}>
                <Input
                  value={newStaffPhone}
                  onChange={(event) => setNewStaffPhone(event.target.value)}
                  placeholder="+1 519 555 0100"
                />
                <Button type="submit" disabled={isAddingPhone || !newStaffPhone.trim()}>
                  {isAddingPhone ? "Adding…" : "Add staff phone"}
                </Button>
              </form>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
