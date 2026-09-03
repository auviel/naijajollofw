import { IconBtn } from "@/components/kitchen/icon-btn";
import { StackScroll } from "@/components/kitchen/stack-scroll";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import {
  formatStoreAddressLine,
  type StaffStoreProfile,
} from "@/lib/kitchen/staff-me";
import { KType } from "@/lib/kitchen/typography";
import { Button, Card, Colors, Field, Screen, Skeleton } from "@naijajollof/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HoursDay = {
  dayOfWeek: number;
  closed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

type HoursSchedule = {
  timezone: string;
  days: HoursDay[];
  configured: boolean;
};

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function isValidTime(value: string | null): boolean {
  if (!value) return false;
  return /^([01]?\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}

function validateDays(days: HoursDay[]): string | null {
  for (const day of days) {
    if (day.closed) continue;
    if (!isValidTime(day.openTime) || !isValidTime(day.closeTime)) {
      return `Set open and close times for ${DAY_LABELS[day.dayOfWeek] ?? "each day"}.`;
    }
  }
  return null;
}

function formatDayHours(day: HoursDay): string {
  if (day.closed) return "Closed";
  return `${day.openTime ?? "—"}–${day.closeTime ?? "—"}`;
}

function summarizeHours(hours: HoursSchedule | null): string {
  if (!hours) return "Loading…";
  if (!hours.configured) return "No schedule — treated as always open";
  const openDays = hours.days.filter((d) => !d.closed);
  if (openDays.length === 0) return "Closed every day";
  return openDays
    .map((d) => {
      const label = (DAY_LABELS[d.dayOfWeek] ?? "?").slice(0, 3);
      return `${label} ${d.openTime}–${d.closeTime}`;
    })
    .join(" · ");
}

export default function AccountStoreScreen() {
  const { store, user, refreshMe } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [hours, setHours] = useState<HoursSchedule | null>(null);
  const [hoursBaseline, setHoursBaseline] = useState<HoursSchedule | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const applyStore = useCallback((s: StaffStoreProfile) => {
    setName(s.name);
    setPhone(s.phone);
    setEmail(s.email);
    setAddressQuery(formatStoreAddressLine(s));
    setAddressLine2(s.addressLine2 ?? "");
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      await refreshMe();
      const schedule = await apiFetch<HoursSchedule>("/api/store/hours");
      setHours(schedule);
      setHoursBaseline(schedule);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load store.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshMe]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (store) applyStore(store);
  }, [store, applyStore]);

  const profileDirty = useMemo(() => {
    if (!store) return false;
    return (
      name.trim() !== store.name ||
      phone.trim() !== store.phone ||
      email.trim().toLowerCase() !== store.email.toLowerCase() ||
      addressQuery.trim() !== formatStoreAddressLine(store) ||
      (addressLine2.trim() || "") !== (store.addressLine2 ?? "")
    );
  }, [store, name, phone, email, addressQuery, addressLine2]);

  const hoursDirty = useMemo(() => {
    if (!hours || !hoursBaseline) return false;
    return JSON.stringify(hours.days) !== JSON.stringify(hoursBaseline.days);
  }, [hours, hoursBaseline]);

  function updateDay(dayOfWeek: number, patch: Partial<HoursDay>) {
    setHours((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d,
        ),
      };
    });
  }

  function cancelProfileEdit() {
    if (store) applyStore(store);
    setEditingProfile(false);
    setError(null);
  }

  function cancelHoursEdit() {
    if (hoursBaseline) setHours(hoursBaseline);
    setEditingHours(false);
    setError(null);
  }

  async function saveProfile() {
    setSavingProfile(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch<StaffStoreProfile>("/api/store", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          addressQuery: addressQuery.trim(),
          addressLine2: addressLine2.trim() || undefined,
        }),
      });
      await refreshMe();
      setEditingProfile(false);
      setMessage("Store profile saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save store.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveHours() {
    if (!hours) return;
    const validationError = validateDays(hours.days);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSavingHours(true);
    setError(null);
    setMessage(null);
    try {
      const next = await apiFetch<HoursSchedule>("/api/store/hours", {
        method: "PUT",
        body: JSON.stringify({ days: hours.days }),
      });
      setHours(next);
      setHoursBaseline(next);
      setEditingHours(false);
      setMessage("Hours saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save hours.");
    } finally {
      setSavingHours(false);
    }
  }

  if (loading && !store) {
    return (
      <Screen>
        <StackScroll>
          <Card style={{ gap: 12 }}>
            <Skeleton height={20} width="40%" />
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </Card>
          <Card style={{ gap: 12, marginTop: 12 }}>
            <Skeleton height={20} width="30%" />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </Card>
        </StackScroll>
      </Screen>
    );
  }

  const showFooter =
    (editingProfile && profileDirty) || (editingHours && hoursDirty);

  return (
    <Screen>
      <StackScroll
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={Colors.accent}
          />
        }
      >
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={KType.kicker}>Store</Text>
            {editingProfile ? (
              <IconBtn
                name="close"
                color={Colors.text}
                label="Cancel editing store"
                onPress={cancelProfileEdit}
                soft
              />
            ) : (
              <IconBtn
                name="create-outline"
                color={Colors.accent}
                label="Edit store"
                onPress={() => setEditingProfile(true)}
                soft
              />
            )}
          </View>

          {editingProfile ? (
            <>
              <View style={styles.fieldBlock}>
                <Text style={KType.meta}>Name</Text>
                <Field value={name} onChangeText={setName} />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={KType.meta}>Phone</Text>
                <Field
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={KType.meta}>Email</Text>
                <Field
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={KType.meta}>Address</Text>
                <Field
                  value={addressQuery}
                  onChangeText={setAddressQuery}
                  placeholder="Street, city, province postal"
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={KType.meta}>Unit / suite (optional)</Text>
                <Field value={addressLine2} onChangeText={setAddressLine2} />
              </View>
            </>
          ) : (
            <View style={styles.infoBlock}>
              <Text style={KType.bodyStrong}>
                {store?.name ?? user?.storeName ?? "Store"}
              </Text>
              <Text style={KType.meta}>{store?.phone || "—"}</Text>
              <Text style={KType.meta}>{store?.email || "—"}</Text>
              <Text style={KType.meta}>
                {store ? formatStoreAddressLine(store) : "—"}
              </Text>
              {store?.addressLine2 ? (
                <Text style={KType.meta}>{store.addressLine2}</Text>
              ) : null}
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={KType.kicker}>Hours</Text>
            {editingHours ? (
              <IconBtn
                name="close"
                color={Colors.text}
                label="Cancel editing hours"
                onPress={cancelHoursEdit}
                soft
              />
            ) : (
              <IconBtn
                name="create-outline"
                color={Colors.accent}
                label="Edit hours"
                onPress={() => setEditingHours(true)}
                soft
              />
            )}
          </View>

          {editingHours ? (
            <>
              <Text style={KType.meta}>
                Times use {hours?.timezone ?? "store timezone"}. Overnight
                closes are supported (e.g. 22:00–02:00).
              </Text>
              {!hours?.configured ? (
                <Text style={KType.meta}>
                  No schedule saved yet — treated as always open until you save
                  one.
                </Text>
              ) : null}
              {(hours?.days ?? []).map((day) => (
                <View key={day.dayOfWeek} style={styles.dayRow}>
                  <View style={styles.dayHead}>
                    <Text style={KType.bodyStrong}>
                      {DAY_LABELS[day.dayOfWeek] ?? `Day ${day.dayOfWeek}`}
                    </Text>
                    <Pressable
                      style={styles.closedToggle}
                      onPress={() =>
                        updateDay(day.dayOfWeek, {
                          closed: !day.closed,
                          openTime: !day.closed
                            ? null
                            : (day.openTime ?? "11:00"),
                          closeTime: !day.closed
                            ? null
                            : (day.closeTime ?? "22:00"),
                        })
                      }
                    >
                      <Text style={KType.meta}>Closed</Text>
                      <Switch
                        value={day.closed}
                        onValueChange={(closed) =>
                          updateDay(day.dayOfWeek, {
                            closed,
                            openTime: closed
                              ? null
                              : (day.openTime ?? "11:00"),
                            closeTime: closed
                              ? null
                              : (day.closeTime ?? "22:00"),
                          })
                        }
                      />
                    </Pressable>
                  </View>
                  {!day.closed ? (
                    <View style={styles.times}>
                      <Field
                        style={styles.timeField}
                        value={day.openTime ?? ""}
                        onChangeText={(openTime) =>
                          updateDay(day.dayOfWeek, { openTime })
                        }
                        placeholder="11:00"
                      />
                      <Text style={KType.meta}>–</Text>
                      <Field
                        style={styles.timeField}
                        value={day.closeTime ?? ""}
                        onChangeText={(closeTime) =>
                          updateDay(day.dayOfWeek, { closeTime })
                        }
                        placeholder="22:00"
                      />
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          ) : (
            <View style={styles.infoBlock}>
              <Text style={KType.meta}>{summarizeHours(hours)}</Text>
              {(hours?.days ?? []).map((day) => (
                <View key={day.dayOfWeek} style={styles.hoursViewRow}>
                  <Text style={KType.body}>
                    {DAY_LABELS[day.dayOfWeek] ?? `Day ${day.dayOfWeek}`}
                  </Text>
                  <Text style={KType.meta}>{formatDayHours(day)}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.ok}>{message}</Text> : null}
      </StackScroll>

      {showFooter ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {editingProfile && profileDirty ? (
            <Button
              label={savingProfile ? "Saving…" : "Save store"}
              disabled={savingProfile}
              onPress={() => void saveProfile()}
            />
          ) : null}
          {editingHours && hoursDirty ? (
            <Button
              label={savingHours ? "Saving…" : "Save hours"}
              disabled={savingHours || !hours}
              onPress={() => void saveHours()}
            />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  infoBlock: { gap: 4 },
  fieldBlock: { gap: 6 },
  dayRow: {
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  dayHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  closedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  times: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeField: { flex: 1 },
  hoursViewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  error: { ...KType.meta, color: Colors.danger, marginTop: 8 },
  ok: { ...KType.meta, color: Colors.success, marginTop: 8 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
