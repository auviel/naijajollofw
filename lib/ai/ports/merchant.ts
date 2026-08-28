export type MerchantStatus = {
  isOpen: boolean;
  message: string;
  todayLabel?: string | null;
  nextOpenLabel?: string | null;
  timezone: string;
  fulfillmentBlurb: string;
};

export type MerchantPort = {
  getStatus(): Promise<MerchantStatus>;
};
