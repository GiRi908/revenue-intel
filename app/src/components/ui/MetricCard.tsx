import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  definition: string;
  href?: string;
  variant?: 'white' | 'dark-green';
}

export function MetricCard({
  title,
  value,
  subtitle,
  definition,
  href,
  variant = 'white',
}: MetricCardProps) {
  const isDark = variant === 'dark-green';

  const content = (
    <div
      className={`rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between h-[160px] transition-all duration-150 group ${
        isDark
          ? 'gradient-dark-green text-white'
          : 'bg-white text-[#14201A] hover:bg-[#FAFAF8]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[15px] font-medium tracking-tight ${
            isDark ? 'text-white/90' : 'text-[#14201A]'
          }`}
        >
          {title}
        </span>
        {href && (
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              isDark
                ? 'bg-white/20 text-white group-hover:bg-white group-hover:text-[#0B3D2A]'
                : 'border border-[#E5E9E7] text-[#6B7A72] group-hover:border-[#14683F] group-hover:text-[#14683F]'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="my-1">
        <div className="text-[40px] font-semibold tabular-nums leading-none tracking-tight">
          {value}
        </div>
      </div>

      <div
        className={`text-[12px] leading-tight line-clamp-1 ${
          isDark ? 'text-white/80' : 'text-[#6B7A72]'
        }`}
        title={definition}
      >
        {subtitle ? (
          <span className="font-medium mr-1.5">{subtitle}</span>
        ) : null}
        {definition}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
