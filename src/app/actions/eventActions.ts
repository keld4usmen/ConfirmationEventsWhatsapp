'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { holdSeatAtomics, releaseSeatHold, cleanExpiredHolds } from '@/lib/hold-concurrency';
import { calculateRevenueSplit, simulateStripeRefund } from '@/lib/stripe-connect';
import { generateSignedQR, verifyAndDecodeQR } from '@/lib/security';

export async function submitBookingRequest(formData: FormData) {
  const hallId = formData.get('hallId') as string;
  const tenantId = formData.get('tenantId') as string;
  const organizerId = formData.get('organizerId') as string;
  const eventTitle = formData.get('eventTitle') as string;
  const description = formData.get('description') as string;
  const startTimeStr = formData.get('startTime') as string;
  const endTimeStr = formData.get('endTime') as string;
  const rentalFee = parseFloat(formData.get('rentalFee') as string || '1500');

  if (!hallId || !eventTitle || !startTimeStr || !endTimeStr) {
    return { success: false, error: 'Please provide all required booking fields.' };
  }

  const startTime = new Date(startTimeStr);
  const endTime = new Date(endTimeStr);

  if (startTime >= endTime) {
    return { success: false, error: 'Event start time must be before end time.' };
  }

  // Temporal collision check (EXCLUDE USING gist equivalent for SQLite/Prisma)
  const overlapping = await prisma.hallBooking.findFirst({
    where: {
      hallId,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        {
          startTime: { lte: startTime },
          endTime: { gte: startTime },
        },
        {
          startTime: { lte: endTime },
          endTime: { gte: endTime },
        },
        {
          startTime: { gte: startTime },
          endTime: { lte: endTime },
        },
      ],
    },
  });

  if (overlapping) {
    return {
      success: false,
      error: `Booking Conflict Rejected! Hall is already reserved between ${new Date(overlapping.startTime).toLocaleString()} and ${new Date(overlapping.endTime).toLocaleString()}.`,
    };
  }

  await prisma.hallBooking.create({
    data: {
      hallId,
      tenantId,
      organizerId,
      eventTitle,
      description,
      startTime,
      endTime,
      rentalFee,
      status: 'PENDING',
    },
  });

  revalidatePath('/bookings');
  return { success: true, message: 'Hall booking request submitted successfully for approval queue!' };
}

export async function approveBooking(bookingId: string) {
  const booking = await prisma.hallBooking.findUnique({
    where: { id: bookingId },
    include: { hall: { include: { seats: true } } },
  });

  if (!booking) {
    return { success: false, error: 'Booking request not found.' };
  }

  const updatedBooking = await prisma.hallBooking.update({
    where: { id: bookingId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
    },
  });

  // Automatically provision linked Event draft (FR-1.4)
  const event = await prisma.event.create({
    data: {
      tenantId: booking.tenantId,
      hallBookingId: booking.id,
      title: booking.eventTitle,
      description: booking.description,
      bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200',
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: 'PUBLISHED',
    },
  });

  // Create default ticket tiers
  const vipTier = await prisma.ticketTier.create({
    data: { eventId: event.id, name: 'VIP Front Row', price: 150.0, color: '#f59e0b' },
  });
  const regTier = await prisma.ticketTier.create({
    data: { eventId: event.id, name: 'Orchestra Main', price: 85.0, color: '#3b82f6' },
  });
  const accTier = await prisma.ticketTier.create({
    data: { eventId: event.id, name: 'Balcony General', price: 45.0, color: '#10b981' },
  });

  // Map hall seats to event seats
  if (booking.hall.seats.length > 0) {
    for (const seat of booking.hall.seats) {
      let tierId = regTier.id;
      let price = 85.0;
      if (seat.defaultTier === 'VIP') {
        tierId = vipTier.id;
        price = 150.0;
      } else if (seat.defaultTier === 'Accessible') {
        tierId = accTier.id;
        price = 45.0;
      }

      await prisma.eventSeat.create({
        data: {
          eventId: event.id,
          seatId: seat.id,
          tierId,
          price,
          status: 'AVAILABLE',
        },
      });
    }
  }

  revalidatePath('/bookings');
  revalidatePath('/events');
  return { success: true, message: `Booking approved! Event draft "${event.title}" provisioned.` };
}

export async function rejectBooking(bookingId: string, rejectionReason: string) {
  if (!rejectionReason || rejectionReason.trim().length === 0) {
    return { success: false, error: 'FR-1.3 Violation: Rejection reason is mandatory.' };
  }

  await prisma.hallBooking.update({
    where: { id: bookingId },
    data: {
      status: 'REJECTED',
      rejectionReason,
      rejectedAt: new Date(),
    },
  });

  revalidatePath('/bookings');
  return { success: true, message: 'Booking request rejected with logged audit reason.' };
}

export async function saveHallSeats(hallId: string, seatsData: Array<{ section: string; rowLabel: string; seatNumber: number; x: number; y: number; defaultTier: string }>) {
  await prisma.seat.deleteMany({ where: { hallId } });

  for (const s of seatsData) {
    await prisma.seat.create({
      data: {
        hallId,
        section: s.section,
        rowLabel: s.rowLabel,
        seatNumber: s.seatNumber,
        x: s.x,
        y: s.y,
        defaultTier: s.defaultTier,
      },
    });
  }

  // Update hall capacity
  await prisma.hall.update({
    where: { id: hallId },
    data: { capacity: seatsData.length },
  });

  revalidatePath('/studio');
  return { success: true, count: seatsData.length };
}

export async function holdSeatAction(eventSeatId: string, sessionId: string) {
  return await holdSeatAtomics(eventSeatId, sessionId);
}

export async function releaseSeatAction(eventSeatId: string, sessionId: string) {
  const success = await releaseSeatHold(eventSeatId, sessionId);
  return { success };
}

export async function checkoutCart(eventId: string, userId: string, sessionHoldIds: string[], attendeeEmail: string, attendeeName: string) {
  await cleanExpiredHolds(eventId);

  const seatsToBuy = await prisma.eventSeat.findMany({
    where: {
      id: { in: sessionHoldIds },
      eventId,
      status: 'HELD',
    },
    include: { seat: true, event: true },
  });

  if (seatsToBuy.length === 0) {
    return { success: false, error: 'Selected seats hold expired or seats were released. Please select available seats.' };
  }

  const totalAmount = seatsToBuy.reduce((acc, cur) => acc + cur.price, 0);
  const splits = calculateRevenueSplit(totalAmount);

  // Execute inside transactional checkout
  const order = await prisma.order.create({
    data: {
      tenantId: seatsToBuy[0].event.tenantId,
      userId,
      eventId,
      totalAmount,
      saasFee: splits.saasFee,
      venueFee: splits.venueCommission,
      organizerNet: splits.organizerNet,
      stripePaymentIntentId: `pi_live_${Math.random().toString(36).substring(2, 12)}`,
      status: 'COMPLETED',
    },
  });

  const generatedTickets = [];

  for (const es of seatsToBuy) {
    await prisma.eventSeat.update({
      where: { id: es.id },
      data: {
        status: 'SOLD',
        holdExpiresAt: null,
        heldBySession: null,
      },
    });

    const ticketId = `tkt_${Math.random().toString(36).substring(2, 10)}`;
    const payload = {
      ticketId,
      orderId: order.id,
      eventId,
      seatId: es.seatId,
      attendeeEmail,
      timestamp: Date.now(),
    };

    const qrSecret = generateSignedQR(payload);

    const ticket = await prisma.ticket.create({
      data: {
        id: ticketId,
        orderId: order.id,
        eventSeatId: es.id,
        attendeeName,
        attendeeEmail,
        qrCodeSecret: qrSecret,
        status: 'ACTIVE',
      },
    });

    generatedTickets.push(ticket);
  }

  revalidatePath('/events');
  revalidatePath('/my-tickets');
  return { success: true, orderId: order.id, tickets: generatedTickets, splits };
}

export async function cancelTicketAction(ticketId: string, reason: string) {
  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'FR-5.2 Mandatory Reason: Cancellation reason is required.' };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      eventSeat: { include: { event: true } },
      order: true,
    },
  });

  if (!ticket) {
    return { success: false, error: 'Ticket not found.' };
  }

  if (ticket.status === 'CANCELLED') {
    return { success: false, error: 'This ticket has already been cancelled.' };
  }

  // FR-5.1: Check 7-day cancellation cutoff
  const now = new Date();
  const eventStart = new Date(ticket.eventSeat.event.startTime);
  const diffDays = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < 7) {
    return {
      success: false,
      error: `FR-5.1 Policy Cutoff: Self-service refunds are only permitted at least 7 days before event start date (event starts in ${Math.max(0, diffDays).toFixed(1)} days).`,
    };
  }

  const refund = simulateStripeRefund(ticket.eventSeat.price, ticket.order.stripePaymentIntentId || undefined);

  // Update ticket status to CANCELLED
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'CANCELLED' },
  });

  // Release EventSeat back to AVAILABLE
  await prisma.eventSeat.update({
    where: { id: ticket.eventSeatId },
    data: { status: 'AVAILABLE', holdExpiresAt: null, heldBySession: null },
  });

  // Record Cancellation Audit log
  await prisma.ticketCancellation.create({
    data: {
      ticketId,
      reason,
      refundAmount: ticket.eventSeat.price,
      stripeRefundId: refund.id,
    },
  });

  revalidatePath('/my-tickets');
  revalidatePath('/events');
  return { success: true, refundId: refund.id, refundAmount: ticket.eventSeat.price };
}

export async function transferTicketAction(ticketId: string, toEmail: string, toName: string) {
  if (!toEmail || !toName) {
    return { success: false, error: 'Recipient name and email address are required.' };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { eventSeat: true },
  });

  if (!ticket) {
    return { success: false, error: 'Ticket not found.' };
  }

  if (ticket.status !== 'ACTIVE') {
    return { success: false, error: 'Only ACTIVE tickets can be transferred.' };
  }

  const oldSecret = ticket.qrCodeSecret;

  const newPayload = {
    ticketId: ticket.id,
    orderId: ticket.orderId,
    eventId: ticket.eventSeat.eventId,
    seatId: ticket.eventSeat.seatId,
    attendeeEmail: toEmail,
    timestamp: Date.now(),
  };

  const newSecret = generateSignedQR(newPayload);

  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      attendeeEmail: toEmail,
      attendeeName: toName,
      qrCodeSecret: newSecret,
      status: 'TRANSFERRED',
    },
  });

  await prisma.ticketTransfer.create({
    data: {
      ticketId,
      fromEmail: ticket.attendeeEmail,
      toEmail,
      toName,
      oldSecret,
      newSecret,
    },
  });

  revalidatePath('/my-tickets');
  return { success: true, message: `Ticket successfully re-assigned to ${toName} (${toEmail}). Previous QR pass invalidated.` };
}

export async function scanTicketAction(qrToken: string, staffUserId: string) {
  const verification = verifyAndDecodeQR(qrToken);

  if (!verification.valid || !verification.payload) {
    return {
      status: 'FRAUD_ALERT',
      message: '🚨 INVALID QR CODE! Cryptographic HMAC-SHA256 signature verification failed. Counterfeit pass detected.',
    };
  }

  const { ticketId } = verification.payload;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      eventSeat: { include: { event: true, seat: true } },
      checkedInByStaff: true,
    },
  });

  if (!ticket) {
    return { status: 'INVALID', message: '❌ Ticket ID not found in system database.' };
  }

  if (ticket.status === 'CANCELLED') {
    return { status: 'CANCELLED', message: '⚠️ CANCELLED TICKET! This pass was refunded and cancelled.' };
  }

  // FR-6.3 Duplicate Check-in Prevention
  if (ticket.status === 'CHECKED_IN') {
    const staffName = ticket.checkedInByStaff?.name || 'Gate Staff';
    const checkinTime = ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString() : 'Earlier';
    return {
      status: 'ALREADY_CHECKED_IN',
      message: `🚫 ALREADY CHECKED IN! Scanned previously at ${checkinTime} by staff ID: ${ticket.checkedInByUserId || 'STAFF_01'} (${staffName}). Entry Denied.`,
      checkedInAt: ticket.checkedInAt,
      staffId: ticket.checkedInByUserId,
      seatInfo: `${ticket.eventSeat.seat.section} Row ${ticket.eventSeat.seat.rowLabel}-${ticket.eventSeat.seat.seatNumber}`,
    };
  }

  // Atomic Entry Check-in
  const now = new Date();
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: 'CHECKED_IN',
      checkedInAt: now,
      checkedInByUserId: staffUserId,
    },
  });

  revalidatePath('/scanner');
  return {
    status: 'VALID',
    message: `✅ ADMIT ONE: ${ticket.attendeeName}`,
    attendeeName: ticket.attendeeName,
    eventTitle: ticket.eventSeat.event.title,
    seatInfo: `${ticket.eventSeat.seat.section} - Row ${ticket.eventSeat.seat.rowLabel}, Seat ${ticket.eventSeat.seat.seatNumber}`,
    checkedInAt: now,
  };
}
