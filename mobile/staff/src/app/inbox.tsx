import { StackScroll } from "@/components/kitchen/stack-scroll";
import {
  setInboxUnreadCount,
  useInboxUnread,
} from "@/lib/kitchen/inbox-unread";
import { KType } from "@/lib/kitchen/typography";
import { Button, Screen } from "@naijajollof/ui";
import { StyleSheet, Text, View } from "react-native";

export default function InboxScreen() {
  const { count, refresh } = useInboxUnread();

  return (
    <Screen>
      <StackScroll>
        <Text style={KType.page}>Inbox</Text>
        <Text style={KType.meta}>
          {count > 0
            ? `${count} unread (stub — real feed comes with push)`
            : "You’re caught up"}
        </Text>

        {__DEV__ ? (
          <View style={styles.dev}>
            <Text style={KType.kicker}>Dev badge</Text>
            <Button
              variant="secondary"
              label="Mark 1 unread"
              onPress={() => {
                void setInboxUnreadCount(1).then(refresh);
              }}
            />
            <Button
              variant="ghost"
              label="Clear unread"
              onPress={() => {
                void setInboxUnreadCount(0).then(refresh);
              }}
            />
          </View>
        ) : null}
      </StackScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dev: { gap: 10, marginTop: 24 },
});
