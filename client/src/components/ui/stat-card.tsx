import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  borderColor?: string;
  iconBgColor?: string;
  iconColor?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  className,
  borderColor = "border-l-blue-500",
  iconBgColor = "bg-blue-50",
  iconColor = "text-blue-500"
}: StatCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-xl p-5 border border-border/40 shadow-sm hover:shadow-md transition-all duration-300",
      "border-l-4",
      borderColor,
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
          <h3 className="text-3xl font-bold font-display text-foreground">{value}</h3>
        </div>
        <div className={cn(
          "p-3 rounded-xl flex-shrink-0",
          iconBgColor,
          iconColor
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
          <span className={cn(
            "px-2 py-0.5 rounded",
            trendUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
          )}>
            {trend}
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  );
}
