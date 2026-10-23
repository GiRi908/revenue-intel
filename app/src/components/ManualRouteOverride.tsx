'use client';

import React, { useState } from 'react';
import type { RouteAssignment, RouteName, SuggestedRoutes, ManualRoutes } from '@/lib/types';
import { ROUTE_LABELS } from '@/lib/types';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { RotateCcw } from 'lucide-react';

interface ManualRouteOverrideProps {
  sourceType: string;
  sourceId: string;
  suggested?: SuggestedRoutes;
  manual?: ManualRoutes;
  onSaveManual: (routes: RouteAssignment[]) => Promise<void>;
  onResetToSuggestion: () => Promise<void>;
}

const ALL_ROUTES: RouteName[] = [
  'sales_coaching',
  'deal_next_steps',
  'customer_followup_cs',
  'internal_vendor_note',
  'no_analysis_log',
  'needs_human_review',
];

export function ManualRouteOverride({
  suggested,
  manual,
  onSaveManual,
  onResetToSuggestion,
}: ManualRouteOverrideProps) {
  const isManual = manual !== undefined && manual.routes !== null;

  const effectiveRoutes = isManual
    ? manual.routes!
    : suggested?.routes || [];

  const [isEditing, setIsEditing] = useState(false);
  const [selectedRoutes, setSelectedRoutes] = useState<RouteName[]>(() =>
    effectiveRoutes.map((r) => r.route)
  );
  const [manualReason, setManualReason] = useState('Manual reviewer assessment');
  const [saving, setSaving] = useState(false);

  const handleStartEdit = () => {
    setSelectedRoutes(effectiveRoutes.map((r) => r.route));
    setIsEditing(true);
  };

  const handleToggleRoute = (r: RouteName) => {
    if (selectedRoutes.includes(r)) {
      if (selectedRoutes.length === 1) return;
      setSelectedRoutes(selectedRoutes.filter((x) => x !== r));
    } else {
      setSelectedRoutes([...selectedRoutes, r]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const assignments: RouteAssignment[] = selectedRoutes.map((route) => ({
        route,
        reason: manualReason || 'Manual override applied',
      }));
      await onSaveManual(assignments);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await onResetToSuggestion();
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E7]">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-medium text-[#14201A]">Route</h3>
          {isManual ? (
            <Chip label="Manual override" variant="needs_review" dot />
          ) : (
            <Chip label="Suggested" variant="current" dot />
          )}
        </div>

        <div className="flex items-center gap-2">
          {isManual && (
            <Button
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={handleReset}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset to suggestion
            </Button>
          )}

          {!isEditing ? (
            <Button variant="secondary" size="sm" onClick={handleStartEdit}>
              Change
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Route chips & reasons */}
      {!isEditing ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {effectiveRoutes.map((r, idx) => (
              <Chip
                key={idx}
                label={ROUTE_LABELS[r.route] || r.route}
                variant={r.route === 'needs_human_review' ? 'needs_review' : 'green'}
                dot
                className="py-1 px-3 text-[13px]"
              />
            ))}
          </div>

          <div className="space-y-1.5 pt-1">
            {effectiveRoutes.map((r, idx) => (
              <p key={idx} className="text-[13px] text-[#6B7A72] leading-relaxed">
                <span className="font-medium text-[#14201A]">{ROUTE_LABELS[r.route]}:</span> {r.reason}
              </p>
            ))}
          </div>

          {isManual && suggested && (
            <div className="pt-3 border-t border-[#E5E9E7] text-[12px] text-[#6B7A72] space-y-1">
              <span className="font-medium block text-[#14201A]">Original suggestion:</span>
              {suggested.routes.map((sr, idx) => (
                <div key={idx} className="pl-2">
                  • {ROUTE_LABELS[sr.route]}: {sr.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Edit Mode */
        <div className="space-y-3 pt-1">
          <p className="text-[13px] text-[#6B7A72]">Select route destinations:</p>

          <div className="space-y-2">
            {ALL_ROUTES.map((route) => {
              const isSelected = selectedRoutes.includes(route);
              const label = ROUTE_LABELS[route];

              return (
                <label
                  key={route}
                  className="flex items-center gap-2.5 text-[14px] text-[#14201A] cursor-pointer hover:bg-[#E3F2EA]/40 p-2 rounded-lg transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleRoute(route)}
                    className="rounded text-[#14683F] focus:ring-0 w-4 h-4"
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-[12px] text-[#6B7A72] block font-medium">
              Reason for override:
            </label>
            <input
              type="text"
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              placeholder="e.g. Discussed renewal; reassigned to Deal next steps"
              className="w-full text-[13px] bg-[#F7F7F5] border border-[#E5E9E7] rounded-full px-4 py-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9E7]">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving...' : 'Apply override'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
