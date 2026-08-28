import { apiFetch } from "@/lib/api";
import { createDinerChatTransport } from "@/lib/ai-chat-transport";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { AmakaAvatar } from "@/components/amaka-avatar";
import {
  AmakaChatHistoryPanel,
  AmakaChatToolbar,
} from "@/components/amaka-chat-menu";
import { parseChatTextSegments } from "@/lib/format-chat-text";
import { getChatPendingState, type ChatPendingLabel } from "@/lib/chat-pending-state";
import { useAmakaChatSessions } from "@/lib/use-amaka-chat-sessions";
import { formatCadFromCents } from "@naijajollof/api-types";
import { Button, Colors, Radii, Type } from "@naijajollof/ui";
import { Ionicons } from "@expo/vector-icons";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
  price: string;
  available: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cardPriceFromTool(row: Record<string, unknown>): string {
  if (typeof row.price === "string" && row.price.trim()) return row.price.trim();
  if (typeof row.priceCents === "number" && Number.isFinite(row.priceCents)) {
    return formatCadFromCents(row.priceCents);
  }
  return "";
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
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());

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
      setAddedIds((current) => new Set(current).add(item.id));
      onAdded();
    } catch {
      // Keep UI calm; diner can retry from cart or customize.
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) return null;

  const validItems = items.filter((item) => {
    const slug = item.slug?.trim();
    return Boolean(item.id) && Boolean(slug) && slug !== "undefined";
  });

  if (validItems.length === 0) return null;

  return (
    <View style={styles.cards}>
      {validItems.map((item) => {
        const added = addedIds.has(item.id);
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={Type.meta}>
                {item.price}
                {!item.available ? " · Sold out" : null}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <Pressable
                onPress={() => router.push(`/item/${item.slug.trim()}`)}
                style={styles.viewBtn}
              >
                <Ionicons name="eye-outline" size={14} color={Colors.text} />
                <Text style={styles.viewLabel}>View dish</Text>
              </Pressable>
              {item.available ? (
                <Pressable
                  disabled={pendingId === item.id || added}
                  onPress={() => void addItem(item)}
                  style={[
                    styles.addBtn,
                    added && styles.addBtnDone,
                    (pendingId === item.id || added) && styles.addBtnBusy,
                  ]}
                >
                  {added ? (
                    <>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                      <Text style={styles.addLabel}>Added</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="bag-outline" size={14} color="#fff" />
                      <Text style={styles.addLabel}>
                        {pendingId === item.id ? "Adding…" : "Add to cart"}
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ChatMessageText({ text }: { text: string }) {
  const segments = parseChatTextSegments(text);
  return (
    <Text style={styles.msgText}>
      {segments.map((segment, index) => (
        <Text
          key={index}
          style={segment.bold ? [styles.msgText, styles.msgBold] : styles.msgText}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

function AssistantTextPart({
  text,
  router,
}: {
  text: string;
  router: ReturnType<typeof useRouter>;
}) {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && Boolean(user);
  const suggestsSignIn =
    /sign\s*in|\/signin|saved card|my address|place (an )?order/i.test(text);
  const suggestsCheckout =
    /checkout|place (an )?order|proceed with checkout/i.test(text);

  return (
    <View style={styles.partBlock}>
      <ChatMessageText text={text} />
      {isLoggedIn && suggestsCheckout ? (
        <Pressable onPress={() => router.push("/checkout")}>
          <Text style={styles.link}>Go to checkout</Text>
        </Pressable>
      ) : null}
      {!isLoggedIn && suggestsSignIn ? (
        <Pressable onPress={() => router.push("/login")}>
          <Text style={styles.link}>Sign in</Text>
        </Pressable>
      ) : null}
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
    return (
      <AssistantTextPart key={key} text={part.text} router={router} />
    );
  }

  if (part.type === "tool-searchCatalog" || part.type === "tool-getProduct") {
    const output = getToolOutput(part as { type: string; output?: unknown });
    if (!isRecord(output)) return null;

    if (part.type === "tool-searchCatalog" && Array.isArray(output.items)) {
      if (output.empty === true || output.items.length === 0) return null;
      const items = output.items.filter(isRecord).map((row) => ({
        id: String(row.id ?? ""),
        slug: String(row.slug ?? ""),
        name: String(row.name ?? ""),
        price: cardPriceFromTool(row),
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
              price: cardPriceFromTool(output),
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
    if (href.includes("/undefined") || href.includes("/null")) return null;
    const slug = href.replace(/^\/item\//, "").trim();
    if (!slug || slug === "undefined" || slug === "null") return null;
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

function MobileTypingIndicator({ label }: { label: ChatPendingLabel }) {
  return (
    <View
      style={styles.assistantRow}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <AmakaAvatar size="sm" style={styles.avatar} />
      <View style={[styles.bubble, styles.botBubble, styles.typingBubble]}>
        <Text style={styles.typingLabel}>{label}</Text>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.typingDot} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function AskAmakaChat() {
  const router = useRouter();
  const { refresh } = useCart();
  const transport = useMemo(() => createDinerChatTransport(), []);
  const { messages, sendMessage, setMessages, status } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  const pending = getChatPendingState(status, messages);
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
  const inputRef = useRef<TextInput>(null);
  const refocusAfterReplyRef = useRef(false);
  const seenAddOk = useRef(new Set<string>());
  const wasBusyRef = useRef(busy);

  useEffect(() => {
    if (wasBusyRef.current && !busy && refocusAfterReplyRef.current) {
      refocusAfterReplyRef.current = false;
      inputRef.current?.focus();
    }
    wasBusyRef.current = busy;
  }, [busy]);

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
                      {message.parts.map((part, index) =>
                        renderPart(part, `${message.id}-${index}`, onAdded, router),
                      )}
                    </View>
                  </View>
                ),
              )
            )}
            {pending ? <MobileTypingIndicator label={pending.label} /> : null}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={pending?.label ?? "Ask about food or hours…"}
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
                refocusAfterReplyRef.current = true;
                void sendMessage({ text });
                setInput("");
                inputRef.current?.focus();
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
  msgText: {
    ...Type.body,
    color: Colors.text,
  },
  msgBold: {
    fontWeight: "700",
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
    borderRadius: Radii.lg,
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 12,
    gap: 12,
  },
  cardBody: { gap: 2 },
  cardName: { fontWeight: "700", color: Colors.text, fontSize: 14 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  viewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 36,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
  },
  viewLabel: { color: Colors.text, fontWeight: "700", fontSize: 12 },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 36,
    backgroundColor: Colors.accent,
    borderRadius: Radii.md,
    paddingHorizontal: 10,
  },
  addBtnDone: { backgroundColor: Colors.success },
  addBtnBusy: { opacity: 0.6 },
  addLabel: { color: "#fff", fontWeight: "700", fontSize: 12 },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  typingLabel: {
    ...Type.meta,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    opacity: 0.75,
  },
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
