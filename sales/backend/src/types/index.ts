export interface SaleRow {
  Timestamp: string;
  Date: string;
  'Branch အမည်': string;
  'Customer Service အမည်': string;
  'ပို့ဆောင်ပေးခဲ့သော အရောင်းကောင်တာ တာဝန်ခံ အမည်': string;
  'အရောင်းသမားအမည်'?: string;
  'ဝယ်သူ အမည်'?: string;
  'တဖွဲ့တွင်ပါဝင်သောလူဦးရေ': string;
  'ဆိုင်သို့လာသောအကြောင်းအရင်း'?: string;
  'အကြောင်းအရာ'?: string;
  'ထူးခြားဖြစ်စဉ်'?: string;
  [key: string]: any;
}

export interface CategoryTarget {
  qty: number;
  amount: number;
}

export interface ShopTarget {
  shop: string;
  diamond: CategoryTarget;
  pt: CategoryTarget;
  gold15: CategoryTarget;
  gold16: CategoryTarget;
  total: CategoryTarget;
}

export interface TargetSheetData {
  month: string;
  total: Omit<ShopTarget, 'shop'>;
  shops: Record<string, ShopTarget>;
}

export interface FollowUpRecord {
  id: string;
  customerKey: string;
  customerName: string;
  contactDate: string;
  interactionType: 'Call' | 'SMS' | 'Viber' | 'Visit' | 'Other';
  notes: string;
  status: 'Pending' | 'Interested' | 'Converted' | 'Lost';
  interestLevel: 'Low' | 'Medium' | 'High';
  nextActionDate: string;
  photo: string;
  audio: string;
  createdAt: string;
}

export interface RedemptionRecord {
  id: string;
  customerKey: string;
  year: number;
  giftDescription: string;
  interactionDate: string;
  staffName: string;
  photo: string;
  notes: string;
  createdAt: string;
}

export interface CustomerDob {
  customerKey: string;
  dob: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  username: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  lastUpdated?: string;
}
