import { StackScroll } from "@/components/kitchen/stack-scroll";
import { KType } from "@/lib/kitchen/typography";
import { useAuth } from "@/lib/auth";
import { Card, Screen } from "@naijajollof/ui";
import { Text } from "react-native";

export default function AccountStoreScreen() {
  const { store, user } = useAuth();

  return (
    <Screen>
      <StackScroll>
        <Card style={{ gap: 6 }}>
          <Text style={KType.bodyStrong}>
            {store?.name ?? user?.storeName ?? "—"}
          </Text>
          <Text style={KType.meta}>{store?.phone || "No phone on file"}</Text>
          <Text style={KType.meta}>
            Address and hours will show here when available from the store profile.
          </Text>
        </Card>
      </StackScroll>
    </Screen>
  );
}
