import { API_URL } from "@/lib/config";

export function storefrontUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalized}`;
}
