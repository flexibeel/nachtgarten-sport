import { useState } from "react";
import { cn } from "@/lib/cn";

export function ExerciseVisual({
  src,
  name,
  className,
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [ok, setOk] = useState(true);
  return (
    <div className={cn("relative overflow-hidden bg-raised", className)}>
      <div className="absolute inset-0">
        <span aria-hidden className="absolute bottom-3 left-3 font-display text-5xl italic text-accent">{name.slice(0, 1)}</span>
        <svg className="absolute -right-6 -top-8 size-36 text-accent" viewBox="0 0 100 100" aria-hidden>
          <circle cx="58" cy="42" r="28" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      </div>
      {src && ok ? (
        <img
          src={src}
          alt=""
          className="photo-drift absolute inset-0 h-full w-full object-cover"
          onError={() => setOk(false)}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
    </div>
  );
}
