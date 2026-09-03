import { z } from "zod";

/** Order primary keys are usually cuid(), but seeds/tests may use stable string ids. */
export const orderIdParamSchema = z
  .string()
  .min(1, "Order id required")
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid order id");
