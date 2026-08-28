import type { AmakaChatSession } from "@/lib/amaka-chat-history-shared";
import { Colors, Radii, Type } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export function AmakaChatToolbar({
  onNewChat,
  onOpenHistory,
  disabled,
}: {
  onNewChat: () => void | Promise<void>;
  onOpenHistory: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={styles.iconHit}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={22}
          color={disabled ? Colors.textSecondary : Colors.text}
        />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setOpen(false);
                void onNewChat();
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.menuLabel}>New chat</Text>
            </Pressable>
            <Pressable
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => {
                setOpen(false);
                void onOpenHistory();
              }}
            >
              <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.menuLabel}>History</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function AmakaChatHistoryPanel({
  sessions,
  onBack,
  onSelectSession,
  formatWhen,
}: {
  sessions: AmakaChatSession[];
  onBack: () => void;
  onSelectSession: (session: AmakaChatSession) => void;
  formatWhen: (updatedAt: number) => string;
}) {
  return (
    <View style={styles.historyRoot}>
      <View style={styles.historyHeader}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.iconHit}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.historyTitle}>History</Text>
      </View>
      <ScrollView contentContainerStyle={styles.historyList}>
        {sessions.length === 0 ? (
          <Text style={[Type.meta, styles.historyEmpty]}>
            No past chats yet. Start a conversation with Amaka.
          </Text>
        ) : (
          sessions.map((session) => (
            <Pressable
              key={session.id}
              style={styles.historyItem}
              onPress={() => void onSelectSession(session)}
            >
              <Text style={styles.historyItemTitle} numberOfLines={1}>
                {session.title}
              </Text>
              <Text style={Type.meta}>{formatWhen(session.updatedAt)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  iconHit: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(28,20,15,0.25)",
    justifyContent: "flex-end",
  },
  sheet: {
    margin: 16,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceElevated,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuLabel: {
    ...Type.body,
    fontWeight: "600",
  },
  historyRoot: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  historyTitle: {
    ...Type.headline,
  },
  historyEmpty: {
    textAlign: "center",
    padding: 32,
  },
  historyList: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
  },
  historyItem: {
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
    marginBottom: 10,
  },
  historyItemTitle: {
    fontWeight: "700",
    color: Colors.text,
    fontSize: 15,
  },
});
