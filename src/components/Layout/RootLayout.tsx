import { Outlet } from "react-router-dom";
import RefreshFAB from "./RefreshFAB";
import { useDeepLink } from "../../hooks/useDeepLink";

const RootLayout = () => {
  useDeepLink();
  return (
    <>
      <Outlet />
      <RefreshFAB />
    </>
  );
};

export default RootLayout;
