import { apiFetch } from "@/lib/api";
import { createDinerChatTransport } from "@/lib/ai-chat-transport";
import { useCart } from "@/lib/cart";
import { AmakaAvatar } from "@/components/amaka-avatar";
import {
  AmakaChatHistoryPanel,
  AmakaChatToolbar,
} from "@/components/amaka-chat-menu";
import { useAmakaChatSessions } from "@/lib/use-amaka-chat-sessions";
import { formatCadFromCents } from "@naijajollof/api-types";
import { Button, Colors, Radii, Type } from "@naijajollof/ui";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type CatalogCardItem = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  available: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getToolOutput(part: { type: string; output?: unknown }): unknown {
  return "output" in part ? part.output : undefined;
}

function ProductCards({
  items,
  onAdded,
}: {
  items: CatalogCardItem[];
  onAdded: () => void;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function addItem(item: CatalogCardItem) {
    setPendingId(item.id);
    try {
      await apiFetch("/api/cart", {
        method: "POST",
        body: JSON.stringify({
          menuItemId: item.id,
          quantity: 1,
          modifierIds: [],
        }),
      });
      onAdded();
    } catch {
      // Keep UI calm; diner can retry from cart or customize.
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.cards}>
      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={Type.meta}>
              {formatCadFromCents(item.priceCents)}
              {!item.available ? " · Sold out" : null}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <Pressable onPress={() => router.push(`/item/${item.slug}`)}>
              <Text style={styles.link}>View</Text>
            </Pressable>
            {item.available ? (
              <Pressable
                disabled={pendingId === item.id}
                onPress={() => void addItem(item)}
                style={[styles.addBtn, pendingId === item.id && styles.addBtnBusy]}
              >
                <Text style={styles.addLabel}>
                  {pendingId === item.id ? "…" : "Add"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function renderPart(
  part: UIMessage["parts"][number],
  key: string,
  onAdded: () => void,
  router: ReturnType<typeof useRouter>,
) {
  if (part.type === "text") {
    const text = part.text;
    const wantsSignIn =
      /sign\s*in|\/signin|saved card|my address|place (an )?order/i.test(text);
    return (
      <View key={key} style={styles.partBlock}>
        <Text style={styles.msgText}>{text}</Text>
        {wantsSignIn ? (
          <Pressable onPress={() => router.push("/login")}>
            <Text style={styles.link}>Sign in</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (part.type === "tool-searchCatalog" || part.type === "tool-getProduct") {
    const output = getToolOutput(part as { type: string; output?: unknown });
    if (!isRecord(output)) return null;

    if (part.type === "tool-searchCatalog" && Array.isArray(output.items)) {
      const items = output.items.filter(isRecord).map((row) => ({
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        name: String(row.name ?? ""),
        priceCents: Number(row.priceCents ?? 0),
        available: Boolean(row.available),
      }));
      return (
        <ProductCards
          key={key}
          items={items.filter((i) => i.id)}
          onAdded={onAdded}
        />
      );
    }

    if (part.type === "tool-getProduct" && typeof output.id === "string") {
      return (
        <ProductCards
          key={key}
          items={[
            {
              id: String(output.id),
              slug: String(output.slug ?? ""),
              name: String(output.name ?? ""),
              priceCents: Number(output.priceCents ?? 0),
              available: Boolean(output.available),
            },
          ]}
          onAdded={onAdded}
        />
      );
    }
  }

  if (part.type === "tool-openProduct") {
    const output = getToolOutput(part as { type: string; output?: unknown });
    if (!isRecord(output) || typeof output.href !== "string") return null;
    const href = String(output.href);
    const slug = href.replace(/^\/item\//, "");
    return (
      <Pressable key={key} onPress={() => router.push(`/item/${slug}`)}>
        <Text style={styles.link}>Open dish</Text>
      </Pressable>
    );
  }

  if (part.type === "tool-addToCart") {
    const output = getToolOutput(part as { type: string; output?: unknown });
    if (!isRecord(output)) return null;
    if (output.ok === true) {
      return (
        <Text key={key} style={styles.success}>
          Added {String(output.name)} to your cart.
        </Text>
      );
    }
    if (output.needsCustomize === true && typeof output.slug === "string") {
      return (
        <Pressable
          key={key}
          onPress={() => router.push(`/item/${String(output.slug)}`)}
        >
          <Text style={styles.link}>Customize this dish</Text>
        </Pressable>
      );
    }
    if (typeof output.error === "string") {
      return (
        <Text key={key} style={styles.error}>
          {output.error}
        </Text>
      );
    }
  }

  return null;
}

export function AskAmakaChat() {
  const router = useRouter();
  const { refresh } = useCart();
  const transport = useMemo(() => createDinerChatTransport(), []);
  const { messages, sendMessage, setMessages, status } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  const {
    sessions,
    historyOpen,
    startNewChat,
    openHistory,
    selectSession,
    backFromHistory,
    formatWhen,
  } = useAmakaChatSessions({ messages, setMessages });
  const [input, setInput] = useState("");
  const seenAddOk = useRef(new Set<string>());

  const onAdded = () => {
    void refresh();
  };

  // Refresh cart badge when the assistant's addToCart tool succeeds.
  useEffect(() => {
    for (const message of messages) {
      for (const [index, part] of message.parts.entries()) {
        if (part.type !== "tool-addToCart") continue;
        const output = getToolOutput(part as { type: string; output?: unknown });
        if (!isRecord(output) || output.ok !== true) continue;
        const key = `${message.id}-${index}`;
        if (seenAddOk.current.has(key)) continue;
        seenAddOk.current.add(key);
        void refresh();
      }
    }
  }, [messages, refresh]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      {historyOpen ? (
        <AmakaChatHistoryPanel
          sessions={sessions}
          onBack={backFromHistory}
          onSelectSession={selectSession}
          formatWhen={formatWhen}
        />
      ) : (
        <>
          <View style={styles.toolbar}>
            <View style={styles.toolbarIdentity}>
              <AmakaAvatar size="sm" />
              <Text style={styles.toolbarTitle}>Ask Amaka</Text>
            </View>
            <AmakaChatToolbar
              disabled={busy}
              onNewChat={startNewChat}
              onOpenHistory={openHistory}
            />
          </View>
          <ScrollView
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <View style={styles.welcome}>
                <AmakaAvatar size="lg" />
                <Text style={styles.welcomeTitle}>Ask Amaka</Text>
                <Text style={[Type.meta, styles.welcomeCopy]}>
                  What are you craving today? Ask about the menu, hours, or add
                  something simple to your cart.
                </Text>
              </View>
            ) : (
              messages.map((message) =>
                message.role === "user" ? (
                  <View key={message.id} style={styles.userRow}>
                    <View style={[styles.bubble, styles.userBubble]}>
                      {message.parts.map((part, index) =>
                        renderPart(part, `${message.id}-${index}`, onAdded, router),
                      )}
                    </View>
                  </View>
                ) : (
                  <View key={message.id} style={styles.assistantRow}>
                    <AmakaAvatar size="sm" style={styles.avatar} />
                    <View style={[styles.bubble, styles.botBubble]}>
                      <Text style={styles.role}>Amaka</Text>
                      {message.parts.map((part, index) =>
                        renderPart(part, `${message.id}-${index}`, onAdded, router),
                      )}
                    </View>
                  </View>
                ),
              )
            )}
            {busy ? (
              <ActivityIndicator color={Colors.accent} style={styles.spinner} />
            ) : null}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about food or hours…"
              placeholderTextColor={Colors.textSecondary}
              editable={!busy}
              style={styles.input}
              multiline
            />
            <Button
              label="Send"
              disabled={busy || !input.trim()}
              onPress={() => {
                const text = input.trim();
                if (!text || busy) return;
                void sendMessage({ text });
                setInput("");
              }}
            />
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  toolbarIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  toolbarTitle: {
    ...Type.headline,
    fontSize: 16,
  },
  messages: {
    padding: 20,
    gap: 12,
    paddingBottom: 16,
    flexGrow: 1,
  },
  welcome: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 32,
    paddingHorizontal: 12,
  },
  welcomeTitle: {
    ...Type.headline,
    textAlign: "center",
  },
  welcomeCopy: {
    textAlign: "center",
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  userRow: {
    alignItems: "flex-end",
    alignSelf: "stretch",
  },
  avatar: {
    marginBottom: 2,
  },
  bubble: {
    borderRadius: Radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    maxWidth: "85%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: Colors.accentSoft,
    borderBottomRightRadius: Radii.sm,
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surfaceElevated,
    borderBottomLeftRadius: Radii.sm,
  },
  role: {
    ...Type.meta,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  msgText: {
    ...Type.body,
    color: Colors.text,
  },
  partBlock: { gap: 6 },
  link: {
    color: Colors.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  success: { color: Colors.success, fontSize: 14, fontWeight: "600" },
  error: { color: Colors.danger, fontSize: 14, fontWeight: "600" },
  cards: { gap: 8, marginTop: 4 },
  card: {
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardBody: { flex: 1, gap: 2 },
  cardName: { fontWeight: "700", color: Colors.text, fontSize: 14 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  addBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  addBtnBusy: { opacity: 0.6 },
  addLabel: { color: "#fff", fontWeight: "700", fontSize: 12 },
  spinner: { marginVertical: 8 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "android" ? 100 : 16,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    backgroundColor: Colors.surface,
    fontSize: 15,
  },
});
