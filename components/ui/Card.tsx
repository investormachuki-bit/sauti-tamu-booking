import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({
  children,
  className = "",
  hover = false,
}: CardProps) {
  return (
    <div
      className={`
        st-card
        ${hover ? "st-card-hover" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}