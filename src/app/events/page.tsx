import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SeatPickerCanvas } from '@/components/SeatPickerCanvas';
import { Ticket, Calendar, MapPin, ArrowRight } from 'lucide-react';

export const revalidate = 0;

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    include: {
      tenant: { select: { name: true } },
      eventSeats: {
        include: {
          seat: true,
          tier: true,
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  const featuredEvent = events[0];

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Ticket className="w-4 h-4" />
            <span>Interactive SVG Seat Picker Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">Published Events Showcase</h1>
          <p className="text-slate-400 text-xs mt-1">
            Pick physical seats on responsive SVG map, 10-minute hold concurrency, & multi-party Stripe Connect checkout.
          </p>
        </div>
      </div>

      {featuredEvent && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Live Interactive SVG Seat Selection: {featuredEvent.title}</span>
          </div>

          <SeatPickerCanvas
            eventId={featuredEvent.id}
            eventTitle={featuredEvent.title}
            eventStartTime={featuredEvent.startTime.toISOString()}
            eventSeats={featuredEvent.eventSeats.map((es) => ({
              id: es.id,
              seatId: es.seatId,
              status: es.status as any,
              price: es.price,
              holdExpiresAt: es.holdExpiresAt?.toISOString(),
              heldBySession: es.heldBySession,
              seat: es.seat,
              tier: es.tier,
            }))}
          />
        </div>
      )}

      {/* Events Cards */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-white">All Scheduled Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((e) => (
            <div key={e.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
              {e.bannerUrl && (
                <img src={e.bannerUrl} alt={e.title} className="w-full h-44 object-cover" />
              )}
              <div className="p-6 space-y-3">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  {e.tenant.name}
                </span>
                <h3 className="text-xl font-bold text-white">{e.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{e.description}</p>
                <div className="text-xs text-slate-300 font-mono flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>{new Date(e.startTime).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
