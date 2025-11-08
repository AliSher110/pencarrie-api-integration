import { FC, ReactNode } from "react";
import { Toaster } from "sonner";
import { Navbar } from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
      <Toaster position="top-right" richColors />
    </>
  );
};
