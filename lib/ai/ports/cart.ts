export type CartAddSimpleResult =
  | { ok: true; name: string; quantity: number }
  | { ok: false; needsCustomize: true; slug: string; reason: string }
  | { ok: false; error: string };

export type CartPort = {
  addSimple(input: {
    productId: string;
    quantity: number;
  }): Promise<CartAddSimpleResult>;
};
