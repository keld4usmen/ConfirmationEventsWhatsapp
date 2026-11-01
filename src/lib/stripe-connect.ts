export interface PayoutSplit {
  totalAmount: number;
  saasFee: number;
  venueCommission: number;
  organizerNet: number;
  breakdownPct: {
    saasFeePct: number;
    venueCommissionPct: number;
    organizerNetPct: number;
  };
}

export function calculateRevenueSplit(ticketTotal: number, saasFeeRate: number = 0.05, venueCommissionRate: number = 0.10): PayoutSplit {
  const saasFee = Math.round((ticketTotal * saasFeeRate + 1.0) * 100) / 100;
  const venueCommission = Math.round((ticketTotal * venueCommissionRate) * 100) / 100;
  const organizerNet = Math.max(0, Math.round((ticketTotal - saasFee - venueCommission) * 100) / 100);

  return {
    totalAmount: ticketTotal,
    saasFee,
    venueCommission,
    organizerNet,
    breakdownPct: {
      saasFeePct: Math.round((saasFee / ticketTotal) * 100),
      venueCommissionPct: Math.round((venueCommission / ticketTotal) * 100),
      organizerNetPct: Math.round((organizerNet / ticketTotal) * 100),
    }
  };
}

export function simulateStripeRefund(amount: number, stripePaymentIntentId?: string) {
  return {
    id: `re_sim_${Math.random().toString(36).substring(2, 11)}`,
    amount,
    status: 'succeeded',
    reversedTransfers: true,
    refundApplicationFee: true,
    processedAt: new Date().toISOString(),
  };
}
