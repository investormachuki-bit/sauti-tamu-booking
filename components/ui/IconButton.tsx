import React from "react";

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  label: string;
}

export default function IconButton({
  children,
  label,
  ...props
}: IconButtonProps) {
  return (
    <button
      className="st-icon-button"
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}