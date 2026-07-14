import { customerRepository } from "@/lib/db/repositories/customer.repository";
import { orderRepository } from "@/lib/db/repositories/order.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { AppError } from "@/lib/utils/errors";

/**
 * Ensure a diner User is linked to a store Customer (phone-keyed).
 * Creates the Customer if missing; refuses to steal a Customer already linked
 * to a different User. Claims prior guest orders onto the diner account.
 */
export async function ensureCustomerForDiner(input: {
  userId: string;
  storeId: string;
  name: string;
  phoneE164: string;
}): Promise<string> {
  const user = await userRepository.findById(input.userId);
  if (!user || user.role !== "DINER" || user.storeId !== input.storeId) {
    throw new AppError("FORBIDDEN", "Diner account required", 403);
  }

  let customerId: string;

  if (user.customerId) {
    customerId = user.customerId;
  } else {
    const existing = await customerRepository.findByPhone(
      input.storeId,
      input.phoneE164,
    );

    if (existing) {
      const linked = await userRepository.findByCustomerId(existing.id);
      if (linked && linked.id !== input.userId) {
        throw new AppError(
          "CONFLICT",
          "This phone number is already linked to another account.",
          409,
        );
      }
      await userRepository.linkCustomer(input.userId, existing.id);
      customerId = existing.id;
    } else {
      const created = await customerRepository.createFromContact({
        storeId: input.storeId,
        name: input.name,
        phoneE164: input.phoneE164,
      });
      await userRepository.linkCustomer(input.userId, created.id);
      customerId = created.id;
    }
  }

  await orderRepository.claimGuestOrdersForUser({
    userId: input.userId,
    storeId: input.storeId,
    customerId,
    email: user.email,
  });

  return customerId;
}

/**
 * Upsert a Customer for an order contact (guest or diner).
 * When dinerUserId is set, also links User.customerId.
 */
export async function resolveCustomerForOrder(input: {
  storeId: string;
  name: string;
  phoneE164: string;
  dinerUserId?: string | null;
}): Promise<string> {
  if (input.dinerUserId) {
    return ensureCustomerForDiner({
      userId: input.dinerUserId,
      storeId: input.storeId,
      name: input.name,
      phoneE164: input.phoneE164,
    });
  }

  const existing = await customerRepository.findByPhone(
    input.storeId,
    input.phoneE164,
  );
  if (existing) {
    if (existing.name !== input.name.trim()) {
      await customerRepository.update(existing.id, input.storeId, {
        name: input.name.trim(),
      });
    }
    return existing.id;
  }

  const created = await customerRepository.createFromContact({
    storeId: input.storeId,
    name: input.name,
    phoneE164: input.phoneE164,
  });
  return created.id;
}
