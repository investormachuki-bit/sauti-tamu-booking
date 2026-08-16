import React from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`st-button st-button-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}