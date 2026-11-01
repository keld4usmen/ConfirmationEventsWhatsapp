import { prisma } from '@/lib/prisma';
import { BookingsClient } from '@/components/BookingsClient';

export const revalidate = 0;

export default async function BookingsPage() {
  const halls = await prisma.hall.findMany({
    select: {
      id: true,
      name: true,
      capacity: true,
    },
  });

  const bookings = await prisma.hallBooking.findMany({
    include: {
      hall: { select: { name: true } },
      organizer: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

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
