import React from "react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    className?: string;
}

const PRESET_COLORS = [
    "#6b7280", // Gray (default)
    "#ef4444", // Red
    "#f59e0b", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
    "#ec4899", // Pink
];

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
    return (
        <div className={cn("flex gap-2 items-center flex-wrap", className)}>
            {PRESET_COLORS.map((color) => (
                <button
                    key={color}
                    type="button"
                    onClick={() => onChange(color)}
                    className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                        value === color ? "border-foreground ring-2 ring-offset-2 ring-foreground/20" : "border-border"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                />
            ))}
            <div className="flex items-center gap-2 ml-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground font-mono">{value}</span>
            </div>
        </div>
    );
}
