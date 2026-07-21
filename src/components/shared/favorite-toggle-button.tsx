"use client";

import * as React from "react";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

interface FavoriteToggleButtonProps {
  label: string;
  defaultFavorite?: boolean;
  className?: string;
}

export function FavoriteToggleButton({
  label,
  defaultFavorite = false,
  className,
}: FavoriteToggleButtonProps) {
  const t = useTranslations();
  const [isFavorite, setIsFavorite] = React.useState(defaultFavorite);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={
        isFavorite ? t.quickTools.removeFavorite(label) : t.quickTools.addFavorite(label)
      }
      aria-pressed={isFavorite}
      onClick={() => setIsFavorite((prev) => !prev)}
      className={cn(
        "text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 aria-pressed:text-amber-500 aria-pressed:opacity-100",
        className
      )}
    >
      <Star className={cn("size-4", isFavorite && "fill-amber-400 text-amber-500")} aria-hidden="true" />
    </Button>
  );
}
