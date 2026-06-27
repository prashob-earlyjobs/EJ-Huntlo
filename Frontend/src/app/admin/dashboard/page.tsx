import { Suspense } from "react";

import { AdminDashboardPage } from "./AdminDashboardPageContent";

export default function AdminDashboardPageRoute() {
  return (
    <Suspense fallback={null}>
      <AdminDashboardPage />
    </Suspense>
  );
}
