'use client';

import React, { useState } from 'react';
import { submitBookingRequest, approveBooking, rejectBooking } from '@/app/actions/eventActions';
import { useApp } from './AppContext';
import { CalendarCheck, Plus, CheckCircle2, XCircle, AlertTriangle, Building2, Clock, Sparkles } from 'lucide-react';

interface HallItem {
  id: string;
  name: string;
  capacity: number;
}

interface BookingItem {
  id: string;
  eventTitle: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  rentalFee: number;
  status: string;
  rejectionReason?: string | null;
  hall: {
    name: string;
  };
  organizer: {
    name: string;
    email: string;
  };
}

interface BookingsClientProps {
  halls: HallItem[];
  bookings: BookingItem[];
}

export const BookingsClient: React.FC<BookingsClientProps> = ({ halls, bookings: initialBookings }) => {
  const { currentUser, currentTenant } = useApp();
  const [bookings, setBookings] = useState<BookingItem[]>(initialBookings);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);

  // Form State
  const [selectedHallId, setSelectedHallId] = useState(halls[0]?.id || '');
  const [eventTitle, setEventTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [rentalFee, setRentalFee] = useState('2500');

  // Rejection Modal State (FR-1.3)
  const [rejectModalBookingId, setRejectModalBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const formData = new FormData();
    formData.append('hallId', selectedHallId);
    formData.append('tenantId', currentTenant.id);
    formData.append('organizerId', currentUser.id);
    formData.append('eventTitle', eventTitle);
    formData.append('description', description);
    formData.append('startTime', startTime);
    formData.append('endTime', endTime);
    formData.append('rentalFee', rentalFee);

    try {
      const res = await submitBookingRequest(formData);
      if (res.success) {
        setMsg({ type: 'success', text: res.message || 'Booking request submitted!' });
        setShowNewBookingModal(false);
        setEventTitle('');
        setDescription('');
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed to submit booking.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error submitting booking' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId: string) => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await approveBooking(bookingId);
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: 'APPROVED' } : b))
        );
        setMsg({ type: 'success', text: res.message || 'Booking approved!' });
      } else {
        setMsg({ type: 'error', text: res.error || 'Approval failed.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Approval error' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalBookingId) return;
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      setMsg({ type: 'error', text: 'FR-1.3 Mandatory Rejection Reason: Input required.' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const res = await rejectBooking(rejectModalBookingId, rejectionReason);
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === rejectModalBookingId ? { ...b, status: 'REJECTED', rejectionReason } : b
          )
        );
        setMsg({ type: 'success', text: res.message || 'Booking request rejected.' });
        setRejectModalBookingId(null);
        setRejectionReason('');
      } else {
        setMsg({ type: 'error', text: res.error || 'Rejection failed.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Rejection error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <CalendarCheck className="w-4 h-4" />
            <span>Collision-Free Hall Scheduling Queue</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">Hall Reservations & Approvals</h1>
          <p className="text-slate-400 text-xs mt-1">
            Enforces temporal exclusion constraints (FR-1.2) & provisions linked event drafts upon approval (FR-1.4).
          </p>
        </div>

        <button
          onClick={() => setShowNewBookingModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Request Hall Booking</span>
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center space-x-3 border ${
            msg.type === 'success' ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800' : 'bg-rose-950/50 text-rose-300 border-rose-800'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Bookings Queue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.map((b) => {
          const isPending = b.status === 'PENDING';
          const isApproved = b.status === 'APPROVED';
          const isRejected = b.status === 'REJECTED';

          return (
            <div
              key={b.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    {b.hall.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                      isApproved
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : isRejected
                        ? 'bg-rose-950 text-rose-400 border-rose-800'
                        : 'bg-amber-950 text-amber-400 border-amber-800'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">{b.eventTitle}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{b.description || 'No description provided.'}</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5 text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Start: {new Date(b.startTime).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>End: {new Date(b.endTime).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1.5 font-mono text-[11px]">
                  <span className="text-slate-400">Rental Fee:</span>
                  <span className="text-emerald-400 font-bold">${b.rentalFee.toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-slate-400 pt-0.5">
                  Promoter: <strong className="text-slate-200">{b.organizer.name}</strong>
                </div>
              </div>

              {isRejected && b.rejectionReason && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-[11px] text-rose-300 space-y-0.5">
                  <div className="font-bold text-rose-400 uppercase tracking-wider text-[9px]">Rejection Reason Logged</div>
                  <div>{b.rejectionReason}</div>
                </div>
              )}

              {/* Admin Review Approval Queue Actions */}
              {isPending && (currentUser.role === 'PLATFORM_ADMIN' || currentUser.role === 'VENUE_OWNER' || currentUser.role === 'VENUE_MANAGER') && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setRejectModalBookingId(b.id)}
                    className="py-2 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 text-xs font-semibold rounded-xl border border-slate-700 hover:border-rose-800 flex items-center justify-center space-x-1 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reject Request</span>
                  </button>

                  <button
                    onClick={() => handleApprove(b.id)}
                    disabled={loading}
                    className="py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center justify-center space-x-1 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Booking</span>
                  </button>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* New Booking Form Modal (FR-1.1 & FR-1.2) */}
      {showNewBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <CalendarCheck className="w-5 h-5 text-amber-400" />
              <span>Submit Hall Reservation Request</span>
            </h3>

            <form onSubmit={handleSubmitBooking} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Hall</label>
                <select
                  value={selectedHallId}
                  onChange={(e) => setSelectedHallId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (Capacity: {h.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Annual Symphony Gala 2026"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event details..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Date/Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Date/Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Rental Fee ($)</label>
                <input
                  type="number"
                  value={rentalFee}
                  onChange={(e) => setRentalFee(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBookingModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory Rejection Reason Modal (FR-1.3) */}
      {rejectModalBookingId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              <span>Reject Hall Booking Request</span>
            </h3>

            <p className="text-xs text-slate-400">
              FR-1.3 Enforcement: Rejecting a booking request requires entering a mandatory rejection reason for audit logging.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mandatory Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter mandatory rejection reason (e.g. Schedule overlap, hall under maintenance)..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setRejectModalBookingId(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
              >
                Back
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={loading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Rejecting...' : 'Log & Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
