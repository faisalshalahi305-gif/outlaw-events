import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { requireAdmin } from "@/lib/gate.functions";
import { readAccessToken, readVisitorToken } from "@/lib/gate-identity";

export const Route = createFileRoute("/control")({
  // Access is granted by a DB-backed token held by the verified visitor,
  // so the check must run in the browser where that token lives.
  ssr: false,
  beforeLoad: async () => {
    const { admin, visitorNumber } = await requireAdmin({
      data: { accessToken: readAccessToken(), visitorToken: readVisitorToken() },
    });
    if (!admin) throw redirect({ to: "/gate" });
    return { admin, visitorNumber };
  },
  component: () => <Outlet />,
});
