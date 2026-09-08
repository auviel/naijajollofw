import { apiFetch } from "@/lib/api";
import { requestBoardRefresh } from "@/lib/kitchen/board-live";
import { useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import {
  formatCadFromCents,
  type StaffOrderListItem,
} from "@naijajollof/api-types";
import { Button } from "@naijajollof/ui";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type QuoteRow = {
  providerId: string;
  id: string;
  feeCents: number;
  currency: string;
};

type DeliveryMethodSheetProps = {
  order: StaffOrderListItem;
  /** When true, transition preparing → ready before assigning method. */
  markReadyFirst: boolean;
  onDone: () => void;
  onCancel: () => void;
};

export function DeliveryMethodSheet({
  order,
  markReadyFirst,
  onDone,
  onCancel,
}: DeliveryMethodSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useKitchenTheme();
  const styles = useThemedStyles((c) => ({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end" as const,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: c.surfaceElevated,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 12,
    },
    title: { ...KType.section, color: c.text },
    subtitle: { ...KType.meta, color: c.textSecondary },
    quoteRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    quoteSelected: {
      borderColor: c.accent,
      backgroundColor: c.background,
    },
    error: { ...KType.metaStrong, color: c.danger },
  }));

  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"choose" | "courier">("choose");
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );

  const ensureReady = useCallback(async () => {
    if (!markReadyFirst) return;
    if (order.status === "ready") return;
    await apiFetch(`/api/orders/${order.id}/transition`, {
      method: "POST",
      body: JSON.stringify({ to: "ready" }),
    });
  }, [markReadyFirst, order.id, order.status]);

  const chooseManual = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await ensureReady();
      await apiFetch(`/api/orders/${order.id}/fulfill/assign-manual`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      requestBoardRefresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save method");
    } finally {
      setBusy(false);
    }
  }, [ensureReady, onDone, order.id]);

  const loadQuotes = useCallback(async () => {
    if (!order.dropoffAddress) {
      setError("Missing delivery address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await ensureReady();
      const result = await apiFetch<{
        quotes: QuoteRow[];
        failures: unknown[];
      }>("/api/deliveries/quote", {
        method: "POST",
        body: JSON.stringify({
          dropoffAddress: order.dropoffAddress,
          dropoffName: order.customerName,
          dropoffPhone: order.customerPhone,
        }),
      });
      setQuotes(result.quotes ?? []);
      setSelectedProviderId(result.quotes?.[0]?.providerId ?? null);
      if (!result.quotes?.length) {
        setError("No courier quotes available.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get quotes");
    } finally {
      setBusy(false);
    }
  }, [ensureReady, order]);

  const dispatchCourier = useCallback(async () => {
    if (!selectedProviderId) {
      setError("Select a courier.");
      return;
    }
    const quote = quotes.find((row) => row.providerId === selectedProviderId);
    if (!quote) {
      setError("Selected quote expired. Refresh quotes.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/orders/${order.id}/fulfill/delivergo`, {
        method: "POST",
        body: JSON.stringify({
          providerId: selectedProviderId,
          quoteId: quote.id,
        }),
      });
      requestBoardRefresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dispatch failed");
    } finally {
      setBusy(false);
    }
  }, [onDone, order.id, quotes, selectedProviderId]);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={styles.title}>Delivery method</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {order.customerName}
            {order.dropoffAddress ? ` · ${order.dropoffAddress}` : ""}
          </Text>

          {mode === "choose" ? (
            <>
              <Button
                label={busy ? "…" : "Courier"}
                onPress={() => {
                  setMode("courier");
                  void loadQuotes();
                }}
                disabled={busy}
              />
              <Button
                label={busy ? "…" : "We’ll deliver"}
                variant="secondary"
                onPress={() => void chooseManual()}
                disabled={busy}
              />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={onCancel}
                disabled={busy}
              />
            </>
          ) : (
            <>
              {busy && quotes.length === 0 ? (
                <ActivityIndicator color={colors.accent} />
              ) : null}
              {quotes.map((quote) => {
                const selected = quote.providerId === selectedProviderId;
                return (
                  <Pressable
                    key={quote.id}
                    onPress={() => setSelectedProviderId(quote.providerId)}
                    style={[styles.quoteRow, selected && styles.quoteSelected]}
                  >
                    <Text style={KType.bodyStrong}>{quote.providerId}</Text>
                    <Text style={KType.numeric}>
                      {formatCadFromCents(quote.feeCents)}
                    </Text>
                  </Pressable>
                );
              })}
              <Button
                label={busy ? "…" : "Send courier"}
                onPress={() => void dispatchCourier()}
                disabled={busy || !selectedProviderId}
              />
              <Button
                label="Refresh quotes"
                variant="secondary"
                onPress={() => void loadQuotes()}
                disabled={busy}
              />
              <Button
                label="Back"
                variant="ghost"
                onPress={() => {
                  setMode("choose");
                  setError(null);
                }}
                disabled={busy}
              />
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
