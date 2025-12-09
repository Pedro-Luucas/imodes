import { Card } from '@/components/ui/card';

export function PatientsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 pt-6 pb-16 px-4 md:px-8 xl:px-40">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-3 px-1 md:px-6 md:flex-row md:items-center md:justify-between">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="hidden md:flex items-center gap-2">
          <div className="h-10 w-36 bg-muted animate-pulse rounded-md" />
        </div>
      </div>

      {/* Total Patients */}
      <div className="px-1 sm:px-6">
        <div className="flex flex-col gap-1">
          <div className="h-3 w-28 bg-muted animate-pulse rounded" />
          <div className="h-12 w-16 bg-muted animate-pulse rounded mt-1" />
          <div className="h-4 w-44 bg-muted animate-pulse rounded mt-1" />
        </div>
      </div>

      {/* Assignments Section */}
      <div className="px-1 sm:px-6">
        <div className="h-7 w-28 bg-muted animate-pulse rounded mb-4" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card
              key={i}
              className="border border-input rounded-2xl p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4">
                {/* Patient Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted animate-pulse rounded-full" />
                    <div className="flex flex-col gap-1.5">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="flex items-center gap-1">
                        <div className="w-3.5 h-3.5 bg-muted animate-pulse rounded-sm" />
                        <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="h-7 w-16 bg-muted animate-pulse rounded-full" />
                </div>

                {/* Patient Stats */}
                <div className="flex flex-col divide-y divide-input rounded-xl border border-input">
                  <div className="flex items-center justify-between px-4 py-2">
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-8 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="flex items-center justify-between px-4 py-2">
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="flex items-center justify-between px-4 py-2">
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-14 bg-muted animate-pulse rounded" />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 md:flex-row">
                  <div className="h-11 w-full bg-muted animate-pulse rounded-md" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
