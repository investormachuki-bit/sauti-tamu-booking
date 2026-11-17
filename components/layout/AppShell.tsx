"use client";

import React, {
  useState,
} from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  return (
    <div className={`st-app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>

      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <div className="st-main-area">

        <Topbar
          onMenuClick={() =>
            setSidebarOpen(true)
          }
        />

        <main className="st-content">
          {children}
        </main>

      </div>
    </div>
  );
}