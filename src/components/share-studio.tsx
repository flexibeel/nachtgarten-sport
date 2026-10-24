import { useEffect, useState } from "react";
import { formatNum } from "@/lib/format";
import { dataUrlToBlob, paintCard } from "@/lib/share-card";
import type { CardDesign, SharePayload } from "@/lib/types";
import { Button, MoonMark } from "@/components/ui";

const COPY: Record<CardDesign, { label: string; blurb: string }> = {
  garten: { label: "Garten", blurb: "Ruhig, zum Zeigen." },
  protokoll: { label: "Protokoll", blurb: "Jeder Satz, wie ein Beleg." },
  mond: { label: "Mond", blurb: "Die Zeit, nicht der Lärm." },
  labor: { label: "Labor", blurb: "Volumen, Dichte, Rekorde." },
};

export function ShareStudio({ payload, onClose }: { payload: SharePayload; onClose: () => void }) {
  const designs: CardDesign[] = payload.pro ? ["garten", "protokoll", "mond", "labor"] : ["garten", "protokoll", "mond"];
  const [images, setImages] = useState<Partial<Record<CardDesign, string>>>({});
  const [selected, setSelected] = useState<CardDesign>("garten");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Partial<Record<CardDesign, string>> = {};
      for (const design of designs) {
        next[design] = await paintCard(design, payload);
        if (cancelled) return;
        setImages({ ...next });
      }
    })().catch(() => {
      if (!cancelled) setNote("Die Karte konnte nicht gezeichnet werden.");
    });
    return () => {
      cancelled = true;
    };
    // payload identity is stable for a finished session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  const current = images[selected];

  function download(url: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = `nachtgarten-${new Date(payload.when).toISOString().slice(0, 10)}.jpg`;
    link.click();
  }

  async function share() {
    if (!current) return;
    try {
      const blob = await dataUrlToBlob(current);
      const file = new File([blob], "nachtgarten.jpg", { type: "image/jpeg" });
      const text = `${payload.athlete} · ${payload.setCount} Sätze · ${formatNum(payload.volume)} kg`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Nachtgarten Sport", text });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    download(current);
    setNote("Teilen geht hier nicht. Die Karte liegt im Download.");
  }

  return (
    <div className="scroll-pad mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-8">
      <p className="eyebrow text-accent">Geschafft</p>
      <h1 className="mt-2 font-display text-5xl italic leading-none">
        {payload.prs.length > 0 ? "Neuer Rekord" : "Sauber"}
      </h1>
      <p className="mt-3 text-muted">
        {payload.setCount} {payload.setCount === 1 ? "Satz" : "Sätze"} · {formatNum(payload.volume)} kg
        {payload.prs.length > 0 ? ` · ${payload.prs.length} Rekorde` : ""}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {designs.map((design) => (
          <button
            key={design}
            type="button"
            onClick={() => setSelected(design)}
            className={
              selected === design
                ? "min-h-11 rounded-full bg-accent px-4 text-sm text-ink"
                : "min-h-11 rounded-full border border-line px-4 text-sm text-muted"
            }
          >
            {COPY[design].label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{COPY[selected].blurb}</p>

      <div className="mt-4 overflow-hidden rounded-card border border-line bg-surface">
        {current ? (
          <img src={current} alt={`Karte ${COPY[selected].label}`} className="aspect-[3/4] w-full object-cover" />
        ) : (
          <div className="flex aspect-[3/4] flex-col items-center justify-center gap-4">
            <MoonMark className="size-16 text-accent" />
            <p className="text-sm text-muted">Karte wird gesetzt</p>
          </div>
        )}
      </div>

      {note ? <p className="mt-3 text-sm text-accent">{note}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button tone="ghost" disabled={!current} onClick={() => current && download(current)}>
          Sichern
        </Button>
        <Button disabled={!current} onClick={() => void share()}>
          Teilen
        </Button>
      </div>
      <Button tone="quiet" full className="mt-2" onClick={onClose}>
        Fertig
      </Button>
    </div>
  );
}
