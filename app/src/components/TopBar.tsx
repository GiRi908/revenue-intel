'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';

export function TopBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      router.push(`/records?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="bg-white rounded-[20px] px-5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between gap-4 mb-4">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7A72]">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search record, person or title"
          style={{ paddingLeft: '2.5rem', paddingRight: '3.5rem' }}
          className="w-full bg-[#F7F7F5] border-0 rounded-full py-2 text-[14px] text-[#14201A] placeholder-[#6B7A72] focus:ring-1 focus:ring-[#14683F] focus:bg-white transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
          <kbd className="text-[11px] font-mono text-[#6B7A72] bg-white px-1.5 py-0.5 rounded border border-[#E5E9E7] shadow-2xs">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Right Metadata Chip */}
      <div className="flex items-center gap-2">
        <Chip
          label="Selected records: 21 Aug 2026 (Asia/Kolkata)"
          variant="green"
          dot
          className="py-1.5 px-3 text-[13px]"
        />
      </div>
    </header>
  );
}
