import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/talk")({
  component: () => (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">Talk Layout</h1>
      <Outlet />
    </div>
  ),
});
