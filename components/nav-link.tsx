"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import clsx from "classnames";

type NavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  exact?: boolean;
};

export default function NavLink({ href, children, className = "", exact = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={clsx(
        "text-base text-slate-200 hover:text-accent font-medium px-3 py-1 rounded-xl transition",
        isActive && "bg-white/10 text-white shadow-sm",
        className,
      )}
    >
      {children}
    </Link>
  );
}
