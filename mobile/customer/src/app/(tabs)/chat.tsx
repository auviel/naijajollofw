import { AskAmakaChat } from "@/components/ask-amaka-chat";
import { DinerTabHeader } from "@/components/diner-tab-header";
import { Screen } from "@naijajollof/ui";
import { Platform, StyleSheet, View } from "react-native";

export default function ChatScreen() {
  return (
    <Screen style={styles.screen}>
      {Platform.OS === "ios" ? <DinerTabHeader title="Ask Amaka" /> : null}
      <View style={styles.body}>
        <AskAmakaChat />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
});
