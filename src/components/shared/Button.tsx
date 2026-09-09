"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  className,
  variant = "secondary",
  size = "md",
  leftIcon,
  rightIcon,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn("button", `button--${variant}`, `button--${size}`, className)}
      type={type}
      {...props}
    >
      {leftIcon ? <span className="button__icon">{leftIcon}</span> : null}
      <span>{children}</span>
      {rightIcon ? <span className="button__icon">{rightIcon}</span> : null}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  variant?: ButtonVariant;
}

export function IconButton({
  className,
  label,
  children,
  variant = "ghost",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn("icon-button", `icon-button--${variant}`, className)}
      title={label}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
