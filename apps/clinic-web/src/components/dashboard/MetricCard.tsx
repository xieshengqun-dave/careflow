import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TINTS = {
  primary: "bg-cf-primary-50 text-cf-primary-700",
  green: "bg-cf-green-50 text-cf-green-600",
  purple: "bg-cf-purple-50 text-cf-purple-600",
  amber: "bg-cf-amber-50 text-cf-amber-700",
} as const;

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  tint?: keyof typeof TINTS;
  trend?: { label: string; up?: boolean };
}

export function MetricCard({ title, value, description, icon, tint = "primary", trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", TINTS[tint])}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {trend && (
          <p className={cn("text-xs mt-1 font-medium", trend.up ? "text-cf-green-600" : "text-slate-400")}>
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
