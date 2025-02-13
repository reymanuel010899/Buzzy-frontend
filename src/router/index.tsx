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
              }
            />
      </>
    )
  );