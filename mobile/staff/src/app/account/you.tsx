import { StackScroll } from "@/components/kitchen/stack-scroll";
import { KType } from "@/lib/kitchen/typography";
import { useAuth } from "@/lib/auth";
import { Card, Screen } from "@naijajollof/ui";
import { Text } from "react-native";

export default function AccountYouScreen() {
  const { user } = useAuth();

  return (
    <Screen>
      <StackScroll>
        <Card style={{ gap: 6 }}>
          <Text style={KType.bodyStrong}>{user?.name ?? "—"}</Text>
          <Text style={KType.meta}>{user?.email ?? "—"}</Text>
          <Text style={KType.meta}>{user?.role ?? "—"}</Text>
        </Card>
      </StackScroll>
    </Screen>
  );
}
