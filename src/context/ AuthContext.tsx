import { createContext, useState, useEffect, ReactNode } from "react";
import { IAuthContext, IUser } from "../interfaces/auth";
import { fetchUserLanguage } from "@/services/languageService";
import { changeLanguage } from "@/i18n/config";

export const AuthContext = createContext<IAuthContext>({
  user: null,
  login: () => {},
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<IUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      setUser(JSON.parse(userData) as IUser);
    }
  }, []);

  const login = (userData: IUser, token: string) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    // Sync language preference from backend after login
    fetchUserLanguage().then((lang) => {
      if (lang) changeLanguage(lang);
    });
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
