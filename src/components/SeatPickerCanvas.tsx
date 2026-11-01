'use client';

import React, { useState, useEffect } from 'react';
import { holdSeatAction, releaseSeatAction, checkoutCart } from '@/app/actions/eventActions';
import { useApp } from './AppContext';
import { 
  Ticket, 
  Clock, 
  ShoppingCart, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  CreditCard,
  ShieldCheck,
  Building2,
  DollarSign
} from 'lucide-react';

interface EventSeatItem {
  id: string;
  seatId: string;
  status: 'AVAILABLE' | 'HELD' | 'SOLD';
  price: number;
  holdExpiresAt?: string | null;
  heldBySession?: string | null;
  seat: {
    section: string;
    rowLabel: string;
    seatNumber: number;
    x: number;
    y: number;
    defaultTier: string;
  };
  tier?: {
    name: string;
    color: string;
  } | null;
}

interface SeatPickerCanvasProps {
  eventId: string;
  eventTitle: string;
  eventStartTime: string;
  eventSeats: EventSeatItem[];
}

export const SeatPickerCanvas: React.FC<SeatPickerCanvasProps> = ({
  eventId,
  eventTitle,
  eventStartTime,
  eventSeats: initialEventSeats,
}) => {
  const { currentUser } = useApp();
  const [eventSeats, setEventSeats] = useState<EventSeatItem[]>(initialEventSeats);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [sessionId] = useState(() => `sess_${Math.random().toString(36).substring(2, 10)}`);
  
  // 10-Minute Cart Expiration Timer State (FR-3.3)
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [loadingSeatId, setLoadingSeatId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<any | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Pan & Zoom State
  const [zoomLevel, setZoomLevel] = useState(1);

  // Timer Countdown Effect
  useEffect(() => {
    if (selectedSeatIds.length === 0) {
      setTimerSeconds(null);
      return;
    }

    if (timerSeconds === null) {
      setTimerSeconds(600); // 10 minutes (600 seconds)
    }

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Release all held seats on expiration (FR-3.3)
          selectedSeatIds.forEach((id) => releaseSeatAction(id, sessionId));
          setSelectedSeatIds([]);
          setErrorMsg('⌛ Your 10-minute seat hold expired. Held seats returned to general pool.');
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedSeatIds, timerSeconds, sessionId]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeatClick = async (seatItem: EventSeatItem) => {
    if (seatItem.status === 'SOLD') return;
    
    // If seat is currently held by someone else
    if (seatItem.status === 'HELD' && seatItem.heldBySession !== sessionId && !selectedSeatIds.includes(seatItem.id)) {
      setErrorMsg('This seat is currently held by another attendee.');
      return;
    }

    setLoadingSeatId(seatItem.id);
    setErrorMsg(null);

    const isCurrentlySelected = selectedSeatIds.includes(seatItem.id);

    if (isCurrentlySelected) {
      // Release seat hold
      await releaseSeatAction(seatItem.id, sessionId);
      setSelectedSeatIds(selectedSeatIds.filter((id) => id !== seatItem.id));
      setEventSeats((prev) =>
        prev.map((s) => (s.id === seatItem.id ? { ...s, status: 'AVAILABLE', heldBySession: null } : s))
      );
    } else {
      // Execute Atomic Redis / DB Lock (FR-3.2)
      const res = await holdSeatAction(seatItem.id, sessionId);
      if (res.success) {
        setSelectedSeatIds([...selectedSeatIds, seatItem.id]);
        setEventSeats((prev) =>
          prev.map((s) => (s.id === seatItem.id ? { ...s, status: 'HELD', heldBySession: sessionId } : s))
        );
      } else {
        setErrorMsg(res.message || 'Could not lock seat hold.');
      }
    }
    setLoadingSeatId(null);
  };

  const selectedSeatsList = eventSeats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeatsList.reduce((acc, s) => acc + s.price, 0);

  // Multi-party Revenue Split Calculation (FR-4.2)
  const saasFee = Math.round((totalPrice * 0.05 + 1.0) * 100) / 100;
  const venueCommission = Math.round((totalPrice * 0.10) * 100) / 100;
  const organizerNet = Math.max(0, Math.round((totalPrice - saasFee - venueCommission) * 100) / 100);

  const handleConfirmCheckout = async () => {
    setProcessingPayment(true);
    setErrorMsg(null);
    try {
      const res = await checkoutCart(eventId, currentUser.id, selectedSeatIds, currentUser.email, currentUser.name);
      if (res.success) {
        setCheckoutSuccess(res);
        // Mark seats as SOLD locally
        setEventSeats((prev) =>
          prev.map((s) => (selectedSeatIds.includes(s.id) ? { ...s, status: 'SOLD' } : s))
        );
        setSelectedSeatIds([]);
        setTimerSeconds(null);
      } else {
        setErrorMsg(res.error || 'Checkout transaction failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing error');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Timer Bar & Cart Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{eventTitle}</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Select seats on the interactive map canvas below. Red = Sold, Yellow = Held, Green/Blue = Available.
          </p>
        </div>

        {selectedSeatIds.length > 0 && timerSeconds !== null && (
          <div className="flex items-center space-x-3 bg-amber-950/40 border border-amber-500/40 px-4 py-2 rounded-xl text-amber-300">
            <Clock className="w-5 h-5 animate-pulse text-amber-400" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">Seat Hold Expiration</div>
              <div className="text-lg font-mono font-extrabold tracking-widest">{formatTime(timerSeconds)}</div>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Interactive Pan-and-Zoom SVG Canvas Area */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
        
        {/* Controls Toolbar */}
        <div className="w-full flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded-md bg-blue-500" />
              <span className="text-slate-300">Available</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded-md bg-amber-500" />
              <span className="text-slate-300">Held (10m)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded-md bg-rose-600" />
              <span className="text-slate-300">Sold</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Zoom:</span>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700"
            >
              -
            </button>
            <span className="font-mono text-slate-200 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.1))}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700"
            >
              +
            </button>
          </div>
        </div>

        {/* Stage Header */}
        <div className="w-full max-w-lg mb-8 bg-gradient-to-r from-indigo-900/60 via-slate-800 to-indigo-900/60 border border-indigo-500/30 py-2.5 rounded-xl text-center shadow-lg">
          <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">STAGE CANVAS AREA</span>
        </div>

        {/* Responsive SVG Seating Canvas */}
        <div className="w-full flex justify-center overflow-auto py-4">
          <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }}>
            <svg width="600" height="400" viewBox="0 0 600 400" className="border border-slate-800/80 bg-slate-900/40 rounded-2xl shadow-2xl">
              {eventSeats.map((seatItem) => {
                const isSelected = selectedSeatIds.includes(seatItem.id);
                const isHeldByMe = seatItem.heldBySession === sessionId;
                const isSold = seatItem.status === 'SOLD';
                const isHeldOther = seatItem.status === 'HELD' && !isHeldByMe;

                let fill = seatItem.tier?.color || '#3b82f6';
                if (isSold) fill = '#e11d48'; // Rose/Red
                else if (isHeldByMe || isSelected) fill = '#f59e0b'; // Amber Gold
                else if (isHeldOther) fill = '#71717a'; // Muted Gray

                return (
                  <g
                    key={seatItem.id}
                    transform={`translate(${seatItem.seat.x}, ${seatItem.seat.y})`}
                    onClick={() => handleSeatClick(seatItem)}
                    className={`transition-all ${isSold ? 'cursor-not-allowed opacity-50' : 'cursor-pointer group'}`}
                  >
                    <rect
                      x="-14"
                      y="-14"
                      width="28"
                      height="28"
                      rx="7"
                      fill={fill}
                      stroke={isSelected ? '#ffffff' : fill}
                      strokeWidth={isSelected ? '2.5' : '1'}
                      className={`transition-transform ${!isSold ? 'group-hover:scale-125' : ''}`}
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
                      {seatItem.seat.rowLabel}{seatItem.seat.seatNumber}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Seats Bottom Cart Action Bar */}
        {selectedSeatIds.length > 0 && (
          <div className="w-full mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-300">Selected ({selectedSeatIds.length} seats)</div>
                <div className="text-xs text-slate-400 font-mono">
                  {selectedSeatsList.map((s) => `${s.seat.section} ${s.seat.rowLabel}-${s.seat.seatNumber}`).join(', ')}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Cart Amount</div>
                <div className="text-xl font-extrabold text-white font-mono">${totalPrice.toFixed(2)}</div>
              </div>

              <button
                onClick={() => setShowCheckoutModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all transform hover:scale-105"
              >
                <CreditCard className="w-4 h-4" />
                <span>Proceed to Stripe Checkout</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Stripe Connect Multi-Party Split Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {!checkoutSuccess ? (
              <>
                <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Stripe Connect Checkout</h3>
                    <p className="text-slate-400 text-xs">Automated Multi-Party Revenue Split Engine</p>
                  </div>
                </div>

                {/* Ticket Breakdown */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2 text-xs">
                  <div className="font-semibold text-slate-200 border-b border-slate-800 pb-2">
                    Order Summary ({selectedSeatsList.length} Tickets)
                  </div>
                  {selectedSeatsList.map((s) => (
                    <div key={s.id} className="flex justify-between text-slate-300">
                      <span>{s.seat.section} — Row {s.seat.rowLabel}, Seat {s.seat.seatNumber}</span>
                      <span className="font-mono text-emerald-400">${s.price.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-white">
                    <span>Total Amount Charged</span>
                    <span className="font-mono text-emerald-400 text-sm">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Stripe Connect Revenue Split Breakdown (FR-4.2) */}
                <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-2 text-xs">
                  <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Automated Stripe Destination Payout Split</span>
                  </div>

                  <div className="space-y-1.5 text-slate-400 pt-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span>1. SaaS Platform Retained Fee (5% + $1):</span>
                      <span className="text-purple-400">${saasFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2. Event Center Commission (10%):</span>
                      <span className="text-indigo-400">${venueCommission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-emerald-400">
                      <span>3. Organizer Net Ticket Payout:</span>
                      <span>${organizerNet.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleConfirmCheckout}
                  disabled={processingPayment}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>{processingPayment ? 'Processing Transaction...' : `Pay $${totalPrice.toFixed(2)} & Issue Digital Passes`}</span>
                </button>
              </>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-extrabold text-white">Order Confirmed!</h3>
                <p className="text-slate-300 text-xs">
                  Your physical seats are now converted to <span className="text-emerald-400 font-bold">SOLD</span> status. Cryptographic HMAC-SHA256 digital passes issued!
                </p>

                <div className="bg-slate-950 rounded-xl p-4 text-xs text-slate-300 space-y-1 text-left font-mono">
                  <div>Order ID: {checkoutSuccess.orderId}</div>
                  <div>Tickets Issued: {checkoutSuccess.tickets?.length}</div>
                  <div>Attendee: {currentUser.name} ({currentUser.email})</div>
                </div>

                <button
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setCheckoutSuccess(null);
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-colors text-xs"
                >
                  Close & View Seating Map
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
