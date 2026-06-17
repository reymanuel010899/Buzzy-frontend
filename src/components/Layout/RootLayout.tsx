import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import RefreshFAB from "./RefreshFAB";
import { useDeepLink } from "../../hooks/useDeepLink";

// Fallback ligero mientras llega un chunk lazy: fondo del color de la app, sin
// flash blanco ni spinner pesado. El feed (eager) nunca lo dispara.
const RouteFallback = () => <div className="h-screen w-screen bg-[#020412]" />;

const RootLayout = () => {
  useDeepLink();
  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
      <RefreshFAB />
    </>
  );
};

export default RootLayout;
