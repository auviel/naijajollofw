export type StoreProfile = {
  id: string;
  name: string;
  phone: string;
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
