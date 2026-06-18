import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor visit — MedsBuddy" },
      { name: "description", content: "Premium clinical briefing for your next doctor visit." },
    ],
  }),
  component: DoctorLayout,
});

function DoctorLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
