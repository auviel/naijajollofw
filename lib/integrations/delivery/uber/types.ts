/** Raw Uber Direct API response shapes (subset used by deliverGO). */

export type UberDeliveryQuoteResponse = {
  kind: string;
  id: string;
  created?: string;
  expires: string;
  fee: number;
  currency: string;
  currency_type?: string;
  dropoff_eta?: string;
  duration?: number;
  pickup_duration?: number;
};

export type UberManifestItem = {
  name: string;
  quantity: number;
  size?: string;
  weight?: number;
  dimensions?: {
    length: number;
    height: number;
    depth: number;
  };
};

export type UberDeliveryResponse = {
  id: string;
  uuid?: string;
  quote_id?: string;
  status: string;
  complete?: boolean;
  kind?: string;
  fee?: number;
  currency?: string;
  tracking_url?: string;
  live_mode?: boolean;
  external_id?: string;
  pickup?: {
    name?: string;
    phone_number?: string;
    address?: string;
  };
  dropoff?: {
    name?: string;
    phone_number?: string;
    address?: string;
    verification?: {
      picture?: { image_url?: string };
      signature_proof?: { image_url?: string; signer_name?: string };
    };
  };
  pickup_ready?: string;
  pickup_eta?: string;
  dropoff_eta?: string;
  manifest_items?: UberManifestItem[];
  courier?: {
    name?: string;
    phone_number?: string;
    vehicle_type?: string;
    img_href?: string;
  };
};

export type UberListDeliveriesResponse = {
  data?: UberDeliveryResponse[];
  deliveries?: UberDeliveryResponse[];
};

export type UberErrorResponse = {
  code?: string;
  message?: string;
  kind?: string;
  metadata?: {
    param_details?: string;
  };
};

export type UberTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};
