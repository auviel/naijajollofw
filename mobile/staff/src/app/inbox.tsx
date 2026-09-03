import { StackScroll } from "@/components/kitchen/stack-scroll";
import {
  setInboxUnreadCount,
  useInboxUnread,
} from "@/lib/kitchen/inbox-unread";
import { DarkPalette, useKitchenTheme } from "@/lib/kitchen/theme";
import { KType } from "@/lib/kitchen/typography";
import { useThemedStyles } from "@/lib/kitchen/use-themed-styles";
import { Card, Radii, Screen } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type Animated as AnimatedType,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

type InboxItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

const SEED: InboxItem[] = [
  {
    id: "1",
    title: "New order #42",
    body: "Pickup · Jollof + plantain",
    createdAt: "Just now",
    read: false,
  },
  {
    id: "2",
    title: "Order #38 cancelled",
    body: "Guest cancelled after accept",
    createdAt: "12m ago",
    read: true,
  },
  {
    id: "3",
    title: "New order #41",
    body: "Delivery · Family pack",
    createdAt: "1h ago",
    read: true,
  },
];

const LONG_SWIPE_PX = -140;

function useInboxStyles() {
  return useThemedStyles((c) => {
    const dark = c.background === DarkPalette.background;
    return {
      list: { gap: 8 },
      row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
      },
      rowUnread: {
        borderLeftWidth: 3,
        borderLeftColor: c.accent,
      },
      dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: c.accent,
      },
      empty: {
        ...KType.meta,
        textAlign: "center" as const,
        marginTop: 48,
      },
      actions: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        paddingLeft: 8,
        paddingRight: 4,
      },
      action: {
        minWidth: 72,
        minHeight: 72,
        borderRadius: Radii.pill,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: StyleSheet.hairlineWidth,
      },
      actionRead: {
        backgroundColor: dark ? "rgba(255,255,255,0.12)" : c.secondarySoft,
        borderColor: dark ? "rgba(255,255,255,0.16)" : c.border,
      },
      actionDelete: {
        backgroundColor: dark ? "rgba(220,38,38,0.22)" : c.dangerSoft,
        borderColor: dark ? "rgba(220,38,38,0.4)" : "rgba(220,38,38,0.2)",
      },
      actionLabelRead: {
        ...KType.metaStrong,
        color: c.text,
      },
      actionLabelDelete: {
        ...KType.metaStrong,
        color: c.danger,
      },
    };
  });
}

function RightActions({
  dragX,
  read,
  onToggleRead,
  onDelete,
  onLongSwipe,
}: {
  dragX: AnimatedType.AnimatedInterpolation<number>;
  read: boolean;
  onToggleRead: () => void;
  onDelete: () => void;
  onLongSwipe: () => void;
}) {
  const styles = useInboxStyles();
  const { colors } = useKitchenTheme();
  const deleteColor = colors.danger;
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    const id = dragX.addListener(({ value }) => {
      if (!fired.current && value <= LONG_SWIPE_PX) {
        fired.current = true;
        onLongSwipe();
      }
    });
    return () => {
      dragX.removeListener(id);
    };
  }, [dragX, onLongSwipe]);

  return (
    <View style={styles.actions}>
      <Pressable
        style={[styles.action, styles.actionRead]}
        onPress={onToggleRead}
        accessibilityRole="button"
        accessibilityLabel={read ? "Mark unread" : "Mark read"}
      >
        <Ionicons
          name={read ? "mail-unread-outline" : "mail-open-outline"}
          size={18}
          color={colors.text}
        />
        <Text style={styles.actionLabelRead}>{read ? "Unread" : "Read"}</Text>
      </Pressable>
      <Pressable
        style={[styles.action, styles.actionDelete]}
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Delete"
      >
        <Ionicons name="trash-outline" size={18} color={deleteColor} />
        <Text style={styles.actionLabelDelete}>Delete</Text>
      </Pressable>
    </View>
  );
}

function InboxRow({
  item,
  onToggleRead,
  onDelete,
}: {
  item: InboxItem;
  onToggleRead: () => void;
  onDelete: () => void;
}) {
  const styles = useInboxStyles();
  const ref = useRef<Swipeable>(null);

  const close = useCallback(() => {
    ref.current?.close();
  }, []);

  const renderRightActions = useCallback(
    (
      _progress: AnimatedType.AnimatedInterpolation<number>,
      dragX: AnimatedType.AnimatedInterpolation<number>,
    ) => (
      <RightActions
        dragX={dragX}
        read={item.read}
        onToggleRead={() => {
          onToggleRead();
          close();
        }}
        onDelete={() => {
          onDelete();
          close();
        }}
        onLongSwipe={() => {
          onToggleRead();
          close();
        }}
      />
    ),
    [close, item.read, onDelete, onToggleRead],
  );

  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight
      overshootFriction={8}
      renderRightActions={renderRightActions}
    >
      <Card style={[styles.row, !item.read && styles.rowUnread]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={KType.bodyStrong}>{item.title}</Text>
          <Text style={KType.meta}>{item.body}</Text>
          <Text style={KType.meta}>{item.createdAt}</Text>
        </View>
        {!item.read ? <View style={styles.dot} /> : null}
      </Card>
    </Swipeable>
  );
}

export default function InboxScreen() {
  const styles = useInboxStyles();
  const { refresh } = useInboxUnread();
  const [items, setItems] = useState<InboxItem[]>(SEED);

  const unread = useMemo(
    () => items.filter((i) => !i.read).length,
    [items],
  );

  useEffect(() => {
    void setInboxUnreadCount(unread).then(refresh);
  }, [unread, refresh]);

  function toggleRead(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, read: !item.read } : item,
      ),
    );
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <Screen>
      <StackScroll>
        {items.length === 0 ? (
          <Text style={styles.empty}>You’re caught up</Text>
        ) : (
          <>
            {unread > 0 ? (
              <Text style={KType.meta}>{unread} unread</Text>
            ) : (
              <Text style={KType.meta}>You’re caught up</Text>
            )}
            <View style={styles.list}>
              {items.map((item) => (
                <InboxRow
                  key={item.id}
                  item={item}
                  onToggleRead={() => toggleRead(item.id)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </View>
          </>
        )}
      </StackScroll>
    </Screen>
  );
}
