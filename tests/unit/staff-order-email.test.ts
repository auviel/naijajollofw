import { describe, expect, it } from "vitest";
import {
  mergeStaffNotifyRecipients,
  parseStaffNotifyEmailsFromEnv,
} from "@/lib/integrations/email/staff-recipients";
import {
  buildStaffNewOrderEmail,
  buildStaffOrderCancelledEmail,
} from "@/lib/integrations/email/templates";
import { summarizeOrderLineItems } from "@/lib/services/order/notify-staff-order";

describe("staff email recipients", () => {
  it("parses comma-separated env emails", () => {
    expect(
      parseStaffNotifyEmailsFromEnv(
        " kitchen@naijajollofw.ca, Owner@Example.com ,bad ",
      ),
    ).toEqual(["kitchen@naijajollofw.ca", "owner@example.com"]);
  });

  it("puts store email first and dedupes managers with env extras", () => {
    expect(
      mergeStaffNotifyRecipients({
        storeEmail: "hello@naijajollofw.ca",
        managerEmails: [
          "store.manager@delivergo.local",
          "hello@naijajollofw.ca",
        ],
        envEmails: ["hello@naijajollofw.ca", "owner@example.com"],
      }),
    ).toEqual([
      "hello@naijajollofw.ca",
      "store.manager@delivergo.local",
      "owner@example.com",
    ]);
  });
});

describe("staff order email templates", () => {
  it("builds a new-order email with escaped customer name", () => {
    const mail = buildStaffNewOrderEmail({
      storeName: "Naija Jollof Waterloo",
      orderId: "ord_1",
      customerName: `Ada <script>`,
      customerPhone: "+15195550100",
      fulfillmentType: "pickup",
      totalLabel: "$23.99",
      itemSummary: "Jollof Rice",
      dashboardUrl: "http://localhost:3000/dashboard/orders/ord_1",
    });
    expect(mail.subject).toContain("New order");
    expect(mail.html).toContain("Ada &lt;script&gt;");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("Open order");
    expect(mail.text).toContain("Ada <script>");
  });

  it("builds a cancelled email", () => {
    const mail = buildStaffOrderCancelledEmail({
      storeName: "Naija Jollof Waterloo",
      orderId: "ord_2",
      customerName: "Bo",
      totalLabel: "$10.00",
      dashboardUrl: "http://localhost:3000/dashboard/orders/ord_2",
      note: "Customer no-show",
    });
    expect(mail.subject).toContain("Order cancelled");
    expect(mail.html).toContain("Customer no-show");
    expect(mail.text).toContain("View order:");
  });
});

describe("summarizeOrderLineItems", () => {
  it("formats quantities", () => {
    expect(
      summarizeOrderLineItems([
        { name: "Jollof", quantity: 1 },
        { name: "Plantain", quantity: 2 },
      ]),
    ).toBe("Jollof, 2× Plantain");
  });
});
