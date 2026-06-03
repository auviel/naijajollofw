export type CustomerPhoneRecord = {
  id: string;
  phoneE164: string;
  label: string | null;
  isPrimary: boolean;
  createdAt: Date;
};

export type CustomerAddressRecord = {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  formatted: string;
  label: string | null;
  isPrimary: boolean;
  createdAt: Date;
};

export type CustomerListItem = {
  id: string;
  name: string;
  primaryPhone: string | null;
  primaryAddress: string | null;
  phoneCount: number;
  addressCount: number;
  deliveryCount: number;
  updatedAt: Date;
};

export type CustomerSearchResult = {
  id: string;
  name: string;
  phoneE164: string;
  phoneDisplay: string;
  addressFormatted: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
};

export type CustomerDetail = {
  id: string;
  name: string;
  notes: string | null;
  phones: CustomerPhoneRecord[];
  addresses: CustomerAddressRecord[];
  deliveryCount: number;
  createdAt: Date;
  updatedAt: Date;
};
