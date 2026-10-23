import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'white' | 'dark-green';
}

export function Card({
  title,
  action,
  children,
  className = '',
  variant = 'white',
}: CardProps) {
  const isDark = variant === 'dark-green';

  return (
    <div
      className={`rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-150 ${
        isDark
          ? 'gradient-dark-green text-white'
          : 'bg-white text-[#14201A]'
      } ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {typeof title === 'string' ? (
            <h3
              className={`text-[16px] font-medium tracking-tight ${
                isDark ? 'text-white' : 'text-[#14201A]'
              }`}
            >
              {title}
            </h3>
          ) : (
            title
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
