import React from "react";
import Footer from "./Footer";
import Navbar from "./Navar";
interface LayoutProps {
    children: React.ReactNode; // Corrige el nombre de la prop
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <>
            <Navbar />
            {children}
            <Footer />
        </>
    );
};

export default Layout;
