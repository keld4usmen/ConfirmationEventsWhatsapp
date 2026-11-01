import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const HMAC_SECRET = process.env.QR_HMAC_SECRET || 'event-saas-hmac-secret-key-2026';

function generateSignedQR(payload) {
  const dataString = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', HMAC_SECRET).update(dataString).digest('hex');
  const signedObj = { payload, sig };
  return Buffer.from(JSON.stringify(signedObj)).toString('base64url');
}

async function main() {
  console.log('🌱 Clearing existing database records...');
  await prisma.ticketTransfer.deleteMany({});
  await prisma.ticketCancellation.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.eventSeat.deleteMany({});
  await prisma.ticketTier.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.hallBooking.deleteMany({});
  await prisma.seat.deleteMany({});
  await prisma.hall.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('👤 Seeding Users with RBAC Roles...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@saas.com',
      name: 'Platform Super Admin',
      role: 'PLATFORM_ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const venueOwner = await prisma.user.create({
    data: {
      email: 'owner@grandhorizon.com',
      name: 'Eleanor Vance (Venue Director)',
      role: 'VENUE_OWNER',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    },
  });

  const venueManager = await prisma.user.create({
    data: {
      email: 'manager@grandhorizon.com',
      name: 'Marcus Brody (Operations Manager)',
      role: 'VENUE_MANAGER',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    },
  });

  const venueScanner = await prisma.user.create({
    data: {
      email: 'scanner@grandhorizon.com',
      name: 'David Gatekeeper (Door Staff)',
      role: 'VENUE_SCANNER',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@symphony.com',
      name: 'Arthur Pendelton (Concert Promoter)',
      role: 'ORGANIZER',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });

  const attendee1 = await prisma.user.create({
    data: {
      email: 'sarah.johnson@gmail.com',
      name: 'Sarah Johnson',
      role: 'ATTENDEE',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const attendee2 = await prisma.user.create({
    data: {
      email: 'michael.brown@gmail.com',
      name: 'Michael Brown',
      role: 'ATTENDEE',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    },
  });

  console.log('🏢 Seeding Multi-Tenant Event Centers...');
  const grandHorizon = await prisma.tenant.create({
    data: {
      name: 'Grand Horizon Center',
      slug: 'grand-horizon',
      domain: 'grand-horizon.platform.com',
      logoUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=300',
      stripeAccountId: 'acct_1GrandHorizon9988',
    },
  });

  const royalAuditorium = await prisma.tenant.create({
    data: {
      name: 'Royal Music Auditorium',
      slug: 'royal-auditorium',
      domain: 'tickets.royalauditorium.com',
      logoUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300',
      stripeAccountId: 'acct_1RoyalAuditorium7766',
    },
  });

  console.log('🔗 Seeding Tenant Memberships...');
  await prisma.membership.createMany({
    data: [
      { tenantId: grandHorizon.id, userId: venueOwner.id, role: 'VENUE_OWNER' },
      { tenantId: grandHorizon.id, userId: venueManager.id, role: 'VENUE_MANAGER' },
      { tenantId: grandHorizon.id, userId: venueScanner.id, role: 'VENUE_SCANNER' },
      { tenantId: royalAuditorium.id, userId: venueOwner.id, role: 'VENUE_OWNER' },
    ],
  });

  console.log('🏛️ Seeding Halls & Seating Layout Studio Matrices...');
  const ballroom = await prisma.hall.create({
    data: {
      tenantId: grandHorizon.id,
      name: 'Grand Symphony Hall',
      description: 'A state-of-the-art acoustic hall featuring dual orchestra wings and elevated VIP seating.',
      capacity: 40,
    },
  });

  const seatsToCreate = [];
  const rows = ['A', 'B', 'C', 'D'];
  const sections = [
    { name: 'VIP Front Row', rows: ['A'], defaultTier: 'VIP', color: '#f59e0b', yOffset: 60 },
    { name: 'Orchestra Main', rows: ['B', 'C'], defaultTier: 'Regular', color: '#3b82f6', yOffset: 160 },
    { name: 'Balcony Suite', rows: ['D'], defaultTier: 'Accessible', color: '#10b981', yOffset: 300 },
  ];

  sections.forEach((sec) => {
    sec.rows.forEach((r, rIdx) => {
      for (let num = 1; num <= 10; num++) {
        // Calculate spatial x, y coordinates for SVG layout canvas
        const startX = 100;
        const spacingX = 45;
        const x = startX + (num - 1) * spacingX;
        const y = sec.yOffset + rIdx * 45;

        seatsToCreate.push({
          hallId: ballroom.id,
          section: sec.name,
          rowLabel: r,
          seatNumber: num,
          x,
          y,
          defaultTier: sec.defaultTier,
        });
      }
    });
  });

  for (const s of seatsToCreate) {
    await prisma.seat.create({ data: s });
  }

  const createdSeats = await prisma.seat.findMany({ where: { hallId: ballroom.id } });
  console.log(`✅ Created ${createdSeats.length} interactive spatial seats.`);

  console.log('📅 Seeding Hall Bookings & Exclusion Checks...');
  const now = new Date();
  const nextWeekStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextWeekEnd = new Date(nextWeekStart.getTime() + 4 * 60 * 60 * 1000);

  const approvedBooking = await prisma.hallBooking.create({
    data: {
      hallId: ballroom.id,
      organizerId: organizer.id,
      tenantId: grandHorizon.id,
      eventTitle: 'Gala Symphony Night 2026',
      description: 'An enchanting evening of classical masterpieces performed live.',
      startTime: nextWeekStart,
      endTime: nextWeekEnd,
      rentalFee: 2500.0,
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });

  const pendingBooking = await prisma.hallBooking.create({
    data: {
      hallId: ballroom.id,
      organizerId: organizer.id,
      tenantId: grandHorizon.id,
      eventTitle: 'Global AI Summit 2026',
      description: 'Keynotes and workshops on frontier AI models.',
      startTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
      rentalFee: 4500.0,
      status: 'PENDING',
    },
  });

  const rejectedBooking = await prisma.hallBooking.create({
    data: {
      hallId: ballroom.id,
      organizerId: organizer.id,
      tenantId: grandHorizon.id,
      eventTitle: 'Midsummer Rock Fest',
      description: 'Live heavy rock concert request.',
      startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
      rentalFee: 3000.0,
      status: 'REJECTED',
      rejectionReason: 'Hall undergoing scheduled acoustic ceiling damper maintenance during this window.',
      rejectedAt: new Date(),
    },
  });

  console.log('🎟️ Provisioning Linked Event & Ticket Tiers...');
  const event = await prisma.event.create({
    data: {
      tenantId: grandHorizon.id,
      hallBookingId: approvedBooking.id,
      title: 'Gala Symphony Night 2026',
      description: 'Experience Beethoven and Mozart live in the pristine acoustic Grand Symphony Hall.',
      bannerUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200',
      startTime: nextWeekStart,
      endTime: nextWeekEnd,
      status: 'PUBLISHED',
    },
  });

  const vipTier = await prisma.ticketTier.create({
    data: {
      eventId: event.id,
      name: 'VIP Front Row',
      price: 150.0,
      color: '#f59e0b',
    },
  });

  const regTier = await prisma.ticketTier.create({
    data: {
      eventId: event.id,
      name: 'Orchestra Main',
      price: 85.0,
      color: '#3b82f6',
    },
  });

  const accTier = await prisma.ticketTier.create({
    data: {
      eventId: event.id,
      name: 'Balcony General',
      price: 45.0,
      color: '#10b981',
    },
  });

  console.log('🪑 Mapping Seats to EventSeats with Statuses...');
  for (const s of createdSeats) {
    let tierId = regTier.id;
    let price = 85.0;
    if (s.defaultTier === 'VIP') {
      tierId = vipTier.id;
      price = 150.0;
    } else if (s.defaultTier === 'Accessible') {
      tierId = accTier.id;
      price = 45.0;
    }

    let status = 'AVAILABLE';
    // Mark a few seats as SOLD or HELD for real demo testing
    if (s.rowLabel === 'A' && (s.seatNumber === 1 || s.seatNumber === 2)) {
      status = 'SOLD';
    } else if (s.rowLabel === 'B' && s.seatNumber === 5) {
      status = 'HELD';
    }

    await prisma.eventSeat.create({
      data: {
        eventId: event.id,
        seatId: s.id,
        tierId: tierId,
        status: status,
        price: price,
        holdExpiresAt: status === 'HELD' ? new Date(now.getTime() + 10 * 60 * 1000) : null,
        heldBySession: status === 'HELD' ? 'session_demo_123' : null,
      },
    });
  }

  console.log('💳 Seeding Initial Orders & Cryptographic HMAC QR Passes...');
  const soldEventSeats = await prisma.eventSeat.findMany({
    where: { eventId: event.id, status: 'SOLD' },
    include: { seat: true },
  });

  const totalOrderAmount = soldEventSeats.reduce((acc, curr) => acc + curr.price, 0);
  const saasFee = Math.round((totalOrderAmount * 0.05 + 1.0) * 100) / 100;
  const venueFee = Math.round((totalOrderAmount * 0.10) * 100) / 100;
  const organizerNet = Math.round((totalOrderAmount - saasFee - venueFee) * 100) / 100;

  const order = await prisma.order.create({
    data: {
      tenantId: grandHorizon.id,
      userId: attendee1.id,
      eventId: event.id,
      totalAmount: totalOrderAmount,
      saasFee,
      venueFee,
      organizerNet,
      stripePaymentIntentId: 'pi_3M0000000000000001',
      status: 'COMPLETED',
    },
  });

  for (const es of soldEventSeats) {
    const payload = {
      ticketId: `tkt_${es.id.substring(0, 8)}`,
      orderId: order.id,
      eventId: event.id,
      seatId: es.seatId,
      attendeeEmail: attendee1.email,
      timestamp: Date.now(),
    };

    const qrSecret = generateSignedQR(payload);

    await prisma.ticket.create({
      data: {
        id: payload.ticketId,
        orderId: order.id,
        eventSeatId: es.id,
        attendeeName: attendee1.name,
        attendeeEmail: attendee1.email,
        qrCodeSecret: qrSecret,
        status: 'ACTIVE',
      },
    });
  }

  console.log('✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
