import Login from "../pages/auth/Signin";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import Main from "../pages/main";
import SignUp from "../pages/auth/signup";
import LivePage from "../pages/main/LivePage";
import Marketplace from "../pages/main/Marker";
import Wallet from "../pages/main/wallet";
import Store from "../pages/main/store";
import Game from "../pages/main/game";
import Profile from "../pages/profille/profile";
import SocialAuthCallback from "../pages/SocialAuthCallback";
import ProtectedRoute from "../PrivateRoute";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/sign-in" element={<Login />} />
      <Route path="/sign-up" element={<SignUp />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Main />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lives"
        element={
          <ProtectedRoute>
            <LivePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marker"
        element={
          <ProtectedRoute>
            <Marketplace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game"
        element={
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        }
      />
      <Route
        path="/store"
        element={
          <ProtectedRoute>
            <Store />
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
        path="/social/callback/:platform"
        element={
          <ProtectedRoute>
            <SocialAuthCallback />
          </ProtectedRoute>
        }
      />
    </>
  )
);