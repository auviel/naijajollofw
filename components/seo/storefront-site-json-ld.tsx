import { JsonLdScript } from "@/components/seo/json-ld-script";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo/json-ld";
import { getPublicStorefront } from "@/lib/services/storefront/get-public-menu";

export async function StorefrontSiteJsonLd() {
  const { store } = await getPublicStorefront();

  return (
    <JsonLdScript
      data={[buildOrganizationJsonLd(store), buildWebSiteJsonLd()]}
    />
  );
}
