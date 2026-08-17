"use client";

// A themed segmented toggle used across the create/join flows.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="glass rounded-xl p-1 flex gap-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm transition text-center ${
              active
                ? "btn-gold"
                : "text-parchment hover:text-gold-100 hover:bg-white/5"
            }`}
          >
            <div className="font-medium">{o.label}</div>
            {o.hint && (
              <div
                className={`text-[10px] ${active ? "text-onyx-900/70" : "text-muted"}`}
              >
                {o.hint}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
