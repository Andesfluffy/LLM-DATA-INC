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
        "text-sm text-grape-400 hover:text-white font-medium px-3 py-2 rounded-lg transition",
        isActive && "bg-white/[0.06] text-white",
        className,
      )}
    >
      {children}
    </Link>
  );
}
