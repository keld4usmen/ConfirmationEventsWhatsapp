import { prisma } from '@/lib/prisma';
import { MyTicketsClient } from '@/components/MyTicketsClient';

export const revalidate = 0;

export default async function MyTicketsPage() {
  const tickets = await prisma.ticket.findMany({
    include: {
      eventSeat: {
        include: {
          seat: true,
          event: {
            include: {
              tenant: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <MyTicketsClient
      tickets={tickets.map((t) => ({
        id: t.id,
        attendeeName: t.attendeeName,
        attendeeEmail: t.attendeeEmail,
        qrCodeSecret: t.qrCodeSecret,
        status: t.status,
        checkedInAt: t.checkedInAt?.toISOString(),
        eventSeat: {
          price: t.eventSeat.price,
          seat: t.eventSeat.seat,
          event: {
            id: t.eventSeat.event.id,
            title: t.eventSeat.event.title,
            startTime: t.eventSeat.event.startTime.toISOString(),
            endTime: t.eventSeat.event.endTime.toISOString(),
            bannerUrl: t.eventSeat.event.bannerUrl,
            tenant: t.eventSeat.event.tenant,
          },
        },
      }))}
    />
  );
}
