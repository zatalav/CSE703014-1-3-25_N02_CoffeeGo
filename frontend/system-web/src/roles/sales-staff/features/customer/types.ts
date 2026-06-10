export type CustomerRank = string;

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  points: number;
  rank: CustomerRank;
  totalOrders: number;
  lastOrder: string;
}
