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
      // App-controlled JSON-LD only (JSON.stringify, not user HTML).
      // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
