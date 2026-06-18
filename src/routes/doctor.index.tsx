import { createFileRoute } from "@tanstack/react-router";
import { DoctorPage } from "@/components/doctor-page";

export const Route = createFileRoute("/doctor/")({
  head: () => ({
    meta: [
      { title: "Doctor visit — MedsBuddy" },
      { name: "description", content: "Premium clinical briefing for your next doctor visit." },
    ],
  }),
  component: DoctorPage,
});
