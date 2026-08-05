import { storefrontUrl } from "@/lib/site";
import { Colors } from "@naijajollof/ui";
import * as WebBrowser from "expo-web-browser";

export async function openStorefront(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
): Promise<void> {
  const url = new URL(storefrontUrl(path));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  await WebBrowser.openBrowserAsync(url.toString(), {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
    controlsColor: Colors.accent,
    toolbarColor: Colors.surface,
  });
}
