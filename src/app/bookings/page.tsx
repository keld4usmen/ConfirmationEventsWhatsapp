import { prisma } from '@/lib/prisma';
import { BookingsClient } from '@/components/BookingsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BookingsPage() {
  let halls: any[] = [];
  let bookings: any[] = [];

  try {
    halls = await prisma.hall.findMany({
      select: {
        id: true,
        name: true,
        capacity: true,
      },
    });

    bookings = await prisma.hallBooking.findMany({
      include: {
        hall: { select: { name: true } },
        organizer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (e) {
    console.warn('Database initialization pending in BookingsPage:', e);
  }

  return (
    <BookingsClient
      halls={halls}
      bookings={bookings.map((b) => ({
        id: b.id,
        eventTitle: b.eventTitle,
        description: b.description,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        rentalFee: b.rentalFee,
        status: b.status,
        rejectionReason: b.rejectionReason,
        hall: b.hall,
        organizer: b.organizer,
      }))}
    />
  );
}
