type PatientDetailPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function PatientDetailPage({
  params,
}: PatientDetailPageProps) {
  const { id } = await params;
  
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Patient ID</p>
        <h1 className="text-3xl font-semibold text-foreground">{id}</h1>
      </div>
      <p className="max-w-md text-sm text-muted-foreground">
        Patient details will live here. Use this route to build the dedicated
        mobile view when ready.
      </p>
    </div>
  );
}

