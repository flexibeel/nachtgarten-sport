import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { App } from "@/components/app";
import { hydrateSettings } from "@/lib/settings";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  useEffect(() => {
    hydrateSettings();
  }, []);
  return <App />;
}
