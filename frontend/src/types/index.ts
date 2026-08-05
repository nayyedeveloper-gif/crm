export type ActionType = 'PURCHASE' | 'INQUIRY' | 'FOLLOW_UP' | 'COMPLAINT' | 'OTHER';

export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  branchId: number | null;
  branchName: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error: unknown;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CrmHistoryResponse {
  id: number;
  version: number;
  branchId: number;
  branchName: string;
  customerName: string;
  phone: string;
  birthday: string | null;
  amount: number;
  actionType: ActionType;
  regionId: number | null;
  regionName: string | null;
  townshipId: number | null;
  townshipName: string | null;
  nrc: string | null;
  address: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface CrmHistoryRequest {
  branchId: number | null;
  customerName: string;
  phone: string;
  birthday: string | null;
  amount: number;
  actionType: ActionType;
  regionId: number | null;
  townshipId: number | null;
  nrc: string | null;
  address: string | null;
  remark: string | null;
}

export interface RegionResponse {
  id: number;
  code: string;
  nameMm: string;
  nameEn: string | null;
  sortOrder: number;
}

export interface TownshipResponse {
  id: number;
  regionId: number;
  nameMm: string;
  nameEn: string | null;
  sortOrder: number;
}

export interface BranchResponse {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  active: boolean;
}

export interface ShowcaseImageResponse {
  id: number;
  url: string;
  sortOrder: number;
}

export interface ShowcaseItemResponse {
  id: number;
  branchId: number;
  branchCode: string;
  branchName: string;
  itemCode: string;
  name: string;
  categoryId: number | null;
  category: string;
  subcategoryId: number | null;
  subCategory: string | null;
  description: string | null;
  priceMmk: number | null;
  metalPurity: string | null;
  weightGram: number | null;
  stoneCarat: number | null;
  active: boolean;
  images: ShowcaseImageResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ShowcaseBranchSummary {
  branchId: number;
  branchCode: string;
  branchName: string;
  itemCount: number;
}

export interface ShowcaseSummaryResponse {
  totalItems: number;
  branches: ShowcaseBranchSummary[];
}

export interface ShowcaseSubcategoryResponse {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  sortOrder: number;
  active: boolean;
  itemCount: number;
}

export interface NrcResponse {
  id: number;
  nameEn: string;
  nameMm: string;
  nrcCode: number;
  sortOrder: number;
}

export const NRC_STATE_CODES: { code: number; label: string }[] = [
  { code: 1, label: '၁ - ကချင်ပြည်နယ်' },
  { code: 2, label: '၂ - ကယားပြည်နယ်' },
  { code: 3, label: '၃ - ကရင်ပြည်နယ်' },
  { code: 4, label: '၄ - ချင်းပြည်နယ်' },
  { code: 5, label: '၅ - စစ်ကိုင်းတိုင်းဒေသကြီး' },
  { code: 6, label: '၆ - တနင်္သာရီတိုင်းဒေသကြီး' },
  { code: 7, label: '၇ - ပဲခူးတိုင်းဒေသကြီး' },
  { code: 8, label: '၈ - မကွေးတိုင်းဒေသကြီး' },
  { code: 9, label: '၉ - မန္တလေးတိုင်းဒေသကြီး' },
  { code: 10, label: '၁၀ - မွန်ပြည်နယ်' },
  { code: 11, label: '၁၁ - ရခိုင်ပြည်နယ်' },
  { code: 12, label: '၁၂ - ရန်ကုန်တိုင်းဒေသကြီး' },
  { code: 13, label: '၁၃ - ရှမ်းပြည်နယ်' },
  { code: 14, label: '၁၄ - ဧရာဝတီတိုင်းဒေသကြီး' },
];

export const NRC_TYPES: { value: string; label: string }[] = [
  { value: 'N', label: '(နိုင်)' },
  { value: 'P', label: '(ပြည်သူ့)' },
  { value: 'E', label: '(ဧည့်)' },
  { value: 'R', label: '(ရောက်)' },
  { value: 'S', label: '(ဆွေ)' },
  { value: 'Y', label: '(ယာ)' },
  { value: 'A', label: '(အား)' },
  { value: 'F', label: '(ဖော်)' },
  { value: 'W', label: '(ဝမ်း)' },
  { value: 'H', label: '(ဟာ)' },
  { value: 'T', label: '(တာ)' },
  { value: 'G', label: '(ဂု)' },
];

export const NRC_TYPE_MM_TO_EN: Record<string, string> = {
  'နိုင်': 'N', 'ပြည်သူ့': 'P', 'ဧည့်': 'E', 'ရောက်': 'R',
  'ဆွေ': 'S', 'ယာ': 'Y', 'အား': 'A', 'ဖော်': 'F',
  'ဝမ်း': 'W', 'ဟာ': 'H', 'တာ': 'T', 'ဂု': 'G',
};

export const NRC_TYPE_EN_TO_MM: Record<string, string> = {
  N: 'နိုင်', P: 'ပြည်သူ့', E: 'ဧည့်', R: 'ရောက်',
  S: 'ဆွေ', Y: 'ယာ', A: 'အား', F: 'ဖော်',
  W: 'ဝမ်း', H: 'ဟာ', T: 'တာ', G: 'ဂု',
};

const MM_DIGITS = '၀၁၂၃၄၅၆၇၈၉';
const EN_DIGITS = '0123456789';

export function toMyanmarNumber(str: string): string {
  return str.replace(/[0-9]/g, (d) => MM_DIGITS[parseInt(d)]);
}

export function fromMyanmarNumber(str: string): string {
  return str.replace(/[၀-၉]/g, (d) => EN_DIGITS[MM_DIGITS.indexOf(d)].toString());
}

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  PURCHASE: 'ဝယ်ယူ',
  INQUIRY: 'စုံစမ်း',
  FOLLOW_UP: 'ဆက်သွယ်',
  COMPLAINT: 'တိုင်ကြား',
  OTHER: 'အခြား',
};

export const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  PURCHASE: 'bg-blue-100 text-blue-700 border-blue-200',
  INQUIRY: 'bg-amber-100 text-amber-700 border-amber-200',
  FOLLOW_UP: 'bg-purple-100 text-purple-700 border-purple-200',
  COMPLAINT: 'bg-red-100 text-red-700 border-red-200',
  OTHER: 'bg-gray-100 text-gray-700 border-gray-200',
};

export type BucketCode =
  | 'B_50_100'
  | 'B_100_300'
  | 'B_300_500'
  | 'B_500_1000'
  | 'B_1000_PLUS'
  | 'OTHER';

export interface BucketMeta {
  code: BucketCode;
  labelMm: string;
}

export interface BucketCounts {
  target: number;
  actual: number;
}

export interface StaffPerformanceRow {
  staffKey: string;
  totalTarget: number;
  totalActual: number;
  buckets: Record<string, BucketCounts>;
}

export interface StaffPerformanceResponse {
  bucketMeta: BucketMeta[];
  rows: StaffPerformanceRow[];
  totals: StaffPerformanceRow;
}

export interface TownshipPerformanceRow {
  townshipId: number | null;
  townshipName: string;
  totalActual: number;
  buckets: Record<string, number>;
}

export interface RegionPerformanceRow {
  regionId: number | null;
  regionName: string;
  totalActual: number;
  buckets: Record<string, number>;
  townships: TownshipPerformanceRow[];
}

export interface RegionPerformanceResponse {
  bucketMeta: BucketMeta[];
  rows: RegionPerformanceRow[];
  totals: RegionPerformanceRow;
}

export interface UserAdminResponse {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  branchId: number | null;
  branchName: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackupSettingsResponse {
  autoEnabled: boolean;
  frequency: string;
  timeOfDay: string;
  retainDays: number;
  lastAutoRunAt: string | null;
  destinationType: string;
  destinationPath: string;
  driveFolderId: string | null;
}

export interface BackupJobResponse {
  id: number;
  jobType: string;
  status: string;
  filename: string | null;
  sizeBytes: number | null;
  recordCount: number | null;
  errorMessage: string | null;
  triggeredBy: string | null;
  createdAt: string;
  destinationType: string | null;
  destinationPath: string | null;
}

export interface N8nWebhookConfigResponse {
  enabled: boolean;
  outboundUrl: string | null;
  hasSecret: boolean;
  events: string[];
  inboundEnabled: boolean;
  inboundPath: string;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: string | null;
  lastDeliveryError: string | null;
  availableEvents: string[];
}

export interface N8nWebhookTestResponse {
  success: boolean;
  statusCode: number;
  message: string;
}

export interface AppSettingsResponse {
  appName: string;
  appVersion: string;
  shopWhatsapp?: string | null;
  shopViber?: string | null;
  shopEyebrow?: string | null;
  shopHeadline?: string | null;
  shopSubtitle?: string | null;
  shopCtaLabel?: string | null;
  shopBrandLine?: string | null;
  shopOfferBadge?: string | null;
  shopOfferBlurb?: string | null;
  shopOfferCta?: string | null;
  shopCollectionCta?: string | null;
  invitePopupEnabled?: boolean;
  invitePopupTitle?: string | null;
  invitePopupDate?: string | null;
  invitePopupSpecial?: string | null;
  invitePopupImageUrl?: string | null;
  shopCheckoutEnabled?: boolean;
  shopOrdersEnabled?: boolean;
  shopMmqrEnabled?: boolean;
  shopMmqrImageUrl?: string | null;
  shopMmqrNote?: string | null;
  shopFavouritesEnabled?: boolean;
  shopCheckoutTerms?: string | null;
  userAgreement?: string | null;
  privacyPolicy?: string | null;
  shopContactPhone?: string | null;
  shopContactEmail?: string | null;
  shopContactAddress?: string | null;
  shopContactHours?: string | null;
  timezone: string;
  database: string;
}

export interface ShopOrderResponse {
  id: number;
  orderCode: string;
  customerName: string;
  phone: string;
  address: string | null;
  note: string | null;
  itemsJson: string;
  totalAmount: number | null;
  status: string;
  trackingNumber: string | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionMatrixResponse {
  permissionKeys: string[];
  labels: Record<string, string>;
  roles: string[];
  matrix: Record<string, Record<string, string>>;
}

export interface ChangeLogResponse {
  id: number;
  category: string;
  action: string;
  summary: string;
  detail: string | null;
  actor: string | null;
  createdAt: string;
}

export interface SystemLogResponse {
  id: number;
  level: string;
  source: string;
  message: string;
  detail: string | null;
  createdAt: string;
}

export interface ProductResponse {
  id: number;
  productCode: string;
  name: string;
  categoryId: number;
  category: string;
  description: string | null;
  price: number | null;
  compareAtPrice: number | null;
  featured: boolean;
  specialOffer: boolean;
  offerEndsAt: string | null;
  offerHeadline: string | null;
  metalPurity: string | null;
  weightGram: number | null;
  stoneCarat: number | null;
  publicCode: string;
  publicUrl: string;
  images: Partial<Record<'front' | 'back' | 'side' | 'other' | 'offer', string>>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProductSummary {
  publicCode: string;
  productCode: string;
  name: string;
  category: string;
  price: number | null;
  compareAtPrice: number | null;
  featured: boolean;
  specialOffer: boolean;
  offerEndsAt: string | null;
  offerHeadline: string | null;
  metalPurity: string | null;
  imageUrl: string | null;
  /** Dedicated Limited Offer hero (4:5); falls back to imageUrl on shop if null. */
  offerImageUrl?: string | null;
  updatedAt?: string | null;
}

export interface PublicProductResponse {
  publicCode: string;
  productCode: string;
  name: string;
  category: string;
  description: string | null;
  price: number | null;
  compareAtPrice: number | null;
  featured: boolean;
  specialOffer: boolean;
  offerEndsAt: string | null;
  offerHeadline: string | null;
  metalPurity: string | null;
  weightGram: number | null;
  stoneCarat: number | null;
  images: Partial<Record<'front' | 'back' | 'side' | 'other' | 'offer', string>>;
  appName: string;
  shopWhatsapp: string | null;
  shopViber: string | null;
  updatedAt?: string | null;
}

export interface ShopAuthResponse {
  accessToken: string;
  expiresIn: number;
  customer: ShopCustomerAccount;
  needsProfile: boolean;
}

export type ShopCustomerTier = 'CUSTOMER' | 'VIP' | 'VVIP';

export interface ShopCustomerAccount {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  birthday: string | null;
  address: string | null;
  avatarUrl: string | null;
  profileComplete: boolean;
  active?: boolean;
  customerTier?: ShopCustomerTier;
  trusted?: boolean;
  crmNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopCustomerAdminStats {
  total: number;
  active: number;
  trusted: number;
  customer: number;
  vip: number;
  vvip: number;
}


export interface ShopInquiryItem {
  publicCode: string;
  productCode: string;
  name: string;
  category: string;
  price: number | null;
  compareAtPrice?: number | null;
  qty: number;
  imageUrl?: string | null;
}

export interface ShopInquiryResponse {
  id: number;
  customerName: string;
  phone: string;
  note: string | null;
  itemsJson: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategoryResponse {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
  productCount: number;
}

export const PRODUCT_IMAGE_SLOTS = [
  { key: 'front', label: 'Front', param: 'imageFront' },
  { key: 'back', label: 'Back', param: 'imageBack' },
  { key: 'side', label: 'Side', param: 'imageSide' },
  { key: 'other', label: 'Other', param: 'imageOther' },
] as const;
