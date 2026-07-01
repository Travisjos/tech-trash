export type BinStatus = 'online' | 'offline' | 'full' | 'maintenance';
export type WasteType = 'degradable' | 'non_degradable';

export interface BinLevels {
  degradable: number;
  non_degradable: number;
}

export interface PaymentRecord {
  id: string;
  transactionId: string;
  amount: number;
  phoneNumber: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}

export interface Bin {
  id: string;
  userId: string;
  name: string;
  locationName: string;
  latitude: number;
  longitude: number;
  status: BinStatus;
  levels: BinLevels;
  lastUpdated: string;
  mode: 'auto' | 'manual';
  subscriptionActive: boolean;
  subscriptionFee: number;
  amountPaid: number;
  paymentDate?: string;
  payments?: PaymentRecord[];
}

export interface DepositLog {
  id: string;
  binId: string;
  type: WasteType;
  weight: number;
  timestamp: any; // Firestore timestamp
  userId: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'staff' | 'resident';
  displayName?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  registrationLocation?: string;
}
