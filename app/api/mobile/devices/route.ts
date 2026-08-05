import {
  registerPushDevice,
  unregisterPushDevice,
} from "@/lib/services/push/register-device";
import { parseJsonBody } from "@/lib/utils/api-request";
import { handleApiError } from "@/lib/utils/errors";
import {
  registerPushDeviceSchema,
  unregisterPushDeviceSchema,
} from "@/lib/domain/auth/mobile";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, registerPushDeviceSchema);
    const device = await registerPushDevice(body);
    return NextResponse.json({ data: { id: device.id } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await parseJsonBody(request, unregisterPushDeviceSchema);
    const data = await unregisterPushDevice(body);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
