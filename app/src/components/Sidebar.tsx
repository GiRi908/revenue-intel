'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  FileText,
  Download,
  Database,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { hasUsableText } from '@/lib/types';

export function Sidebar() {
  const pathname = usePathname();
  const { records, doReset, isLoading } = useStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const usableCount = records.filter(hasUsableText).length;
  const maxRevision = records.reduce((max, r) => Math.max(max, r.applied_revision), 1);

  const menuItems = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Inbox', href: '/records', icon: Inbox },
    { name: 'Manager brief', href: '/brief', icon: FileText },
    { name: 'Exports', href: '/export', icon: Download },
  ];

  const generalItems = [
    { name: 'Import and data', href: '/import', icon: Database },
  ];

  return (
    <aside className="w-full lg:w-[240px] bg-white rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] shrink-0 flex flex-col justify-between self-stretch">
      <div className="space-y-6">
        {/* App Logo & Name */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-6 h-6 rounded-full bg-[#14683F] flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
          <span className="text-[18px] font-semibold text-[#14201A] tracking-tight">
            Revenue Intel
          </span>
        </div>

        {/* Menu Section */}
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-[#6B7A72] uppercase tracking-wider px-3 mb-2">
            MENU
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium rounded-r-xl transition-all relative ${
                    isActive
                      ? 'bg-[#E3F2EA] text-[#14683F] font-semibold'
                      : 'text-[#6B7A72] hover:bg-[#F7F7F5] hover:text-[#14201A]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#14683F] rounded-r-sm" />
                  )}
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-[#14683F]' : 'text-[#6B7A72]'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* General Section */}
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-[#6B7A72] uppercase tracking-wider px-3 mb-2">
            GENERAL
          </div>
          <nav className="space-y-1">
            {generalItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium rounded-r-xl transition-all relative ${
                    isActive
                      ? 'bg-[#E3F2EA] text-[#14683F] font-semibold'
                      : 'text-[#6B7A72] hover:bg-[#F7F7F5] hover:text-[#14201A]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#14683F] rounded-r-sm" />
                  )}
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-[#14683F]' : 'text-[#6B7A72]'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Dark-Green Card */}
      <div className="mt-8 rounded-[16px] gradient-dark-green p-4 text-white space-y-3 relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-white/90">Data state</span>
          <span className="w-2 h-2 rounded-full bg-[#6FBF9A] animate-pulse" />
        </div>

        <div
          className="text-[12px] text-white/80 leading-relaxed font-normal"
          suppressHydrationWarning
        >
          {mounted
            ? `Revision ${maxRevision} applied, ${records.length} records, ${usableCount} transcripts.`
            : 'Loading data state...'}
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            if (confirm('Reset local IndexedDB stores?')) {
              doReset();
            }
          }}
          className="w-full h-[32px] rounded-full bg-white/15 hover:bg-white/25 text-white text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset demo</span>
        </button>
      </div>
    </aside>
  );
}
