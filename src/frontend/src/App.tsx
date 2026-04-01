import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { AdminPage } from "./pages/AdminPage";
import { LandingPage } from "./pages/LandingPage";
import { TradingPage } from "./pages/TradingPage";

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster theme="dark" position="top-right" />
    </>
  );
}

function HomePage() {
  const { identity, isInitializing } = useInternetIdentity();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
            style={{
              borderTopColor: "oklch(0.85 0.2 168)",
              borderRightColor: "oklch(0.57 0.28 300)",
            }}
          />
          <span className="text-xs text-muted-foreground">
            Loading AV PLAY...
          </span>
        </div>
      </div>
    );
  }

  if (!identity) {
    return <LandingPage />;
  }

  return <TradingPage />;
}

const rootRoute = createRootRoute({ component: RootLayout });
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([homeRoute, adminRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
