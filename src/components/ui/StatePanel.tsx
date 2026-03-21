import React from "react";
import { AlertTriangle, Info, LoaderCircle } from "lucide-react";
import { Button } from "./Button";

type StateTone = "loading" | "empty" | "error";

interface StatePanelProps {
  tone?: StateTone;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

const toneStyles = {
  loading: {
    panel: "border-logo-primary/20 bg-logo-primary/[0.06]",
    iconWrap: "bg-logo-primary/14 text-logo-primary",
    icon: LoaderCircle,
    iconClass: "animate-spin",
  },
  empty: {
    panel: "border-white/8 bg-white/[0.03]",
    iconWrap: "bg-white/[0.06] text-white/70",
    icon: Info,
    iconClass: "",
  },
  error: {
    panel: "border-red-400/20 bg-red-500/10",
    iconWrap: "bg-red-500/16 text-red-300",
    icon: AlertTriangle,
    iconClass: "",
  },
} as const;

export const StatePanel: React.FC<StatePanelProps> = ({
  tone = "empty",
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  className = "",
}) => {
  const toneStyle = toneStyles[tone];
  const Icon = toneStyle.icon;

  return (
    <div
      className={`rounded-2xl border ${toneStyle.panel} ${
        compact ? "px-4 py-4" : "px-5 py-5"
      } ${className}`}
    >
      <div className={`flex ${compact ? "items-center gap-3" : "items-start gap-4"}`}>
        <div
          className={`flex shrink-0 items-center justify-center rounded-full ${toneStyle.iconWrap} ${
            compact ? "h-9 w-9" : "h-11 w-11"
          }`}
        >
          <Icon className={`h-5 w-5 ${toneStyle.iconClass}`} />
        </div>
        <div className="min-w-0">
          <p className={`${compact ? "text-[14px]" : "text-[15px]"} font-semibold text-white/92`}>
            {title}
          </p>
          {description ? (
            <p
              className={`mt-1 ${compact ? "text-[13px]" : "text-[14px]"} leading-6 text-white/62`}
            >
              {description}
            </p>
          ) : null}
          {actionLabel && onAction ? (
            <Button
              className="mt-4"
              onClick={onAction}
              size={compact ? "sm" : "md"}
              variant={tone === "error" ? "secondary" : "primary"}
              type="button"
            >
              {actionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
