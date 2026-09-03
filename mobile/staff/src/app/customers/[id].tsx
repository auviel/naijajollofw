import { StackScroll } from "@/components/kitchen/stack-scroll";
import { apiFetch } from "@/lib/api";
import { KType } from "@/lib/kitchen/typography";
import { Card, Colors, KitchenTicketSkeleton, Screen } from "@naijajollof/ui";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type CustomerDetail = {
  id: string;
  name: string;
  notes: string | null;
  phones: Array<{ id: string; phoneE164: string; isPrimary: boolean }>;
  addresses: Array<{
    id: string;
    formatted: string;
    isPrimary: boolean;
  }>;
  orderCount: number;
  deliveryCount: number;
};

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    try {
      const data = await apiFetch<CustomerDetail>(`/api/customers/${id}`);
      setCustomer(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customer");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!customer && !error) {
    return (
      <Screen>
        <KitchenTicketSkeleton />
      </Screen>
    );
  }

  if (error || !customer) {
    return (
      <Screen>
        <Text style={[styles.error, { margin: 20 }]}>
          {error ?? "Not found"}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <StackScroll>
        <Card style={styles.card}>
          <Text style={KType.bodyStrong}>{customer.name}</Text>
          <Text style={KType.meta}>
            {customer.orderCount} orders · {customer.deliveryCount} deliveries
          </Text>
          {customer.notes ? (
            <Text style={[KType.body, styles.blockGap]}>{customer.notes}</Text>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={KType.kicker}>Phones</Text>
          {customer.phones.length === 0 ? (
            <Text style={KType.meta}>None on file</Text>
          ) : (
            customer.phones.map((phone) => (
              <Text key={phone.id} style={KType.body}>
                {phone.phoneE164}
                {phone.isPrimary ? " · primary" : ""}
              </Text>
            ))
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={KType.kicker}>Addresses</Text>
          {customer.addresses.length === 0 ? (
            <Text style={KType.meta}>None on file</Text>
          ) : (
            customer.addresses.map((address) => (
              <Text key={address.id} style={KType.body}>
                {address.formatted}
                {address.isPrimary ? " · primary" : ""}
              </Text>
            ))
          )}
        </Card>

        <View style={styles.past}>
          <Text style={KType.kicker}>Past orders</Text>
          <Text style={KType.meta}>Coming in a later update.</Text>
        </View>
      </StackScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  blockGap: { marginTop: 6 },
  past: { gap: 4, marginTop: 8 },
  error: { ...KType.metaStrong, color: Colors.danger },
});
