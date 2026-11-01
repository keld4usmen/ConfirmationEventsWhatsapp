import { prisma } from './prisma';

export const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export async function cleanExpiredHolds(eventId?: string) {
  const now = new Date();
  const whereClause: any = {
    status: 'HELD',
    holdExpiresAt: { lte: now },
  };
  if (eventId) {
    whereClause.eventId = eventId;
  }

  await prisma.eventSeat.updateMany({
    where: whereClause,
    data: {
      status: 'AVAILABLE',
      holdExpiresAt: null,
      heldBySession: null,
    },
  });
}

export async function holdSeatAtomics(eventSeatId: string, sessionId: string): Promise<{ success: boolean; message?: string; expiresAt?: Date }> {
  await cleanExpiredHolds();

  const seat = await prisma.eventSeat.findUnique({
    where: { id: eventSeatId },
  });

  if (!seat) {
    return { success: false, message: 'Seat not found.' };
  }

  if (seat.status === 'SOLD') {
    return { success: false, message: 'This seat has already been purchased by another attendee.' };
  }

  if (seat.status === 'HELD' && seat.heldBySession !== sessionId) {
    if (seat.holdExpiresAt && seat.holdExpiresAt > new Date()) {
      return { success: false, message: 'This seat is currently held by another user. Please select another seat.' };
    }
  }

  const expiresAt = new Date(Date.now() + HOLD_DURATION_MS);

  await prisma.eventSeat.update({
    where: { id: eventSeatId },
    data: {
      status: 'HELD',
      holdExpiresAt: expiresAt,
      heldBySession: sessionId,
    },
  });

  return { success: true, expiresAt };
}

export async function releaseSeatHold(eventSeatId: string, sessionId: string) {
  const seat = await prisma.eventSeat.findUnique({
    where: { id: eventSeatId },
  });

  if (seat && seat.status === 'HELD' && seat.heldBySession === sessionId) {
    await prisma.eventSeat.update({
      where: { id: eventSeatId },
      data: {
        status: 'AVAILABLE',
        holdExpiresAt: null,
        heldBySession: null,
      },
    });
    return true;
  }
  return false;
}
