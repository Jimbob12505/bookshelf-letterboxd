"use client";

import { useState, useTransition } from "react";
import { updateHandle } from "~/server/actions";

export function UsernameEditor({ currentHandle }: { currentHandle: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentHandle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (value.trim() === (currentHandle ?? "")) {
      setEditing(false);
      return;
    }
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        await updateHandle(value);
        setSuccess(true);
        setEditing(false);
        // Reload to reflect new handle in the URL / profile
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update username.");
      }
    });
  };

  const handleCancel = () => {
    setValue(currentHandle ?? "");
    setError(null);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-sans text-sage">@{currentHandle ?? "—"}</span>
        <button
          type="button"
          onClick={() => { setSuccess(false); setEditing(true); }}
          className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-charcoal/35 transition-colors hover:bg-charcoal/5 hover:text-charcoal/60"
          title="Change username"
        >
          Edit
        </button>
        {success && (
          <span className="text-[11px] font-medium text-sage">Saved!</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-charcoal/40">@</span>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setError(null);
            // Allow only alphanumeric + underscore while typing
            setValue(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          autoFocus
          placeholder="yourhandle"
          className={`w-40 rounded-lg border px-3 py-1.5 text-sm text-charcoal focus:outline-none focus:ring-2 ${
            error
              ? "border-red-300 bg-red-50 focus:ring-red-100"
              : "border-charcoal/15 bg-white focus:border-sage/50 focus:ring-sage/15"
          }`}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !value.trim()}
          className="rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-sage/85 transition-colors"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-charcoal/40 hover:text-charcoal transition-colors"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      <p className="text-[10px] text-charcoal/30">
        Letters, numbers, and underscores only · 3–30 characters
      </p>
    </div>
  );
}
