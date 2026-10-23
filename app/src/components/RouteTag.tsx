import React from 'react';
import type { RouteName } from '@/lib/types';
import { ROUTE_LABELS } from '@/lib/types';

interface RouteTagProps {
  route: RouteName;
  reason?: string;
  size?: 'sm' | 'md' | 'lg';
  onRemove?: () => void;
  className?: string;
}

const ROUTE_DOT_COLORS: Record<RouteName, string> = {
  needs_human_review: '#B45309',   // amber
  deal_next_steps: '#1F4E8C',      // deep blue
  customer_followup_cs: '#B45309', // amber
  sales_coaching: '#1F4E8C',       // deep blue
  internal_vendor_note: '#5F6368', // grey
  no_analysis_log: '#8C8C89',      // light grey
};

export function RouteTag({
  route,
  reason,
  onRemove,
  className = '',
}: RouteTagProps) {
  const label = ROUTE_LABELS[route] || route;
  const dotColor = ROUTE_DOT_COLORS[route] || '#5F6368';

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[13px] text-[#1A1A1A] ${className}`}
      title={reason ? `${label}: ${reason}` : label}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-[#5F6368] hover:text-[#1A1A1A] ml-1 text-xs"
          title="Remove route"
        >
          ×
        </button>
      )}
    </span>
  );
}
