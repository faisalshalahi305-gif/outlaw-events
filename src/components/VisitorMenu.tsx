import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Home, MoreVertical, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SuggestionsDialog } from "@/components/SuggestionsDialog";

type VisitorMenuProps = {
  visitorNumber: number | null;
  /** Optional side effect fired when the trigger is pressed. */
  onTriggerPress?: () => void;
};

/**
 * Top-right menu: default avatar + visitor label, then the main navigation
 * entries of the site.
 */
export function VisitorMenu({ visitorNumber, onTriggerPress }: VisitorMenuProps) {
  const label = visitorNumber ? `الزائر-${visitorNumber}` : "الزائر-...";
  const [suggestOpen, setSuggestOpen] = useState(false);

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="قائمة الزائر"
          onClick={onTriggerPress}
          className="surface-card rounded-full border border-primary/35 p-2 text-primary/80 transition-all hover:border-primary hover:text-primary hover:shadow-[var(--shadow-elegant)]"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>


      <DropdownMenuContent
        align="start"
        
        sideOffset={10}
        className="surface-card w-60 rounded-2xl border-primary/30 p-2 shadow-[var(--shadow-elegant)]"
      >
        <div className="flex items-center gap-3 rounded-xl px-2 py-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/50 bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </span>
          <span className="flex flex-col text-right">
            <span className="text-sm font-extrabold text-foreground">{label}</span>
            <span className="text-[11px] tracking-widest text-muted-foreground">OUTLAW</span>
          </span>
        </div>

        <div className="ornament-line mx-2 my-1" />
        <DropdownMenuSeparator className="opacity-0" />

        <DropdownMenuItem asChild className="cursor-pointer rounded-xl px-3 py-2.5">
          <Link to="/" className="flex w-full items-center gap-3 text-right font-bold">
            <Home className="h-4 w-4 text-primary" />
            الصفحة الرئيسية
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <SuggestionsDialog
      open={suggestOpen}
      onOpenChange={setSuggestOpen}
      visitorNumber={visitorNumber}
    />
    </>
  );

}
