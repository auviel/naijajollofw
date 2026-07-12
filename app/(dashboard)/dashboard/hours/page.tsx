import { DashboardPage, DashboardPageBody, PageHeader } from "../layout";
import { HoursScheduleForm } from "@/components/features/store/hours-schedule-form";
import { PrepMinutesForm } from "@/components/features/store/prep-minutes-form";
import { getStaffStoreHours } from "@/lib/services/store/store-hours";
import { getStorePrepMinutes } from "@/lib/services/store/update-prep-minutes";

export default async function HoursPage() {
  const [{ prepMinutes, storeName }, hours] = await Promise.all([
    getStorePrepMinutes(),
    getStaffStoreHours(),
  ]);

  return (
    <DashboardPage>
      <PageHeader
        title="Hours & prep"
        description="Weekly open/closed schedule and the prep-time estimate shown while orders cook."
      />
      <DashboardPageBody>
        <div className="space-y-10">
          <HoursScheduleForm initial={hours} />
          <div className="border-t border-border pt-8">
            <h2 className="mb-4 text-base font-semibold text-foreground">
              Prep time
            </h2>
            <PrepMinutesForm
              initialPrepMinutes={prepMinutes}
              storeName={storeName}
            />
          </div>
        </div>
      </DashboardPageBody>
    </DashboardPage>
  );
}
