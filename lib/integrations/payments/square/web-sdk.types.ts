export type SquarePayments = {
  card: (options?: Record<string, unknown>) => Promise<SquareCard>;
};

export type SquareCard = {
  attach: (selector: string) => Promise<void>;
  destroy: () => Promise<void>;
  tokenize: (
    verificationDetails?: SquareVerificationDetails,
  ) => Promise<SquareTokenResult>;
};

export type SquareVerificationDetails = {
  amount?: string;
  currencyCode?: string;
  intent: "CHARGE" | "STORE";
  customerInitiated: boolean;
  sellerKeyedIn: boolean;
  billingContact?: {
    givenName?: string;
    familyName?: string;
    phone?: string;
  };
};

export type SquareTokenResult = {
  status: string;
  token?: string;
  errors?: Array<{ message?: string; type?: string }>;
};

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => SquarePayments;
    };
  }
}

export {};
