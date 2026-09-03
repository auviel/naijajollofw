export type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  storeId: string;
  storeName: string;
  phoneE164: string | null;
};

export type StaffStoreProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  enabledUberDirect: boolean;
  enabledDoorDashDrive: boolean;
};

export type StaffMePayload = {
  user: StaffUser;
  store: StaffStoreProfile;
};

export function formatStoreAddressLine(store: StaffStoreProfile): string {
  const line2 = store.addressLine2 ? `, ${store.addressLine2}` : "";
  return `${store.addressLine1}${line2}, ${store.city}, ${store.province} ${store.postalCode}`;
}
