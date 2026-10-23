import React from 'react';

interface MetricItemProps {
  value: string | number;
  label: string;
  definition: string;
}

export function MetricItem({ value, label, definition }: MetricItemProps) {
  return (
    <div className="flex-1 px-4 first:pl-0 last:pr-0 border-r last:border-r-0 border-[#E5E5E3]">
      <div className="text-[28px] font-semibold text-[#1A1A1A] tabular-nums leading-none">
        {value}
      </div>
      <div className="text-[14px] font-medium text-[#1A1A1A] mt-2">
        {label}
      </div>
      <div className="text-[12px] text-[#5F6368] mt-1 leading-normal">
        {definition}
      </div>
    </div>
  );
}

// Keep backwards compatibility for any other imports
export function MetricCard({
  title,
  value,
  denominatorText,
  definition,
}: {
  title: string;
  value: string | number;
  denominatorText?: string;
  definition: string;
  [key: string]: any;
}) {
  return (
    <MetricItem
      value={value}
      label={title}
      definition={denominatorText ? `${denominatorText} — ${definition}` : definition}
    />
  );
}
