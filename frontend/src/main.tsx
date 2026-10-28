import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";

import EvolveLanding from "./Evolve-Landing.tsx";
import Layout from "./Layout.tsx";
import AuditSetup from "./Audit-Setup.tsx";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <EvolveLanding /> },
      { path: "/evolve-landing", element: <EvolveLanding /> },
      { path: "/audit-setup", element: <AuditSetup /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
