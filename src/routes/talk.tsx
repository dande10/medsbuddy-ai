import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/talk")({
  head: () => ({
    meta: [
      { title: "Prepare Visit — MedsBuddy" },
      {
        name: "description",
        content: "Prepare approved patient context before a doctor visit.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
