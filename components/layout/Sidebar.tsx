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
  PanelLeftClose,
  PanelLeftOpen,
  WalletCards,
  Receipt,
  Landmark,
  CalendarClock,
  MessageSquare,
  ContactRound,
  BriefcaseBusiness,
  FileBarChart,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
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
      {
        label: "ManyChat Contacts",
        href: "/admin/manychat-contacts",
        icon: ContactRound,
      },
      {
        label: "SMS Centre",
        href: "/admin/sms",
        icon: MessageSquare,
      },
    ],
  },
  {
    section: "FINANCIAL MANAGEMENT",
    items: [
      {
        label: "Financial Dashboard",
        href: "/admin/financials",
        icon: WalletCards,
      },
      {
        label: "Payment Schedule",
        href: "/admin/payment-schedule",
        icon: CalendarClock,
      },
      {
        label: "Expenses",
        href: "/admin/expenses",
        icon: Receipt,
      },
      {
        label: "Financial Obligations",
        href: "/admin/financial-obligations",
        icon: Landmark,
      },
      {
        label: "Investment Portfolio",
        href: "/admin/investments",
        icon: BriefcaseBusiness,
      },
      {
        label: "Reports",
        href: "/admin/reports",
        icon: FileBarChart,
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
  collapsed,
  onToggleCollapse,
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
        className={`st-sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}
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

            {/* Desktop collapse / expand */}
            <button
              type="button"
              className="st-icon-button st-sidebar-collapse-button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>

            {/* Mobile close button */}
            <button
              type="button"
              className="st-icon-button st-sidebar-mobile-close"
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

                    <span className="st-nav-label">
                      {item.label}
                    </span>
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
              Booking &amp; Financial Management
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}