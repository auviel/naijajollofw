import { NextResponse } from "next/server";
import {
  getSquareApplicationId,
  getSquareEnvironment,
  getSquareLocationId,
  getTaxRateBps,
  isCheckoutSimulatePayments,
  isSquareConfigured,
} from "@/lib/integrations/payments/square/config";
import { getCart } from "@/lib/services/cart/cart-actions";
import { computeOrderTotals } from "@/lib/domain/order/totals";
import {
  buildScheduleDays,
  buildScheduleSlotsForDay,
} from "@/lib/domain/store/schedule-slots";
import {
  getPublicStoreHoursSchedule,
  getPublicStoreOpenStatus,
} from "@/lib/services/store/store-hours";
import { handleApiError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const [cart, openStatus, hours] = await Promise.all([
      getCart(),
      getPublicStoreOpenStatus(),
      getPublicStoreHoursSchedule(),
    ]);
    const configured = isSquareConfigured();
    const simulatePayments = isCheckoutSimulatePayments();
    const scheduleOptions = buildScheduleDays(hours.days, hours.timezone).map(
      (day) => ({
        ...day,
        slots: buildScheduleSlotsForDay({
          dateKey: day.dateKey,
          dayOfWeek: day.dayOfWeek,
          days: hours.days,
          timeZone: hours.timezone,
        }),
      }),
    );

    return NextResponse.json({
      data: {
        configured,
        simulatePayments,
        applicationId: configured ? getSquareApplicationId() : null,
        locationId: configured ? getSquareLocationId() : null,
        environment: getSquareEnvironment(),
        taxRateBps: getTaxRateBps(),
        cart,
        preview: computeOrderTotals(cart.subtotalCents, 0),
        openStatus,
        schedule: {
          timeZone: hours.timezone,
          options: scheduleOptions,
        },
        mobilePayments: {
          sourceIdFromInAppSdk: true,
          currency: "CAD",
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
