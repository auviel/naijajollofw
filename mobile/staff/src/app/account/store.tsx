import { StackScroll } from "@/components/kitchen/stack-scroll";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import {
  formatStoreAddressLine,
  type StaffStoreProfile,
} from "@/lib/kitchen/staff-me";
import { KType } from "@/lib/kitchen/typography";
import { Button, Card, Colors, Field, Screen, Skeleton } from "@naijajollof/ui";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

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

export default function AccountStoreScreen() {
  const { store, user, refreshMe } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [hours, setHours] = useState<HoursSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
          <Text style={KType.kicker}>Info</Text>
          <Text style={KType.meta}>
            {store?.name ?? user?.storeName ?? "Store"}
          </Text>
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
          <Button
            label={savingProfile ? "Saving…" : "Save store"}
            disabled={savingProfile}
            onPress={() => void saveProfile()}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={KType.kicker}>Hours</Text>
          <Text style={KType.meta}>
            Times use {hours?.timezone ?? "store timezone"}. Overnight closes
            are supported (e.g. 22:00–02:00).
          </Text>
          {!hours?.configured ? (
            <Text style={KType.meta}>
              No schedule saved yet — treated as always open until you save one.
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
                      openTime: !day.closed ? null : day.openTime ?? "11:00",
                      closeTime: !day.closed ? null : day.closeTime ?? "22:00",
                    })
                  }
                >
                  <Text style={KType.meta}>Closed</Text>
                  <Switch
                    value={day.closed}
                    onValueChange={(closed) =>
                      updateDay(day.dayOfWeek, {
                        closed,
                        openTime: closed ? null : day.openTime ?? "11:00",
                        closeTime: closed ? null : day.closeTime ?? "22:00",
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
          <Button
            label={savingHours ? "Saving…" : "Save hours"}
            disabled={savingHours || !hours}
            onPress={() => void saveHours()}
          />
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.ok}>{message}</Text> : null}
      </StackScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
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
  error: { ...KType.meta, color: Colors.danger, marginTop: 8 },
  ok: { ...KType.meta, color: Colors.success, marginTop: 8 },
});
