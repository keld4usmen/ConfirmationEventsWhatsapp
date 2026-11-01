import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { 
  Building2, 
  Sparkles, 
  CalendarCheck, 
  Ticket, 
  QrCode, 
  ShieldCheck, 
  UserCheck, 
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Zap
} from 'lucide-react';

export default async function OverviewPage() {
  const tenantsCount = await prisma.tenant.count();
  const hallsCount = await prisma.hall.count();
  const eventsCount = await prisma.event.count();
  const ticketsCount = await prisma.ticket.count();
  const totalOrders = await prisma.order.aggregate({
    _sum: { totalAmount: true },
  });

  const gmv = totalOrders._sum.totalAmount || 0;

  return (
    <div className="space-y-8">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-8 md:p-12 shadow-2xl">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>PRD Compliant — Q3 2026 Release</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Multi-Tenant Event Center Management & Ticketing SaaS
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            An end-to-end operational suite spanning collision-free hall booking, an interactive SVG seat layout studio, 10-minute hold concurrency, Stripe Connect multi-party revenue splitting, and zero-install mobile HMAC-SHA256 QR gate scanning.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            <Link
              href="/events"
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all transform hover:scale-105"
            >
              <Ticket className="w-4 h-4" />
              <span>Explore Interactive SVG Seat Picker</span>
            </Link>

            <Link
              href="/studio"
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center space-x-2 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Open Admin Seating Studio</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="text-slate-400 text-xs font-medium">Gross Merchandise Volume</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">${gmv.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="text-slate-400 text-xs font-medium">Provisioned Tenants</div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">{tenantsCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="text-slate-400 text-xs font-medium">Acoustic Halls</div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">{hallsCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="text-slate-400 text-xs font-medium">Cryptographic Passes</div>
          <div className="text-2xl font-extrabold text-teal-400 font-mono mt-1">{ticketsCount}</div>
        </div>
      </div>

      {/* Role Personas Quick Test Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span>Interactive Personas & Module Navigation</span>
        </h2>
        <p className="text-xs text-slate-400">
          Use the top-right persona switcher in the navbar to toggle between any of the 6 RBAC roles.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <Link href="/studio" className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl shadow-xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
              Hall Seating Layout Studio
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Bulk row generators, section coordinates, and default tier classifications (VIP, Regular, Accessible).
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-indigo-400">
              <span>Launch Studio Canvas</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/bookings" className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-6 rounded-2xl shadow-xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
              Collision-Free Hall Scheduling
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Temporal exclusion constraint checks rejecting overlapping hall reservations & provisioning linked events.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-400">
              <span>View Bookings Queue</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/events" className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl shadow-xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Ticket className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
              SVG Seat Picker & Concurrency Hold
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Pan-and-zoom interactive SVG seat map, 10-minute hold concurrency timer, and Stripe Connect revenue splits.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400">
              <span>Pick Seats & Checkout</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/scanner" className="bg-slate-900 border border-slate-800 hover:border-teal-500/50 p-6 rounded-2xl shadow-xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-teal-400 transition-colors">
              Gate Mobile QR Web Scanner
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              HMAC-SHA256 signature verification & duplicate entry check returning staff ID and check-in timestamp.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-teal-400">
              <span>Open Gate Scanner</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/my-tickets" className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-6 rounded-2xl shadow-xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
              7-Day Refund Policy & Ticket Transfer
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Self-service cancellation with mandatory reason text, instant Stripe refund, and secure QR transfers.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-cyan-400">
              <span>Manage Passes</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/admin" className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 p-6 rounded-2xl shadow-xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors">
              Super Admin Metrics Dashboard
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Global Gross Merchandise Volume (GMV), platform fee collections, and tenant onboarding stats.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-purple-400">
              <span>View Super Admin Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </div>

    </div>
  );
}
