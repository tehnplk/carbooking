'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortButtonProps {
  column: string;
  label: string;
  currentSort: string;
  currentOrder: string;
}

export default function SortButton({ column, label, currentSort, currentOrder }: SortButtonProps) {
  const searchParams = useSearchParams();
  const isActive = currentSort === column;
  
  // Toggle logic: Default -> ASC -> DESC -> Default
  let nextOrder = 'asc';
  if (isActive) {
    nextOrder = currentOrder === 'asc' ? 'desc' : 'asc';
  }

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    params.set('order', nextOrder);
    return params.toString();
  };

  return (
    <Link
      href={`/bookings?${createQueryString('sort', column)}`}
      className={cn(
        "group inline-flex items-center space-x-1.5 text-current transition-colors hover:text-slate-700",
        isActive && "text-slate-900"
      )}
    >
      <span className="truncate">{label}</span>
      <span className="flex flex-col -space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isActive ? (
          currentOrder === 'asc' ? (
            <ChevronUp className="w-3 h-3 text-indigo-600" />
          ) : (
            <ChevronDown className="w-3 h-3 text-indigo-600" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3" />
        )}
      </span>
      {isActive && !searchParams.get('sort') && (
         <div className="absolute inset-0 z-[-1] opacity-0" /> // Placeholder
      )}
    </Link>
  );
}
