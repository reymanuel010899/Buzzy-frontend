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
import PrivateRoute from "../PrivateRoute";


  
  export const router = createBrowserRouter(
    createRoutesFromElements(
      <>
            <Route
              path="/sign-in"
              element={
                  <Login/>
              }
            />
            <Route
              path="/sign-up"
              element={
                  <SignUp/>
              }
            />
        <Route element={<PrivateRoute />}>
            <Route
              path="/"
              element={
                  <Main/>
              }
            />
             <Route
              path="/lives"
              element={
                  <LivePage/>
              }
            />

            <Route
              path="/marker"
              element={
                  <Marketplace/>
                }  />

             <Route
              path="/game"
              element={
                  <Game/>
              }
            />
             <Route
              path="/store"
              element={
                  <Store/>
              }
            />
             <Route
              path="/wallet"
              element={
                  <Wallet/>

              }
            />
             <Route
              path="/profile/:username"
              element={
                  <Profile/>
              }
            />
          </Route>

      </>
    )
  );