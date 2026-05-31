import Login from "../pages/auth/Signin";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import Main from "../pages/main";
import SignUp from "../pages/auth/signup";
import RootLayout from "../components/Layout/RootLayout";
import Wallet from "../pages/main/wallet";
import Profile from "../pages/profille/profile";
import SubscriptionSuccess from "../pages/main/SubscriptionSuccess";
import SubscriptionCancel from "../pages/main/SubscriptionCancel";
import WalletSuccess from "../pages/main/WalletSuccess";
import WalletCancel from "../pages/main/WalletCancel";
import SocialAuthCallback from "../pages/SocialAuthCallback";
import ProtectedRoute from "../PrivateRoute";
import AccountSuccess from "../pages/main/successAcount";
import AccountCancel from "../pages/main/CancelAccount";
import SupportForm from "../pages/main/Support";
import AdsPage from "../pages/main/AdsPage";
import PremiumSuccess from "../pages/main/PremiumSuccess";
import NotFound from "../pages/NotFound";
import JoinPage from "../pages/auth/JoinPage";
import VideoDeepLink from "../components/VideoDeepLink";

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
        path="/premium/success"
        element={
          <ProtectedRoute>
            <PremiumSuccess />
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