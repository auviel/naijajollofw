import { createClient } from "next-sanity";
import { getSanityEnv } from "./env";

const { projectId, dataset, apiVersion } = getSanityEnv();

export const client = createClient({
  projectId: projectId || "placeholder",
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});
