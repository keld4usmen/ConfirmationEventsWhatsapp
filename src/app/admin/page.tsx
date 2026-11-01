import { prisma } from '@/lib/prisma';
import { SuperAdminDashboard } from '@/components/SuperAdminDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  let orders: any[] = [];
  let gmv = 0;
  let totalSaasFees = 0;
  let totalOrders = 0;
  let totalTicketsSold = 0;
  let tenants: any[] = [];

  try {
    orders = await prisma.order.findMany();
    gmv = orders.reduce((acc: number, curr: any) => acc + curr.totalAmount, 0);
    totalSaasFees = orders.reduce((acc: number, curr: any) => acc + curr.saasFee, 0);
    totalOrders = orders.length;
    totalTicketsSold = await prisma.ticket.count();

    tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            events: true,
            orders: true,
          },
        },
      },
    });
  } catch (e) {
    console.warn('Database initialization pending in AdminPage:', e);
  }

  return (
    <SuperAdminDashboard
      gmv={gmv}
      totalSaasFees={totalSaasFees}
      totalOrders={totalOrders}
      totalTicketsSold={totalTicketsSold}
      tenants={tenants}
    />
  );
}
