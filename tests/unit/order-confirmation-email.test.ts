import { describe, expect, it } from "vitest";
import { buildOrderConfirmationEmail } from "@/lib/integrations/email/templates";

describe("order confirmation email", () => {
  it("includes a receipt breakdown", () => {
    const mail = buildOrderConfirmationEmail({
      customerName: "Val Schedule",
      storeName: "Naija Jollof Waterloo",
      fulfillmentType: "delivery",
      trackUrl: "https://naijajollofw.ca/orders/demo?token=abc",
      scheduledLabel: "Wednesday, Aug 5, 2:00 p.m.",
      displayNumber: "NJ-1003",
      dropoffAddress: "123 King St W, Kitchener",
      lines: [
        {
          name: "Jollof Rice, Plantain and Chicken",
          quantity: 1,
          lineTotalCents: 2400,
          modifierNames: ["Extra plantain"],
        },
      ],
      subtotalCents: 2400,
      taxCents: 312,
      totalCents: 2712,
    });

    expect(mail.subject).toContain("NJ-1003");
    expect(mail.html).toContain("1× Jollof Rice, Plantain and Chicken");
    expect(mail.html).toContain("Extra plantain");
    expect(mail.html).toContain("Subtotal");
    expect(mail.html).toContain("Tax");
    expect(mail.html).toContain("Total");
    expect(mail.html).toContain("$24.00");
    expect(mail.html).toContain("$3.12");
    expect(mail.html).toContain("$27.12");
    expect(mail.html).toContain("Delivering to 123 King St W, Kitchener");
    expect(mail.html).not.toContain("Total $27.12.");
    expect(mail.text).toContain("Subtotal  $24.00");
    expect(mail.text).toContain("Tax  $3.12");
    expect(mail.text).toContain("Total  $27.12");
    expect(mail.text).toContain("Extra plantain");
  });
});
