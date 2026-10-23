import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-full select-none whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'h-[32px] px-3.5 text-[13px]',
    md: 'h-[40px] px-5 text-[14px]',
  }[size];

  const variants = {
    primary:
      'bg-[#14683F] text-white hover:bg-[#0B3D2A] border border-[#14683F]',
    secondary:
      'bg-white text-[#14683F] border border-[#14683F] hover:bg-[#E3F2EA]',
    ghost:
      'bg-transparent text-[#6B7A72] hover:bg-[#E3F2EA] hover:text-[#14201A]',
  }[variant];

  return (
    <button className={`${base} ${sizes} ${variants} ${className}`} {...props}>
      {children}
    </button>
  );
}
