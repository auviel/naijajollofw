export type CartLineSummary = {
  lineId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  lineTotalCents: number;
  available: boolean;
};

export type CartSummary = {
  itemCount: number;
  subtotalCents: number;
  currency: string;
  sessionId: string | null;
  lines: CartLineSummary[];
};

export type CartAddSimpleResult =
  | {
      ok: true;
      name: string;
      quantity: number;
      sessionId: string | null;
      itemCount: number;
      subtotalCents: number;
    }
  | { ok: false; needsCustomize: true; slug: string; reason: string }
  | { ok: false; error: string };

export type CartMutationResult =
  | {
      ok: true;
      sessionId: string | null;
      itemCount: number;
      subtotalCents: number;
      message: string;
    }
  | { ok: false; error: string };

export type CartPort = {
  getSummary(): Promise<CartSummary>;
  addSimple(input: {
    productId: string;
    quantity: number;
  }): Promise<CartAddSimpleResult>;
  updateLine(input: {
    lineId: string;
    quantity: number;
  }): Promise<CartMutationResult>;
  removeLine(input: { lineId: string }): Promise<CartMutationResult>;
};
