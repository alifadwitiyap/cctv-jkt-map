import type { ReactNode } from "react";

interface HeaderProps {
  children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__title">CCTV Jakarta Map</h1>
        <p className="app-header__subtitle">Live traffic cameras — Jakarta</p>
      </div>
      {children}
    </header>
  );
}
