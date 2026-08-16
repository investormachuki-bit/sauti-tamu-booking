"use client";

import {
  Bell,
  Menu,
  ExternalLink,
} from "lucide-react";

import Link from "next/link";

import IconButton from "../ui/IconButton";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({
  onMenuClick,
}: TopbarProps) {
  return (
    <header className="st-topbar">
      <div className="st-topbar-left">

        <div className="st-mobile-menu">
          <IconButton
            label="Open navigation"
            onClick={onMenuClick}
          >
            <Menu size={18} />
          </IconButton>
        </div>

        <div>
          <p className="st-eyebrow">
            ADMINISTRATION
          </p>

          <p className="m-0 mt-1 text-[11px] font-semibold text-[var(--st-charcoal)]">
            Sauti Tamu Piano Center
          </p>
        </div>
      </div>

      <div className="st-topbar-right">

        <Link
          href="/"
          target="_blank"
          className="hidden sm:block"
        >
          <IconButton label="View public booking page">
            <ExternalLink size={16} />
          </IconButton>
        </Link>

        <IconButton label="Notifications">
          <Bell size={17} />
        </IconButton>

        <div className="st-user-menu">
          <div className="st-avatar">
            ST
          </div>

          <div className="st-user-details">
            <div className="st-user-name">
              Admin
            </div>

            <div className="st-user-role">
              Administrator
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}