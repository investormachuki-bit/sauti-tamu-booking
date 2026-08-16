import React from "react";

type BadgeVariant =
  | "red"
  | "green"
  | "yellow"
  | "gray";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export default function Badge({
  children,
  variant = "gray",
}: BadgeProps) {
  return (
    <span className={`st-badge st-badge-${variant}`}>
      {children}
    </span>
  );
}