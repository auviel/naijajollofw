import { z } from "zod";
import { requireStoreManager } from "@/lib/auth/session";
import { storeRepository, mapStoreToProfile } from "@/lib/db/repositories/store.repository";
import { whatsappRepository } from "@/lib/db/repositories/whatsapp.repository";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError, AppError } from "@/lib/utils/errors";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

const updateWhatsAppSettingsSchema = z.object({
  whatsappEnabled: z.boolean().optional(),
  whatsappPhoneNumberId: z.string().trim().min(1).nullable().optional(),
});

const addStaffPhoneSchema = z.object({
  phone: z.string().min(10, "Valid phone number is required"),
  label: z.string().trim().optional(),
});

export async function GET() {
  try {
    const user = await requireStoreManager();
    const [profile, staffPhones] = await Promise.all([
      storeRepository.getProfileById(user.storeId),
      whatsappRepository.listStaffPhones(user.storeId),
    ]);

    if (!profile) {
      throw new AppError("NOT_FOUND", "Store not found", 404);
    }

    return Response.json({
      data: {
        whatsappEnabled: profile.whatsappEnabled,
        whatsappPhoneNumberId: profile.whatsappPhoneNumberId ?? null,
        staffPhones: staffPhones.map((phone) => ({
          id: phone.id,
          phoneE164: phone.phoneE164,
          label: phone.label,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireStoreManager();
    const body = await parseJsonBody(request, updateWhatsAppSettingsSchema);

    const updated = await whatsappRepository.updateWhatsAppSettings(user.storeId, {
      ...(body.whatsappEnabled !== undefined
        ? { whatsappEnabled: body.whatsappEnabled }
        : {}),
      ...(body.whatsappPhoneNumberId !== undefined
        ? { whatsappPhoneNumberId: body.whatsappPhoneNumberId }
        : {}),
    });

    return Response.json({ data: mapStoreToProfile(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStoreManager();
    const body = await parseJsonBody(request, addStaffPhoneSchema);
    const phoneE164 = normalizeCanadianPhone(body.phone);

    if (!phoneE164) {
      throw new AppError("VALIDATION_ERROR", "Enter a valid Canadian phone number", 400);
    }

    const staffPhone = await whatsappRepository.addStaffPhone({
      storeId: user.storeId,
      phoneE164,
      label: body.label,
    });

    return Response.json({
      data: {
        id: staffPhone.id,
        phoneE164: staffPhone.phoneE164,
        label: staffPhone.label,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireStoreManager();
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");

    if (!phone) {
      throw new AppError("VALIDATION_ERROR", "Phone query parameter is required", 400);
    }

    const phoneE164 = normalizeCanadianPhone(phone);
    if (!phoneE164) {
      throw new AppError("VALIDATION_ERROR", "Enter a valid Canadian phone number", 400);
    }

    await whatsappRepository.removeStaffPhone(user.storeId, phoneE164);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
