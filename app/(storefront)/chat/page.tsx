import { AskAmakaChatPage } from "@/components/features/ai/ask-amaka-chat-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask Amaka",
  description: "Chat with Amaka for menu help, store hours, and cart assist.",
};

export default function ChatPage() {
  return <AskAmakaChatPage />;
}
