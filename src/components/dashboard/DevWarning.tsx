import { AlertTriangle } from "lucide-react";

export function DevWarning({ text }: { text: string }) {
  return (
<div className="flex items-center gap-2 border-2 border-primary border-dashed rounded-xl p-2 bg-primary/5">
<AlertTriangle className="w-7 h-7 text-primary" />
<p className="text-sm text-muted-foreground">
  {text}
</p>
</div>
  );
}