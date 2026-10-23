import React from 'react';

export type ChipVariant =
  | 'current'
  | 'needs_review'
  | 'stale'
  | 'neutral'
  | 'green'
  | 'call'
  | 'meeting';

interface ChipProps {
  label: React.ReactNode;
  variant?: ChipVariant;
  className?: string;
  dot?: boolean;
}

export function Chip({
  label,
  variant = 'neutral',
  className = '',
  dot = false,
}: ChipProps) {
  const styles: Record<ChipVariant, { bg: string; text: string; dotColor: string }> = {
    current: {
      bg: 'bg-[#E3F2EA]',
      text: 'text-[#14683F]',
      dotColor: 'bg-[#14683F]',
    },
    needs_review: {
      bg: 'bg-[#FEF3C7]',
      text: 'text-[#B7791F]',
      dotColor: 'bg-[#B7791F]',
    },
    stale: {
      bg: 'bg-[#FEE2E2]',
      text: 'text-[#B3261E]',
      dotColor: 'bg-[#B3261E]',
    },
    neutral: {
      bg: 'bg-[#F1F3F2]',
      text: 'text-[#6B7A72]',
      dotColor: 'bg-[#6B7A72]',
    },
    green: {
      bg: 'bg-[#E3F2EA]',
      text: 'text-[#0B3D2A]',
      dotColor: 'bg-[#1F8A57]',
    },
    call: {
      bg: 'bg-[#E3F2EA]',
      text: 'text-[#14683F]',
      dotColor: 'bg-[#14683F]',
    },
    meeting: {
      bg: 'bg-[#EAEFF7]',
      text: 'text-[#2D4E8A]',
      dotColor: 'bg-[#2D4E8A]',
    },
  };

  const current = styles[variant] || styles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium leading-none select-none ${current.bg} ${current.text} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dotColor}`}
        />
      )}
      <span>{label}</span>
    </span>
  );
}
