'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cancelTicketAction, transferTicketAction } from '@/app/actions/eventActions';
import { Ticket as TicketIcon, RefreshCw, XCircle, Send, AlertCircle, CheckCircle2, QrCode } from 'lucide-react';

interface TicketItem {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  qrCodeSecret: string;
  status: string;
  checkedInAt?: any;
  eventSeat: {
    price: number;
    seat: {
      section: string;
      rowLabel: string;
      seatNumber: number;
    };
    event: {
      id: string;
      title: string;
      startTime: string;
      endTime: string;
      bannerUrl?: string | null;
      tenant: {
        name: string;
      };
    };
  };
}

interface MyTicketsClientProps {
  tickets: TicketItem[];
}

export const MyTicketsClient: React.FC<MyTicketsClientProps> = ({ tickets: initialTickets }) => {
  const [tickets, setTickets] = useState<TicketItem[]>(initialTickets);

  // Cancellation Modal State (FR-5.1 - FR-5.3)
  const [cancelModalTicket, setCancelModalTicket] = useState<TicketItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Transfer Modal State (FR-5.4)
  const [transferModalTicket, setTransferModalTicket] = useState<TicketItem | null>(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferName, setTransferName] = useState('');
  const [transferring, setTransferring] = useState(false);

  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConfirmCancel = async () => {
    if (!cancelModalTicket) return;
    if (!cancelReason || cancelReason.trim().length === 0) {
      setActionMsg({ type: 'error', text: 'FR-5.2 Violation: Cancellation reason is required.' });
      return;
    }

    setCancelling(true);
    setActionMsg(null);

    try {
      const res = await cancelTicketAction(cancelModalTicket.id, cancelReason);
      if (res.success) {
        setTickets((prev) =>
          prev.map((t) => (t.id === cancelModalTicket.id ? { ...t, status: 'CANCELLED' } : t))
        );
        setActionMsg({
          type: 'success',
          text: `Ticket cancelled and refunded $${res.refundAmount?.toFixed(2)} via Stripe (Refund ID: ${res.refundId}). Physical seat released back to AVAILABLE pool.`,
        });
        setCancelModalTicket(null);
        setCancelReason('');
      } else {
        setActionMsg({ type: 'error', text: res.error || 'Failed to cancel ticket.' });
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Error processing cancellation' });
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferModalTicket) return;
    if (!transferEmail || !transferName) {
      setActionMsg({ type: 'error', text: 'Please fill out recipient name and email.' });
      return;
    }

    setTransferring(true);
    setActionMsg(null);

    try {
      const res = await transferTicketAction(transferModalTicket.id, transferEmail, transferName);
      if (res.success) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === transferModalTicket.id
              ? { ...t, attendeeName: transferName, attendeeEmail: transferEmail, status: 'TRANSFERRED' }
              : t
          )
        );
        setActionMsg({ type: 'success', text: res.message || 'Ticket transferred successfully!' });
        setTransferModalTicket(null);
        setTransferEmail('');
        setTransferName('');
      } else {
        setActionMsg({ type: 'error', text: res.error || 'Transfer failed.' });
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Error executing ticket transfer' });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <TicketIcon className="w-4 h-4" />
            <span>Attendee Digital Passes & Self-Service Portal</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">My Digital Passes & Transfers</h1>
          <p className="text-slate-400 text-xs mt-1">
            Access HMAC-SHA256 encrypted QR passes, execute 7-day self-service refunds, or transfer passes securely.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center space-x-3 border ${
            actionMsg.type === 'success' ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800' : 'bg-rose-950/50 text-rose-300 border-rose-800'
          }`}
        >
          {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tickets.map((t) => {
          const isCancelled = t.status === 'CANCELLED';
          const isCheckedIn = t.status === 'CHECKED_IN';
          const isTransferred = t.status === 'TRANSFERRED';

          return (
            <div
              key={t.id}
              className={`bg-slate-900 border rounded-2xl p-6 shadow-xl relative flex flex-col justify-between space-y-4 ${
                isCancelled ? 'border-rose-900/40 opacity-60' : 'border-slate-800'
              }`}
            >
              
              {/* Event Header Info */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                    {t.eventSeat.event.tenant.name}
                  </span>
                  <h3 className="text-lg font-bold text-white leading-snug">{t.eventSeat.event.title}</h3>
                  <div className="text-xs text-slate-400 mt-1">
                    📅 {new Date(t.eventSeat.event.startTime).toLocaleString()}
                  </div>
                </div>

                <div
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                    isCheckedIn
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : isCancelled
                      ? 'bg-rose-950 text-rose-400 border-rose-800'
                      : isTransferred
                      ? 'bg-indigo-950 text-indigo-400 border-indigo-800'
                      : 'bg-cyan-950 text-cyan-400 border-cyan-800'
                  }`}
                >
                  {t.status}
                </div>
              </div>

              {/* Physical Seat & QR Code Container */}
              <div className="grid grid-cols-3 gap-4 items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="col-span-2 space-y-1 text-xs">
                  <div className="text-slate-400">Assigned Seat:</div>
                  <div className="text-base font-extrabold text-white">
                    {t.eventSeat.seat.section}
                  </div>
                  <div className="text-xs font-mono text-cyan-400">
                    Row {t.eventSeat.seat.rowLabel} — Seat {t.eventSeat.seat.seatNumber}
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1">
                    Pass Holder: <strong className="text-slate-200">{t.attendeeName}</strong>
                  </div>
                </div>

                <div className="col-span-1 flex flex-col items-center justify-center p-2 bg-white rounded-lg shadow-inner">
                  {!isCancelled ? (
                    <QRCodeSVG value={t.qrCodeSecret} size={85} />
                  ) : (
                    <XCircle className="w-16 h-16 text-rose-500" />
                  )}
                  <span className="text-[8px] text-slate-600 font-mono mt-1 text-center truncate max-w-[85px]">
                    HMAC-SHA256
                  </span>
                </div>
              </div>

              {/* Action Buttons: Refund & Transfer */}
              {!isCancelled && !isCheckedIn && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setCancelModalTicket(t)}
                    className="py-2 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 text-xs font-semibold rounded-xl border border-slate-700 hover:border-rose-800 flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Self-Service Refund</span>
                  </button>

                  <button
                    onClick={() => setTransferModalTicket(t)}
                    className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Transfer Pass</span>
                  </button>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Cancellation Modal (FR-5.1 - FR-5.3) */}
      {cancelModalTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <span>Cancel Ticket & Process Instant Refund</span>
            </h3>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-300">
              <div>Event: {cancelModalTicket.eventSeat.event.title}</div>
              <div>Refund Amount: <span className="font-mono text-emerald-400">${cancelModalTicket.eventSeat.price.toFixed(2)}</span></div>
              <div className="text-[10px] text-slate-400 pt-1">
                Note: Standard policy permits instant refund if cancelled at least 7 days before event start.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mandatory Cancellation Reason (FR-5.2)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please enter reason for cancellation (e.g. Schedule conflict, illness)..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCancelModalTicket(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
              >
                Keep Ticket
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {cancelling ? 'Refunding...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Pass Modal (FR-5.4) */}
      {transferModalTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Send className="w-5 h-5 text-indigo-400" />
              <span>Secure Ticket Transfer (FR-5.4)</span>
            </h3>

            <p className="text-xs text-slate-400">
              Re-assign this pass to a new attendee. The previous QR pass will be immediately invalidated and a new HMAC-SHA256 signed QR pass issued.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Recipient Full Name</label>
                <input
                  type="text"
                  value={transferName}
                  onChange={(e) => setTransferName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Recipient Email Address</label>
                <input
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  placeholder="e.g. john.doe@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTransferModalTicket(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransfer}
                disabled={transferring}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {transferring ? 'Transferring...' : 'Transfer Ticket Pass'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
