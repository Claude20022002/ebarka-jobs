'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  count?: number;
};

type ProfileNavProps = {
  userName: string;
  items: readonly NavItem[];
};

export function ProfileNav({ userName, items }: ProfileNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation du profil">
      <p className="mb-4 truncate text-sm text-muted-foreground">{userName}</p>

      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive =
            item.href === '/profile'
              ? pathname === '/profile'
              : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
                href={item.href}
              >
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                    {item.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
