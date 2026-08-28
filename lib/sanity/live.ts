import { defineLive } from "next-sanity/live";
import { client } from "./client";
import { getSanityEnv, isSanityConfigured } from "./env";

const { apiVersion } = getSanityEnv();
const token = process.env.SANITY_API_READ_TOKEN;

const live = isSanityConfigured()
  ? defineLive({
      client: client.withConfig({ apiVersion }),
      serverToken: token,
      browserToken: token,
    })
  : null;

export const sanityFetch = live?.sanityFetch;
export const SanityLive = live?.SanityLive;
