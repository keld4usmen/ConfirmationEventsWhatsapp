import { prisma } from '@/lib/prisma';
import { SeatingStudio } from '@/components/SeatingStudio';

export const revalidate = 0;

export default async function StudioPage() {
  let hall = await prisma.hall.findFirst({
    include: {
      seats: true,
    },
  });

  if (!hall) {
    const tenant = await prisma.tenant.findFirst();
    if (tenant) {
      hall = await prisma.hall.create({
        data: {
          tenantId: tenant.id,
          name: 'Grand Symphony Hall',
          description: 'Acoustic main hall',
          capacity: 40,
        },
        include: { seats: true },
      });
    }
  }

  if (!hall) {
    return (
      <div className="p-8 text-center text-slate-400">
        No hall found. Please run <code className="text-emerald-400">npm run seed</code> to populate sample halls.
      </div>
    );
  }

  return (
    <SeatingStudio
      hallId={hall.id}
      hallName={hall.name}
      initialSeats={hall.seats.map((s) => ({
        id: s.id,
        section: s.section,
        rowLabel: s.rowLabel,
        seatNumber: s.seatNumber,
        x: s.x,
        y: s.y,
        defaultTier: s.defaultTier,
      }))}
    />
  );
}
