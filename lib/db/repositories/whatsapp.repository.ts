import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type {
  WhatsAppConversationState,
  WhatsAppSessionPayload,
} from "@/lib/domain/whatsapp/types";
import { WHATSAPP_CONVERSATION_TTL_MS } from "@/lib/domain/whatsapp/types";
import { getWhatsAppConfig } from "@/lib/integrations/whatsapp/config";

type ConversationRecord = {
  id: string;
  storeId: string;
  staffPhoneE164: string;
  state: WhatsAppConversationState;
  payload: WhatsAppSessionPayload;
  expiresAt: Date;
};

function mapConversation(record: {
  id: string;
  storeId: string;
  staffPhoneE164: string;
  state: string;
  payload: Prisma.JsonValue;
  expiresAt: Date;
}): ConversationRecord {
  return {
    id: record.id,
    storeId: record.storeId,
    staffPhoneE164: record.staffPhoneE164,
    state: record.state as WhatsAppConversationState,
    payload: (record.payload ?? {}) as WhatsAppSessionPayload,
    expiresAt: record.expiresAt,
  };
}

export const whatsappRepository = {
  async findStoreByPhoneNumberId(phoneNumberId: string) {
    const byStore = await prisma.store.findFirst({
      where: {
        whatsappEnabled: true,
        whatsappPhoneNumberId: phoneNumberId,
      },
    });

    if (byStore) {
      return byStore;
    }

    const config = getWhatsAppConfig();
    if (config?.phoneNumberId === phoneNumberId) {
      return prisma.store.findFirst({
        where: { whatsappEnabled: true },
        orderBy: { createdAt: "asc" },
      });
    }

    return null;
  },

  async isStaffAllowed(storeId: string, phoneE164: string): Promise<boolean> {
    const staffPhone = await prisma.whatsAppStaffPhone.findUnique({
      where: {
        storeId_phoneE164: {
          storeId,
          phoneE164,
        },
      },
    });

    return Boolean(staffPhone);
  },

  async listStaffPhones(storeId: string) {
    return prisma.whatsAppStaffPhone.findMany({
      where: { storeId },
      orderBy: { createdAt: "asc" },
    });
  },

  async addStaffPhone(input: { storeId: string; phoneE164: string; label?: string }) {
    return prisma.whatsAppStaffPhone.create({
      data: {
        storeId: input.storeId,
        phoneE164: input.phoneE164,
        label: input.label?.trim() || null,
      },
    });
  },

  async removeStaffPhone(storeId: string, phoneE164: string) {
    return prisma.whatsAppStaffPhone.delete({
      where: {
        storeId_phoneE164: {
          storeId,
          phoneE164,
        },
      },
    });
  },

  async getConversation(storeId: string, staffPhoneE164: string): Promise<ConversationRecord | null> {
    const record = await prisma.whatsAppConversation.findUnique({
      where: {
        storeId_staffPhoneE164: {
          storeId,
          staffPhoneE164,
        },
      },
    });

    if (!record) {
      return null;
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await prisma.whatsAppConversation.delete({ where: { id: record.id } });
      return null;
    }

    return mapConversation(record);
  },

  async saveConversation(input: {
    storeId: string;
    staffPhoneE164: string;
    state: WhatsAppConversationState;
    payload: WhatsAppSessionPayload;
  }): Promise<ConversationRecord> {
    const expiresAt = new Date(Date.now() + WHATSAPP_CONVERSATION_TTL_MS);

    const record = await prisma.whatsAppConversation.upsert({
      where: {
        storeId_staffPhoneE164: {
          storeId: input.storeId,
          staffPhoneE164: input.staffPhoneE164,
        },
      },
      create: {
        storeId: input.storeId,
        staffPhoneE164: input.staffPhoneE164,
        state: input.state,
        payload: input.payload as Prisma.InputJsonValue,
        expiresAt,
      },
      update: {
        state: input.state,
        payload: input.payload as Prisma.InputJsonValue,
        expiresAt,
      },
    });

    return mapConversation(record);
  },

  async clearConversation(storeId: string, staffPhoneE164: string): Promise<void> {
    await prisma.whatsAppConversation.deleteMany({
      where: {
        storeId,
        staffPhoneE164,
      },
    });
  },

  async updateWhatsAppSettings(
    storeId: string,
    input: {
      whatsappEnabled?: boolean;
      whatsappPhoneNumberId?: string | null;
    },
  ) {
    return prisma.store.update({
      where: { id: storeId },
      data: {
        ...(input.whatsappEnabled !== undefined
          ? { whatsappEnabled: input.whatsappEnabled }
          : {}),
        ...(input.whatsappPhoneNumberId !== undefined
          ? { whatsappPhoneNumberId: input.whatsappPhoneNumberId }
          : {}),
      },
    });
  },
};
