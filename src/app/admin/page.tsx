import { prisma } from '@/lib/prisma';
import { SuperAdminDashboard } from '@/components/SuperAdminDashboard';

export const revalidate = 0;

export default async function AdminPage() {
  const orders = await prisma.order.findMany();
  
  const gmv = orders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalSaasFees = orders.reduce((acc, curr) => acc + curr.saasFee, 0);
  const totalOrders = orders.length;
  const totalTicketsSold = await prisma.ticket.count();

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          events: true,
          orders: true,
        },
      },
    },
  });

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
