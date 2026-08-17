"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ClipboardCheck,
  Clock3,
  Settings,
  X,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navigation = [
  {
    section: "MAIN",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        label: "Calendar",
        href: "/admin/calendar",
        icon: CalendarDays,
      },
      {
        label: "Bookings",
        href: "/admin/bookings",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    section: "RELATIONSHIPS",
    items: [
      {
        label: "Leads",
        href: "/admin/leads",
        icon: Users,
      },
      {
        label: "Students",
        href: "/admin/students",
        icon: Users,
      },
      {
        label: "Follow-ups",
        href: "/admin/followups",
        icon: Clock3,
      },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
    ],
  },
];

export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="st-sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`st-sidebar ${
          open ? "open" : ""
        }`}
      >
        {/* BRAND */}
        <div className="st-sidebar-brand">
          <div className="flex w-full items-center justify-between">
            <Link
              href="/admin"
              onClick={onClose}
            >
              <div className="st-logo">
                <div className="st-logo-mark">
                  ST
                </div>

                <div>
                  <div className="st-logo-name">
                    Sauti Tamu
                  </div>

                  <div className="st-logo-subtitle">
                    Piano Center
                  </div>
                </div>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              className="st-icon-button"
              onClick={onClose}
              aria-label="Close navigation"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="st-sidebar-nav">
          {navigation.map((group) => (
            <div
              className="st-nav-section"
              key={group.section}
            >
              <p className="st-nav-section-title">
                {group.section}
              </p>

              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="st-nav-item"
                    onClick={onClose}
                  >
                    <span className="st-nav-icon">
                      <Icon
                        size={17}
                        strokeWidth={1.8}
                      />
                    </span>

                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* FOOTER */}
        <div className="st-sidebar-footer">
          <div
            className="
              rounded-xl
              border
              border-[var(--st-border)]
              bg-[var(--st-bg-soft)]
              px-3
              py-3
            "
          >
            <p
              className="
                m-0
                text-[9px]
                font-bold
                uppercase
                tracking-[0.15em]
                text-[var(--st-gray)]
              "
            >
              Sauti Tamu
            </p>

            <p
              className="
                mt-1
                mb-0
                text-[10px]
                text-[var(--st-gray)]
              "
            >
              Booking &amp; Follow-up
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}