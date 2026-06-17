import { lazy } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";

// ── Eager: lo necesario para arrancar (auth + feed) entra en el bundle inicial.
import Login from "../pages/auth/Signin";
import Main from "../pages/main";
import SignUp from "../pages/auth/signup";
import RootLayout from "../components/Layout/RootLayout";
import ProtectedRoute from "../PrivateRoute";
import JoinPage from "../pages/auth/JoinPage";
import VideoDeepLink from "../components/VideoDeepLink";

// ── Lazy: pantallas pesadas u ocasionales — se descargan solo al visitarlas,
// sacándolas del bundle inicial para que el feed arranque más rápido.
const Wallet              = lazy(() => import("../pages/main/wallet"));
const Profile             = lazy(() => import("../pages/profille/profile"));
const AdsPage             = lazy(() => import("../pages/main/AdsPage"));
const SupportForm         = lazy(() => import("../pages/main/Support"));
const SubscriptionSuccess = lazy(() => import("../pages/main/SubscriptionSuccess"));
const SubscriptionCancel  = lazy(() => import("../pages/main/SubscriptionCancel"));
const WalletSuccess       = lazy(() => import("../pages/main/WalletSuccess"));
const WalletCancel        = lazy(() => import("../pages/main/WalletCancel"));
const AccountSuccess      = lazy(() => import("../pages/main/successAcount"));
const AccountCancel       = lazy(() => import("../pages/main/CancelAccount"));
const AdCampaignSuccess   = lazy(() => import("../pages/main/AdCampaignSuccess"));
const PremiumSuccess      = lazy(() => import("../pages/main/PremiumSuccess"));
const AiCreditsSuccess    = lazy(() => import("../pages/main/AiCreditsSuccess"));
const SocialAuthCallback  = lazy(() => import("../pages/SocialAuthCallback"));
const NotFound            = lazy(() => import("../pages/NotFound"));

// El <Suspense> que muestra el fallback mientras llega cada chunk lazy vive en
// RootLayout (envuelve el <Outlet/>), así no hay que envolver ruta por ruta.

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route path="/sign-in" element={<Login />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/join" element={<JoinPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Main />
          </ProtectedRoute>
        }
      />

      <Route
        path="/wallet"
        element={
          <ProtectedRoute>
            <Wallet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:username"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription-success"
        element={
          <ProtectedRoute>
            <SubscriptionSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription-cancel"
        element={
          <ProtectedRoute>
            <SubscriptionCancel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet-success"
        element={
          <ProtectedRoute>
            <WalletSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet-cancel"
        element={
          <ProtectedRoute>
            <WalletCancel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/success"
        element={
          <ProtectedRoute>
            <AccountSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reconnect"
        element={
          <ProtectedRoute>
            <AccountCancel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <SupportForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ads"
        element={
          <ProtectedRoute>
            <AdsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ads/campaign-success"
        element={
          <ProtectedRoute>
            <AdCampaignSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/premium/success"
        element={
          <ProtectedRoute>
            <PremiumSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-credits-success"
        element={
          <ProtectedRoute>
            <AiCreditsSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/social/callback/:platform"
        element={
          <ProtectedRoute>
            <SocialAuthCallback />
          </ProtectedRoute>
        }
      />
      {/* Video deep-link: redirect to home with the target video uuid */}
      <Route
        path="/video/:uuid"
        element={
          <ProtectedRoute>
            <VideoDeepLink />
          </ProtectedRoute>
        }
      />
      {/* Catch-all: 404 */}
      <Route path="*" element={<NotFound />} />
    </Route>
  )
);