import type { StoreProfile } from "@/lib/domain/store/types";
import { absoluteUrl } from "@/lib/seo/site";

export type StorefrontFaqEntry = {
  question: string;
  answer: string;
};

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const local = digits.slice(1);
    return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function buildStorefrontFaqEntries(input: {
  store: StoreProfile;
  prepMinutes: number;
  todayLabel?: string;
}): StorefrontFaqEntry[] {
  const { store, prepMinutes, todayLabel } = input;
  const phoneLabel = formatPhone(store.phone);
  const hoursLine = todayLabel
    ? `Today's hours are ${todayLabel}.`
    : "Check the status at the top of the page for today's hours.";
  const hoursUrl = absoluteUrl("/hours");

  return [
    {
      question: "Do you offer pickup and delivery?",
      answer: `Yes. At checkout you can choose pickup at ${store.name} in ${store.city}, or delivery to your address.`,
    },
    {
      question: "What are your hours?",
      answer: `${hoursLine} You can still browse the menu and add items when we're closed — pick a pickup or delivery time at checkout. See ${hoursUrl} for the full week.`,
    },
    {
      question: "How long until my order is ready?",
      answer: `Most orders are ready in about ${prepMinutes} minutes once accepted. Delivery adds travel time after the kitchen finishes preparing your food.`,
    },
    {
      question: "Can I schedule an order for later?",
      answer:
        "Yes. When the restaurant is closed, you'll choose a time at checkout. When we're open, you can order ASAP or pick a later slot.",
    },
    {
      question: "How do I pay?",
      answer:
        "Pay online at checkout with a card. You'll get an order confirmation and can track status from the link we provide after payment.",
    },
    {
      question: "What about special or pre-order only items?",
      answer:
        "Items marked for special or pre-order may need advance notice. Choose those from the menu, then we'll confirm timing when we accept your order — or call us if you need a large catering tray.",
    },
    {
      question: "How can I contact the restaurant?",
      answer: `Call ${store.name} at ${phoneLabel}. For order issues after checkout, use the phone number on your confirmation or call the restaurant directly.`,
    },
  ];
}
