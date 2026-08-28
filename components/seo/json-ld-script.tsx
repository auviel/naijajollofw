import { jsonLdGraph, type JsonLdObject } from "@/lib/seo/json-ld";

type JsonLdScriptProps = {
  data: JsonLdObject | JsonLdObject[];
};

export function JsonLdScript({ data }: JsonLdScriptProps) {
  const payload = Array.isArray(data)
    ? jsonLdGraph(...data)
    : data;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
