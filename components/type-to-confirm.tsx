"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TypeToConfirmProps {
  /** The exact word the user must type, e.g. "PAUSE" or "ERASE". */
  confirmWord: string;
  /** Called with true/false whenever the match state changes, so the
   *  parent can enable/disable its action button accordingly. */
  onConfirmChange: (confirmed: boolean) => void;
  disabled?: boolean;
}

/**
 * A safeguard for high-stakes, hard-to-reverse actions (NDPR erasure,
 * pausing the entire system). Requires the user to type an exact word
 * before the calling component's action button becomes enabled - a
 * deliberate extra step that prevents a stray click from triggering an
 * action that affects every user of the system or permanently clears
 * personal data.
 */
export function TypeToConfirm({ confirmWord, onConfirmChange, disabled }: TypeToConfirmProps) {
  const [value, setValue] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    onConfirmChange(next.trim().toUpperCase() === confirmWord.toUpperCase());
  };

  const isMatch = value.trim().toUpperCase() === confirmWord.toUpperCase();

  return (
    <div className="space-y-1.5">
      <Label htmlFor="type-to-confirm" className="text-xs text-muted-foreground">
        Type <span className="font-mono font-semibold text-foreground">{confirmWord}</span> to confirm
      </Label>
      <Input
        id="type-to-confirm"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={confirmWord}
        autoComplete="off"
        className={isMatch ? "border-green-400 focus-visible:ring-green-400" : ""}
      />
    </div>
  );
}
