'use client';

import React, { useState } from 'react';
import { saveHallSeats } from '@/app/actions/eventActions';
import { Sparkles, Plus, Trash2, Save, Layers, Grid, CheckCircle2, AlertCircle } from 'lucide-react';

interface LocalSeat {
  id: string;
  section: string;
  rowLabel: string;
  seatNumber: number;
  x: number;
  y: number;
  defaultTier: 'VIP' | 'Regular' | 'Accessible';
}

interface SeatingStudioProps {
  hallId: string;
  hallName: string;
  initialSeats: Array<{
    id: string;
    section: string;
    rowLabel: string;
    seatNumber: number;
    x: number;
    y: number;
    defaultTier: string;
  }>;
}

export const SeatingStudio: React.FC<SeatingStudioProps> = ({ hallId, hallName, initialSeats }) => {
  const [seats, setSeats] = useState<LocalSeat[]>(
    initialSeats.map((s) => ({
      ...s,
      defaultTier: (s.defaultTier as any) || 'Regular',
    }))
  );

  // Bulk Generator Form State
  const [sectionName, setSectionName] = useState('Orchestra Tier');
  const [rowLabel, setRowLabel] = useState('E');
  const [seatCount, setSeatCount] = useState(10);
  const [startY, setStartY] = useState(250);
  const [selectedTier, setSelectedTier] = useState<'VIP' | 'Regular' | 'Accessible'>('Regular');

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

  // Bulk matrix generator (FR-2.2)
  const handleBulkGenerate = () => {
    const newSeats: LocalSeat[] = [];
    const startX = 100;
    const spacingX = 45;

    for (let i = 1; i <= seatCount; i++) {
      newSeats.push({
        id: `temp_${rowLabel}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        section: sectionName,
        rowLabel,
        seatNumber: i,
        x: startX + (i - 1) * spacingX,
        y: startY,
        defaultTier: selectedTier,
      });
    }

    setSeats([...seats, ...newSeats]);
    setStatusMsg({ type: 'success', text: `Generated ${seatCount} seats for Row ${rowLabel} in section "${sectionName}".` });
  };

  const handleClearAll = () => {
    if (confirm('Clear all seats from this layout canvas?')) {
      setSeats([]);
      setSelectedSeatId(null);
    }
  };

  const handleSaveLayout = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await saveHallSeats(hallId, seats);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Layout saved successfully! ${res.count} physical seats stored.` });
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to save seating layout.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error saving layout' });
    } finally {
      setSaving(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP': return '#f59e0b'; // Gold
      case 'Regular': return '#3b82f6'; // Blue
      case 'Accessible': return '#10b981'; // Green
      default: return '#6b7280';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Studio Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Admin Studio Layout Designer</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">{hallName} — Permanent Layout</h1>
          <p className="text-slate-400 text-xs mt-1">
            Design physical seat matrices, bulk row generators, section coordinates, and tier assignments.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-2 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Clear Layout</span>
          </button>
          
          <button
            onClick={handleSaveLayout}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Layout...' : 'Save Layout to Hall'}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center space-x-3 border ${
            statusMsg.type === 'success' ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800' : 'bg-red-950/40 text-red-300 border-red-800'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Studio Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Bulk Row Generator Controls */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Grid className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Bulk Row Generator</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Section Name</label>
              <input
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. Orchestra Left"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Row Label</label>
                <input
                  type="text"
                  value={rowLabel}
                  onChange={(e) => setRowLabel(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-center"
                  placeholder="e.g. A"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Seat Count</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={seatCount}
                  onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Vertical Y Offset (px)</label>
              <input
                type="number"
                step="25"
                value={startY}
                onChange={(e) => setStartY(parseInt(e.target.value) || 100)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Default Tier Classification</label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="VIP">VIP (Gold Tier)</option>
                <option value="Regular">Regular (Blue Tier)</option>
                <option value="Accessible">Accessible (Green Tier)</option>
              </select>
            </div>

            <button
              onClick={handleBulkGenerate}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Row Matrix</span>
            </button>
          </div>

          <div className="border-t border-slate-800 pt-4 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>VIP Tier ($150)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Regular Orchestra ($85)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Accessible Balcony ($45)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Responsive SVG Layout Canvas */}
        <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative min-h-[500px] flex flex-col justify-between overflow-x-auto">
          
          {/* Stage Banner */}
          <div className="w-full max-w-xl mx-auto mb-8 bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-800 border border-indigo-500/30 py-3 rounded-xl text-center shadow-lg">
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
              🎤 STAGE / PERFORMANCE AREA
            </span>
          </div>

          {/* SVG Canvas Map */}
          <div className="w-full flex justify-center overflow-auto py-4">
            <svg width="600" height="420" viewBox="0 0 600 420" className="border border-slate-800/80 bg-slate-900/60 rounded-xl shadow-inner">
              
              {/* Grid Background Lines */}
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Render Physical Seats */}
              {seats.map((seat) => {
                const color = getTierColor(seat.defaultTier);
                const isSelected = selectedSeatId === seat.id;

                return (
                  <g
                    key={seat.id}
                    transform={`translate(${seat.x}, ${seat.y})`}
                    onClick={() => setSelectedSeatId(seat.id)}
                    className="cursor-pointer group"
                  >
                    <rect
                      x="-14"
                      y="-14"
                      width="28"
                      height="28"
                      rx="6"
                      fill={color}
                      fillOpacity={isSelected ? 0.95 : 0.75}
                      stroke={isSelected ? '#ffffff' : color}
                      strokeWidth={isSelected ? '2.5' : '1'}
                      className="transition-all hover:scale-110"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      className="select-none pointer-events-none"
                    >
                      {seat.rowLabel}{seat.seatNumber}
                    </text>
                  </g>
                );
              })}

              {seats.length === 0 && (
                <text x="300" y="210" textAnchor="middle" fill="#64748b" fontSize="14" fontWeight="500">
                  No seats generated yet. Use the Bulk Row Generator to populate seats.
                </text>
              )}
            </svg>
          </div>

          {/* Canvas Footer Status */}
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
            <div>
              Total Layout Seats: <span className="text-white font-bold">{seats.length}</span>
            </div>
            <div>
              SVG Viewbox: <span className="font-mono text-slate-300">600 x 420 px</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
