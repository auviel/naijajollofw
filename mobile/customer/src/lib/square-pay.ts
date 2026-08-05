import { NativeModules, Platform, TurboModuleRegistry } from "react-native";

type CardDetails = { nonce: string };

type SquareIap = {
  SQIPCore: {
    setSquareApplicationId: (applicationId: string) => void;
  };
  SQIPCardEntry: {
    startCardEntryFlow: (
      collectPostalCode: boolean,
      onNonce?: (cardDetails: CardDetails) => { success: true } | Promise<{ success: true }>,
      onCancel?: () => void,
    ) => void;
  };
};

function hasNativeSquare(): boolean {
  if (Platform.OS === "web") return false;
  const native = NativeModules as Record<string, unknown>;
  if (native.SQIPCardEntry || native.RNSQIPCardEntry || native.RNSquareInAppPayments) {
    return true;
  }
  try {
    return Boolean(TurboModuleRegistry.get("SQIPCardEntry"));
  } catch {
    return false;
  }
}

function loadSquareIap(): SquareIap | null {
  if (!hasNativeSquare()) return null;
  try {
    return require("react-native-square-in-app-payments") as SquareIap;
  } catch {
    return null;
  }
}

export function isSquareIapAvailable(): boolean {
  return hasNativeSquare();
}

/** Returns a Square nonce, or null if the diner cancelled / SDK unavailable. */
export async function tokenizeCardInApp(
  applicationId: string,
): Promise<string | null> {
  const sdk = loadSquareIap();
  if (!sdk) return null;
  sdk.SQIPCore.setSquareApplicationId(applicationId);
  return new Promise((resolve, reject) => {
    try {
      sdk.SQIPCardEntry.startCardEntryFlow(
        true,
        (cardDetails) => {
          resolve(cardDetails.nonce);
          return { success: true };
        },
        () => resolve(null),
      );
    } catch (error) {
      reject(error);
    }
  });
}
