"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface InfoTooltipProps {
  text: string;
}

/**
 * A small "?" icon that shows a plain-English explanation on hover/focus.
 * Used next to technical terms (CID, SHA-256, holder identity hash) on
 * public-facing pages, since the real audience there includes non-
 * technical employers, NYSC officials, and graduates who have no reason
 * to already know what these terms mean.
 */
export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center align-middle text-muted-foreground hover:text-primary transition-colors"
          aria-label="More information"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
