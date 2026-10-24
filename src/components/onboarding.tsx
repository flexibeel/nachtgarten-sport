import { useState } from "react";
import { MoonMark, Button, Field } from "@/components/ui";
import { updateSettings } from "@/lib/settings";

export function Onboarding() {
  const [name, setName] = useState("");

  function save() {
    const next = name.trim();
    if (!next) return;
    updateSettings({ name: next });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-24">
      <MoonMark className="rise size-16 text-accent" />
      <p className="eyebrow rise rise-2 mt-10 text-accent">Nachtgarten</p>
      <h1 className="rise rise-2 mt-3 font-display text-5xl italic leading-tight">Wie soll ich dich nennen?</h1>
      <p className="rise rise-3 mt-4 text-muted">Nur auf diesem Gerät. Kein Konto, keine Cloud.</p>
      <form
        className="rise rise-4 mt-8"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Field
          autoFocus
          autoComplete="nickname"
          placeholder="Name oder Alias"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Name oder Alias"
        />
        <Button full className="mt-4" type="submit" disabled={!name.trim()}>
          Weiter
        </Button>
      </form>
    </div>
  );
}
