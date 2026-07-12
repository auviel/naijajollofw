import { userAddressRepository } from "@/lib/db/repositories/user-address.repository";
import { userAddressSchema } from "@/lib/domain/diner/validation";
import { requireDiner } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";

export async function listDinerAddresses() {
  const user = await requireDiner();
  return userAddressRepository.listForUser(user.id);
}

export async function createDinerAddress(input: unknown) {
  const user = await requireDiner();
  const parsed = userAddressSchema.parse(input);
  return userAddressRepository.create(user.id, parsed);
}

export async function updateDinerAddress(id: string, input: unknown) {
  const user = await requireDiner();
  const parsed = userAddressSchema.partial().parse(input);
  const updated = await userAddressRepository.update(id, user.id, parsed);
  if (!updated) {
    throw new AppError("NOT_FOUND", "Address not found.", 404);
  }
  return updated;
}

export async function deleteDinerAddress(id: string) {
  const user = await requireDiner();
  const deleted = await userAddressRepository.delete(id, user.id);
  if (!deleted) {
    throw new AppError("NOT_FOUND", "Address not found.", 404);
  }
  return { ok: true as const };
}
