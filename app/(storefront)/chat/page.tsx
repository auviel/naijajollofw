import { AskAmakaChatPage } from "@/components/features/ai/ask-amaka-chat-page";
import type { Metadata } from "next";
import { buildShareMetadata } from "@/lib/seo/share-metadata";

export const metadata: Metadata = buildShareMetadata({
  title: "Ask Amaka",
  description:
    "Chat with Amaka for menu help, store hours, and cart assist at Naija Jollof Waterloo.",
  path: "/chat",
});

export default function ChatPage() {
  return <AskAmakaChatPage />;
}
