/**
 * Non-destructive restore of the Waterloo production menu catalog
 * (rebuilt after Neon wipe / accidental demo seed).
 *
 * Uses `pg` directly — Prisma 7 WASM client is broken in some local runtimes.
 *
 * Usage:
 *   DATABASE_URL='postgresql://...railway...' npx tsx scripts/restore-waterloo-menu.ts
 */
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
import { slugifyMenuItemName } from "../lib/domain/menu/slug";

const STORE_ID = "seed-store-waterloo";

type CatKey =
  | "featured"
  | "popular"
  | "rice"
  | "soups"
  | "sides"
  | "family"
  | "drinks"
  | "special"
  | "riceTypes"
  | "chickenQty";

type ItemDef = {
  key: string;
  category: CatKey;
  name: string;
  description: string;
  priceCents: number;
  sortOrder: number;
  links?: { category: CatKey; sortOrder: number }[];
};

type InlineMod = { name: string; priceDeltaCents: number; sortOrder: number };

type GroupDef = {
  itemKey: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  sourceCategory?: CatKey;
  sourceItemKeys?: string[];
  inline?: InlineMod[];
};

function cuid(): string {
  // Prisma-compatible enough unique id (not cryptographic cuid, but unique)
  return `c${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;
}

function assertRailwayLikeUrl(url: string) {
  if (!/\.rlwy\.net|\.railway\.app/i.test(url)) {
    throw new Error(
      "Refusing restore: DATABASE_URL does not look like Railway. Pass the Railway public URL explicitly.",
    );
  }
}

/**
 * Railway's public proxy uses a self-signed cert. Modern `pg` treats
 * `sslmode=require` as verify-full; `uselibpqcompat=true` restores libpq
 * semantics without hard-coding `rejectUnauthorized: false` in source.
 */
function normalizeRailwayConnectionString(url: string): string {
  const match = url.match(/^(postgres(?:ql)?:\/\/[^?]*)(\?.*)?$/i);
  if (!match) return url;
  const [, base, query = ""] = match;
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  params.set("uselibpqcompat", "true");
  params.set("sslmode", "require");
  return `${base}?${params.toString()}`;
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  assertRailwayLikeUrl(url);

  const client = new pg.Client({
    connectionString: normalizeRailwayConnectionString(url),
  });
  await client.connect();

  try {
    const store = await client.query(
      `SELECT id, name FROM "Store" WHERE id = $1`,
      [STORE_ID],
    );
    if (store.rowCount === 0) {
      throw new Error(`Store ${STORE_ID} not found — run db:bootstrap first`);
    }

    const countRes = await client.query(
      `SELECT count(*)::int AS n FROM "MenuItem" WHERE "storeId" = $1`,
      [STORE_ID],
    );
    const existingCount = countRes.rows[0].n as number;
    if (existingCount > 5) {
      throw new Error(
        `Store already has ${existingCount} menu items. Clear them first or raise this guard.`,
      );
    }

    await client.query("BEGIN");

    const categoryDefs: {
      key: CatKey;
      name: string;
      sortOrder: number;
      active: boolean;
    }[] = [
      { key: "featured", name: "Featured items", sortOrder: 0, active: true },
      { key: "popular", name: "Popular Picks", sortOrder: 1, active: true },
      { key: "rice", name: "Rice & Combos", sortOrder: 2, active: true },
      { key: "soups", name: "Soups & Stews", sortOrder: 3, active: true },
      { key: "sides", name: "Add-Ons & Sides", sortOrder: 4, active: true },
      {
        key: "family",
        name: "Family Trays & Bulk Orders",
        sortOrder: 5,
        active: true,
      },
      { key: "drinks", name: "Drinks", sortOrder: 6, active: true },
      {
        key: "special",
        name: "Special Orders (Pre order only)",
        sortOrder: 7,
        active: true,
      },
      { key: "riceTypes", name: "Rice types", sortOrder: 90, active: false },
      {
        key: "chickenQty",
        name: "Chicken quantity",
        sortOrder: 91,
        active: false,
      },
    ];

    const cats = new Map<CatKey, string>();
    for (const def of categoryDefs) {
      const found = await client.query(
        `SELECT id FROM "MenuCategory" WHERE "storeId" = $1 AND name = $2`,
        [STORE_ID, def.name],
      );
      if (found.rowCount && found.rows[0]) {
        await client.query(
          `UPDATE "MenuCategory" SET "sortOrder" = $1, active = $2, "updatedAt" = NOW() WHERE id = $3`,
          [def.sortOrder, def.active, found.rows[0].id],
        );
        cats.set(def.key, found.rows[0].id as string);
      } else {
        const id = cuid();
        await client.query(
          `INSERT INTO "MenuCategory" (id, "storeId", name, "sortOrder", active, "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
          [id, STORE_ID, def.name, def.sortOrder, def.active],
        );
        cats.set(def.key, id);
      }
    }

    const usedSlugs = new Set<string>();
    const existingSlugs = await client.query(
      `SELECT slug FROM "MenuItem" WHERE "storeId" = $1`,
      [STORE_ID],
    );
    for (const row of existingSlugs.rows) usedSlugs.add(row.slug as string);

    async function allocateSlug(name: string): Promise<string> {
      const base = slugifyMenuItemName(name);
      if (!usedSlugs.has(base)) {
        usedSlugs.add(base);
        return base;
      }
      for (let n = 2; n < 10_000; n++) {
        const candidate = `${base}-${n}`;
        if (!usedSlugs.has(candidate)) {
          usedSlugs.add(candidate);
          return candidate;
        }
      }
      // Extremely unlikely
      const hash = createHash("sha1").update(name).digest("hex").slice(0, 8);
      const fallback = `${base}-${hash}`;
      usedSlugs.add(fallback);
      return fallback;
    }

    const proteinKeys = [
      "addon-assorted",
      "addon-suya",
      "addon-chicken",
      "addon-fish",
      "addon-turkey",
      "addon-egg",
    ] as const;
    const proteinNoSuya = [
      "addon-assorted",
      "addon-chicken",
      "addon-fish",
      "addon-turkey",
      "addon-egg",
    ] as const;
    const proteinNoEgg = [
      "addon-assorted",
      "addon-chicken",
      "addon-fish",
      "addon-turkey",
    ] as const;

    const items: ItemDef[] = [
      {
        key: "addon-assorted",
        category: "sides",
        name: "Assorted",
        description: "Assorted meats add-on.",
        priceCents: 999,
        sortOrder: 0,
      },
      {
        key: "addon-suya",
        category: "sides",
        name: "Suya",
        description: "Spicy grilled suya add-on.",
        priceCents: 999,
        sortOrder: 1,
      },
      {
        key: "addon-chicken",
        category: "sides",
        name: "Chicken",
        description: "Extra chicken.",
        priceCents: 300,
        sortOrder: 2,
      },
      {
        key: "addon-fish",
        category: "sides",
        name: "Fish",
        description: "Extra fish.",
        priceCents: 400,
        sortOrder: 3,
      },
      {
        key: "addon-turkey",
        category: "sides",
        name: "Turkey",
        description: "Extra turkey.",
        priceCents: 500,
        sortOrder: 4,
      },
      {
        key: "addon-egg",
        category: "sides",
        name: "Egg",
        description: "Extra egg.",
        priceCents: 200,
        sortOrder: 5,
      },
      {
        key: "addon-plantain",
        category: "sides",
        name: "Plantain",
        description: "Fried plantain side.",
        priceCents: 200,
        sortOrder: 6,
      },
      {
        key: "addon-poundo",
        category: "sides",
        name: "Poundo Yam",
        description: "Poundo yam swallow.",
        priceCents: 500,
        sortOrder: 7,
      },
      {
        key: "addon-agege-sliced",
        category: "sides",
        name: "Agege Bread - sliced",
        description: "Sliced Agege bread.",
        priceCents: 550,
        sortOrder: 8,
      },
      {
        key: "addon-agege-unsliced",
        category: "sides",
        name: "Agege Bread - unsliced",
        description: "Unsliced Agege bread.",
        priceCents: 550,
        sortOrder: 9,
      },
      {
        key: "puff-puff",
        category: "sides",
        name: "Puff-Puff",
        description: "10 pieces of delicious deep-fried puff-puff.",
        priceCents: 1000,
        sortOrder: 10,
      },
      {
        key: "egg-roll",
        category: "sides",
        name: "Egg roll",
        description:
          "1 piece of egg roll also called egg buns. A simple delicious snack with a satisfying crunch.",
        priceCents: 550,
        sortOrder: 11,
        links: [
          { category: "popular", sortOrder: 4 },
          { category: "featured", sortOrder: 32 },
        ],
      },
      {
        key: "moi-moi",
        category: "sides",
        name: "Moi Moi",
        description:
          "1 piece of soft, savory steamed bean pudding made from blended beans and spices. Light yet satisfying, and perfect as a side to complement any meal.",
        priceCents: 500,
        sortOrder: 12,
        links: [
          { category: "popular", sortOrder: 5 },
          { category: "featured", sortOrder: 33 },
        ],
      },
      {
        key: "rice-jollof",
        category: "riceTypes",
        name: "Jollof Rice Only",
        description: "Tray with jollof rice only.",
        priceCents: 0,
        sortOrder: 0,
      },
      {
        key: "rice-fried",
        category: "riceTypes",
        name: "Fried Rice Only",
        description: "Tray with fried rice only.",
        priceCents: 0,
        sortOrder: 1,
      },
      {
        key: "rice-mix",
        category: "riceTypes",
        name: "Mix of Jollof and Fried Rice",
        description: "Tray with a mix of jollof and fried rice.",
        priceCents: 0,
        sortOrder: 2,
      },
      {
        key: "chicken-none",
        category: "chickenQty",
        name: "No chicken",
        description: "No chicken on the tray.",
        priceCents: 0,
        sortOrder: 0,
      },
      {
        key: "chicken-5",
        category: "chickenQty",
        name: "Regular Combo (5 Chicken)",
        description: "Five pieces of chicken.",
        // Doc half tray with chicken $60 = base $50 + $10
        priceCents: 1000,
        sortOrder: 1,
      },
      {
        key: "chicken-7",
        category: "chickenQty",
        name: "Most Popular (7 chicken)",
        description: "Seven pieces of chicken.",
        // Doc has no 7-pc line; premium over 5-pc (+$6)
        priceCents: 1600,
        sortOrder: 2,
      },
      {
        key: "drink-water",
        category: "drinks",
        name: "Water",
        description: "Bottled water.",
        priceCents: 150,
        sortOrder: 0,
      },
      {
        key: "drink-malt",
        category: "drinks",
        name: "Malt",
        description: "Malt drink.",
        priceCents: 300,
        sortOrder: 1,
      },
      {
        key: "drink-orange-crush",
        category: "drinks",
        name: "Orange Crush",
        description: "Orange Crush soft drink.",
        priceCents: 255,
        sortOrder: 2,
      },
      {
        key: "drink-pepsi",
        category: "drinks",
        name: "Pepsi",
        description: "Pepsi soft drink.",
        priceCents: 255,
        sortOrder: 3,
      },
      {
        key: "drink-coke",
        category: "drinks",
        name: "Coca Cola",
        description: "Coca-Cola soft drink.",
        priceCents: 255,
        sortOrder: 4,
      },
      {
        key: "drink-sprite",
        category: "drinks",
        name: "Sprite",
        description: "Sprite soft drink.",
        priceCents: 255,
        sortOrder: 5,
      },
      {
        key: "drink-canada-dry",
        category: "drinks",
        name: "Canada Dry",
        description: "Canada Dry ginger ale.",
        priceCents: 255,
        sortOrder: 6,
      },
      {
        key: "drink-oj",
        category: "drinks",
        name: "Orange Juice",
        description: "Orange juice.",
        priceCents: 300,
        sortOrder: 7,
      },
      {
        key: "drink-zobo",
        category: "drinks",
        name: "Zobo",
        description: "Hibiscus zobo drink.",
        priceCents: 400,
        sortOrder: 8,
      },
      {
        key: "drink-chivita",
        category: "drinks",
        name: "Chivita",
        description: "Chivita juice.",
        priceCents: 500,
        sortOrder: 9,
      },
      {
        key: "drink-pure-heaven",
        category: "drinks",
        name: "Pure Heaven",
        description: "Pure Heaven drink.",
        priceCents: 500,
        sortOrder: 10,
      },
      {
        key: "beans-plantain",
        category: "popular",
        name: "Beans and Plantain",
        description:
          "Classic Nigerian beans cooked with spices, served with fried plantains.",
        priceCents: 2000,
        sortOrder: 0,
        links: [{ category: "featured", sortOrder: 10 }],
      },
      {
        key: "asun",
        category: "popular",
        name: "Asun — Spicy Goat Meat",
        description: "Spicy grilled goat meat (asun).",
        priceCents: 3000,
        sortOrder: 1,
        links: [{ category: "featured", sortOrder: 11 }],
      },
      {
        key: "meat-pie",
        category: "popular",
        name: "Meat Pie",
        description: "Flaky pastry filled with seasoned minced meat.",
        priceCents: 400,
        sortOrder: 2,
        links: [{ category: "featured", sortOrder: 12 }],
      },
      {
        key: "stewed-fish",
        category: "popular",
        name: "Stewed Fish (5 pieces)",
        description: "Five pieces of fish in tomato stew.",
        priceCents: 1800,
        sortOrder: 3,
        links: [{ category: "featured", sortOrder: 13 }],
      },
      {
        key: "stewed-chicken",
        category: "popular",
        name: "Stewed Chicken (5 pieces)",
        description: "Five pieces of chicken in tomato stew.",
        priceCents: 1999,
        sortOrder: 4,
        links: [{ category: "featured", sortOrder: 14 }],
      },
      {
        key: "jollof-plantain-chicken",
        category: "rice",
        name: "Jollof Rice, Plantain and Chicken",
        description:
          "Smoky party jollof with fried plantain and seasoned chicken.",
        priceCents: 2000,
        sortOrder: 0,
        links: [{ category: "featured", sortOrder: 0 }],
      },
      {
        key: "ayamashe-rice",
        category: "rice",
        name: "Ayamashe Stew with White Rice",
        description: "Ayamase stew served with white rice.",
        priceCents: 2000,
        sortOrder: 1,
        links: [{ category: "featured", sortOrder: 1 }],
      },
      {
        key: "jollof-fish",
        category: "rice",
        name: "Jollof Rice and Fish",
        description: "Party jollof rice served with fish.",
        priceCents: 2000,
        sortOrder: 2,
        links: [{ category: "featured", sortOrder: 2 }],
      },
      {
        key: "jollof-turkey",
        category: "rice",
        name: "Jollof Rice and Turkey",
        description: "Classic jollof rice served with roasted turkey.",
        priceCents: 2000,
        sortOrder: 3,
        links: [{ category: "featured", sortOrder: 3 }],
      },
      {
        key: "jollof-chicken",
        category: "rice",
        name: "Jollof Rice and Chicken",
        description: "Jollof rice served with chicken (no plantain).",
        priceCents: 2000,
        sortOrder: 4,
        links: [{ category: "featured", sortOrder: 4 }],
      },
      {
        key: "fried-rice-chicken",
        category: "rice",
        name: "Fried Rice and Chicken",
        description: "Fried rice served with chicken.",
        priceCents: 2000,
        sortOrder: 5,
        links: [{ category: "featured", sortOrder: 5 }],
      },
      {
        key: "tomato-stew-rice",
        category: "rice",
        name: "Tomato Stew with White Rice",
        description: "Classic Nigerian tomato stew served with white rice.",
        priceCents: 2000,
        sortOrder: 6,
        links: [{ category: "featured", sortOrder: 6 }],
      },
      {
        key: "jollof-asun",
        category: "rice",
        name: "Jollof and Asun (Spicy Goat Meat)",
        description: "Jollof rice with spicy asun goat meat.",
        priceCents: 2799,
        sortOrder: 7,
        links: [{ category: "featured", sortOrder: 7 }],
      },
      {
        key: "jollof-assorted",
        category: "rice",
        name: "Jollof Rice and Assorted Beef",
        description: "Party jollof with tender assorted beef.",
        priceCents: 2000,
        sortOrder: 8,
        links: [{ category: "featured", sortOrder: 8 }],
      },
      {
        key: "jollof-suya",
        category: "rice",
        name: "Jollof Rice and Suya",
        description: "Jollof rice served with spicy suya.",
        priceCents: 2999,
        sortOrder: 9,
        links: [{ category: "featured", sortOrder: 9 }],
      },
      {
        key: "efo-riro",
        category: "soups",
        name: "Efo Riro Soup",
        description: "Rich Nigerian spinach stew with assorted proteins.",
        priceCents: 1500,
        sortOrder: 0,
        links: [{ category: "featured", sortOrder: 15 }],
      },
      {
        key: "egusi",
        category: "soups",
        name: "Egusi Soup",
        description: "Thick melon-seed soup with leafy greens and meats.",
        priceCents: 1500,
        sortOrder: 1,
        links: [{ category: "featured", sortOrder: 16 }],
      },
      {
        key: "okra",
        category: "soups",
        name: "Okra Soup",
        description: "Draw soup with okra and assorted meats.",
        priceCents: 1500,
        sortOrder: 2,
        links: [{ category: "featured", sortOrder: 17 }],
      },
      {
        key: "ogbono",
        category: "soups",
        name: "Ogbono Soup",
        description: "Smooth ogbono soup with traditional spices and meats.",
        priceCents: 1500,
        sortOrder: 3,
        links: [{ category: "featured", sortOrder: 18 }],
      },
      {
        key: "ayamase-only",
        category: "soups",
        name: "Ayamase Stew Only",
        description: "Ayamase (designer) stew without rice.",
        priceCents: 1699,
        sortOrder: 4,
        links: [{ category: "featured", sortOrder: 19 }],
      },
      {
        key: "tomato-stew-chicken",
        category: "soups",
        name: "Tomato Stew with Chicken",
        description:
          "Classic Nigerian tomato stew served with 2 pieces of chicken. Add extras if you like.",
        priceCents: 1699,
        sortOrder: 5,
        links: [{ category: "featured", sortOrder: 20 }],
      },
      {
        key: "half-tray-rice",
        category: "family",
        name: "Half Tray Party Rice",
        description:
          "Perfect for small gatherings. Rich, well-seasoned Nigerian rice made to share. A customer favorite for group meals.",
        // Doc: half without chicken $50 / with $60
        priceCents: 5000,
        sortOrder: 0,
        links: [
          { category: "popular", sortOrder: 0 },
          { category: "featured", sortOrder: 34 },
        ],
      },
      {
        key: "full-tray-rice",
        category: "family",
        name: "Full Tray Party Rice - Family Pack",
        description:
          "Large family-sized tray designed for sharing and events. Generous portions that satisfy everyone.",
        // Doc: full without chicken $100 / with $120
        priceCents: 10000,
        sortOrder: 1,
        links: [
          { category: "popular", sortOrder: 1 },
          { category: "featured", sortOrder: 35 },
        ],
      },
      {
        key: "assorted-stew",
        category: "family",
        name: "Assorted Stew",
        description:
          "Thick tomato stew cooked with assorted meats. Choose a bowl size.",
        priceCents: 3500,
        sortOrder: 2,
        links: [
          { category: "soups", sortOrder: 10 },
          { category: "featured", sortOrder: 21 },
        ],
      },
      {
        key: "chicken-stew",
        category: "family",
        name: "Chicken Stew",
        description:
          "Classic Nigerian tomato stew with tender chicken. Choose a bowl size — 2.6L is best value for sharing.",
        priceCents: 3500,
        sortOrder: 3,
        links: [
          { category: "soups", sortOrder: 11 },
          { category: "popular", sortOrder: 2 },
          { category: "featured", sortOrder: 22 },
        ],
      },
      {
        key: "ayamashe-bulk",
        category: "family",
        name: "Ayamashe Stew Bulk",
        description: "Ayamase sauce. Choose a bowl size for sharing.",
        // Doc Ayamase bowls from 1L $35
        priceCents: 3500,
        sortOrder: 4,
      },
      {
        key: "egusi-bulk",
        category: "family",
        name: "Egusi Soup Bulk",
        description:
          "Rich and hearty melon seed soup cooked with premium spices, leafy greens, and assorted meats. Thick, flavorful, and perfect for sharing at family gatherings or events.",
        // Doc Egusi bowls from 1L $35
        priceCents: 3500,
        sortOrder: 5,
      },
      {
        key: "efo-bulk",
        category: "family",
        name: "Efo Riro Soup Bulk",
        description:
          "Deeply flavorful vegetable-based stew cooked in a rich pepper sauce with assorted meats. Family bowl sizes for gatherings.",
        // Doc Efo bowls from 1L $30
        priceCents: 3000,
        sortOrder: 6,
      },
      {
        key: "okra-bulk",
        category: "family",
        name: "Okra Soup Bulk",
        description:
          "Fresh okra soup cooked to a perfect consistency with tender meats and authentic spices. Light, flavorful, and ideal for satisfying large appetites.",
        priceCents: 3000,
        sortOrder: 7,
      },
      {
        key: "ogbono-bulk",
        category: "family",
        name: "Ogbono Soup Bulk",
        description:
          "Smooth and savory ogbono soup with a signature draw, cooked with traditional spices and a mix of quality meats. A comforting classic made for large portions and sharing.",
        priceCents: 3000,
        sortOrder: 8,
      },
      {
        key: "plantain-tray",
        category: "family",
        name: "Half Tray of Fried Plantain",
        description: "Half Tray of crispy fried plantain.",
        priceCents: 6499,
        sortOrder: 9,
        links: [
          { category: "popular", sortOrder: 10 },
          { category: "featured", sortOrder: 37 },
        ],
      },
      {
        key: "peppered-fish",
        category: "family",
        name: "Peppered Fish",
        description: "Fresh fish served in bulk.",
        priceCents: 9999,
        sortOrder: 10,
        links: [
          { category: "popular", sortOrder: 11 },
          { category: "featured", sortOrder: 38 },
        ],
      },
      {
        key: "peppered-chicken",
        category: "family",
        name: "Peppered Chicken",
        description: "Tender and juicy chicken in bulk.",
        priceCents: 8450,
        sortOrder: 11,
      },
      {
        key: "beans-bulk",
        category: "family",
        name: "Beans Bulk",
        description:
          "Large bowl of soft beans in a savory sauce. Generous, shareable portions for parties and events.",
        priceCents: 4299,
        sortOrder: 12,
        links: [
          { category: "popular", sortOrder: 12 },
          { category: "featured", sortOrder: 39 },
        ],
      },
    ];

    const itemIds = new Map<string, string>();
    const itemPrices = new Map<string, number>();
    const itemNames = new Map<string, string>();

    for (const def of items) {
      const categoryId = cats.get(def.category);
      if (!categoryId) throw new Error(`Missing category ${def.category}`);

      const found = await client.query(
        `SELECT id FROM "MenuItem" WHERE "storeId" = $1 AND name = $2`,
        [STORE_ID, def.name],
      );

      let id: string;
      if (found.rowCount && found.rows[0]) {
        id = found.rows[0].id as string;
        await client.query(
          `UPDATE "MenuItem"
           SET "categoryId" = $1, description = $2, "priceCents" = $3,
               available = true, "sortOrder" = $4, "updatedAt" = NOW()
           WHERE id = $5`,
          [categoryId, def.description, def.priceCents, def.sortOrder, id],
        );
      } else {
        id = cuid();
        const slug = await allocateSlug(def.name);
        await client.query(
          `INSERT INTO "MenuItem"
             (id, "storeId", "categoryId", name, slug, description, "priceCents", available, "sortOrder", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,NOW(),NOW())`,
          [
            id,
            STORE_ID,
            categoryId,
            def.name,
            slug,
            def.description,
            def.priceCents,
            def.sortOrder,
          ],
        );
      }

      itemIds.set(def.key, id);
      itemPrices.set(def.key, def.priceCents);
      itemNames.set(def.key, def.name);

      for (const link of def.links ?? []) {
        const linkCatId = cats.get(link.category);
        if (!linkCatId) continue;
        await client.query(
          `INSERT INTO "MenuItemCategory" ("itemId", "categoryId", "sortOrder")
           VALUES ($1,$2,$3)
           ON CONFLICT ("itemId", "categoryId") DO UPDATE SET "sortOrder" = EXCLUDED."sortOrder"`,
          [id, linkCatId, link.sortOrder],
        );
      }
    }

    const drinkKeys = [
      "drink-water",
      "drink-malt",
      "drink-orange-crush",
      "drink-pepsi",
      "drink-coke",
      "drink-sprite",
      "drink-canada-dry",
      "drink-oj",
      "drink-zobo",
      "drink-chivita",
      "drink-pure-heaven",
    ];

    /** Doc: 1L $35 → 2.2 $70 → 2.6 $80 → 4L $130 */
    const docBowls35: InlineMod[] = [
      { name: "1L Bowl", priceDeltaCents: 0, sortOrder: 0 },
      { name: "2.2L Bowl", priceDeltaCents: 3500, sortOrder: 1 },
      { name: "2.6L Bowl", priceDeltaCents: 4500, sortOrder: 2 },
      { name: "4L Bowl (Family Pack)", priceDeltaCents: 9500, sortOrder: 3 },
    ];
    /** Doc: 1L $30 → 2.2 $70 → 2.6 $80 → 4L $130 */
    const docBowls30: InlineMod[] = [
      { name: "1L Bowl", priceDeltaCents: 0, sortOrder: 0 },
      { name: "2.2L Bowl", priceDeltaCents: 4000, sortOrder: 1 },
      { name: "2.6L Bowl", priceDeltaCents: 5000, sortOrder: 2 },
      { name: "4L Bowl (Family Pack)", priceDeltaCents: 10000, sortOrder: 3 },
    ];

    const proteinGroup = (
      itemKey: string,
      keys: readonly string[],
      sortOrder = 0,
    ): GroupDef => ({
      itemKey,
      name: "Extra protein",
      required: false,
      minSelect: 0,
      maxSelect: 10,
      sortOrder,
      sourceItemKeys: [...keys],
    });

    const drinksGroup = (itemKey: string, sortOrder: number): GroupDef => ({
      itemKey,
      name: "Add drinks",
      required: false,
      minSelect: 0,
      maxSelect: 10,
      sortOrder,
      sourceItemKeys: drinkKeys,
    });

    const swallowGroup = (itemKey: string, sortOrder: number): GroupDef => ({
      itemKey,
      name: "Swallow",
      required: false,
      minSelect: 0,
      maxSelect: 5,
      sortOrder,
      sourceItemKeys: ["addon-poundo"],
    });

    const plantainGroup = (itemKey: string, sortOrder: number): GroupDef => ({
      itemKey,
      name: "Plantain on meal",
      required: false,
      minSelect: 0,
      maxSelect: 5,
      sortOrder,
      sourceItemKeys: ["addon-plantain"],
    });

    const breadGroup = (itemKey: string, sortOrder = 0): GroupDef => ({
      itemKey,
      name: "Add bread",
      required: false,
      minSelect: 0,
      maxSelect: 10,
      sortOrder,
      sourceItemKeys: ["addon-agege-sliced", "addon-agege-unsliced"],
    });

    const groups: GroupDef[] = [
      breadGroup("egg-roll"),
      proteinGroup("moi-moi", proteinKeys),
      breadGroup("meat-pie"),
      proteinGroup("beans-plantain", proteinNoEgg, 0),
      breadGroup("beans-plantain", 1),
      drinksGroup("beans-plantain", 2),
      drinksGroup("asun", 0),

      proteinGroup("jollof-plantain-chicken", proteinNoSuya),
      drinksGroup("jollof-plantain-chicken", 1),
      proteinGroup("ayamashe-rice", proteinNoSuya),
      drinksGroup("ayamashe-rice", 1),
      proteinGroup("jollof-fish", proteinKeys),
      plantainGroup("jollof-fish", 1),
      drinksGroup("jollof-fish", 2),
      proteinGroup("jollof-turkey", proteinKeys),
      plantainGroup("jollof-turkey", 1),
      drinksGroup("jollof-turkey", 2),
      proteinGroup("jollof-chicken", proteinKeys),
      drinksGroup("jollof-chicken", 1),
      proteinGroup("fried-rice-chicken", proteinKeys),
      plantainGroup("fried-rice-chicken", 1),
      drinksGroup("fried-rice-chicken", 2),
      proteinGroup("tomato-stew-rice", proteinKeys),
      plantainGroup("tomato-stew-rice", 1),
      drinksGroup("tomato-stew-rice", 2),
      proteinGroup("jollof-asun", proteinKeys),
      plantainGroup("jollof-asun", 1),
      drinksGroup("jollof-asun", 2),
      proteinGroup("jollof-assorted", proteinKeys),
      drinksGroup("jollof-assorted", 1),
      proteinGroup("jollof-suya", proteinKeys),
      plantainGroup("jollof-suya", 1),
      drinksGroup("jollof-suya", 2),

      swallowGroup("efo-riro", 0),
      proteinGroup("efo-riro", proteinNoSuya, 1),
      proteinGroup("egusi", proteinKeys, 0),
      swallowGroup("egusi", 1),
      swallowGroup("okra", 0),
      proteinGroup("okra", proteinNoSuya, 1),
      proteinGroup("ogbono", proteinKeys, 0),
      swallowGroup("ogbono", 1),
      proteinGroup("ayamase-only", proteinKeys),
      proteinGroup("tomato-stew-chicken", proteinKeys),

      {
        itemKey: "half-tray-rice",
        name: "Choose Rice Type - Half Tray",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        sourceCategory: "riceTypes",
      },
      {
        itemKey: "half-tray-rice",
        name: "Choose Chicken Quantity - Half Tray",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 1,
        sourceCategory: "chickenQty",
      },
      {
        itemKey: "full-tray-rice",
        name: "Choose Rice Type - Full Tray",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        sourceCategory: "riceTypes",
      },
      {
        itemKey: "full-tray-rice",
        name: "Choose Chicken Quantity - Full Tray",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 1,
        inline: [
          { name: "No chicken", priceDeltaCents: 0, sortOrder: 0 },
          // Doc full with chicken $120 = base $100 + $20
          { name: "10 Pieces of Chicken", priceDeltaCents: 2000, sortOrder: 1 },
        ],
      },
      {
        itemKey: "assorted-stew",
        name: "Bowl size",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        inline: docBowls35,
      },
      {
        itemKey: "chicken-stew",
        name: "Bowl size",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        inline: docBowls35,
      },
      {
        itemKey: "ayamashe-bulk",
        name: "Bowl size",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        inline: docBowls35,
      },
      {
        itemKey: "egusi-bulk",
        name: "Bowl size",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        inline: docBowls35,
      },
      {
        itemKey: "efo-bulk",
        name: "Bowl size",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        inline: docBowls30,
      },
      {
        itemKey: "okra-bulk",
        name: "Bowl size",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        inline: docBowls30,
      },
      {
        itemKey: "ogbono-bulk",
        name: "Bowl size",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        inline: docBowls30,
      },
      {
        itemKey: "peppered-fish",
        name: "Fish Bulk",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        inline: [
          { name: "Half tray", priceDeltaCents: 0, sortOrder: 0 },
          { name: "Full tray", priceDeltaCents: 9901, sortOrder: 1 },
        ],
      },
      {
        itemKey: "peppered-chicken",
        name: "Chicken - Bulk",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        inline: [
          { name: "Half Tray", priceDeltaCents: 0, sortOrder: 0 },
          { name: "Full Tray", priceDeltaCents: 8450, sortOrder: 1 },
        ],
      },
      {
        itemKey: "beans-bulk",
        name: "Beans Bowl Size",
        required: true,
        minSelect: 1,
        maxSelect: 10,
        sortOrder: 0,
        inline: [
          { name: "1.2L Bowl", priceDeltaCents: 0, sortOrder: 0 },
          { name: "2.2L Bowl", priceDeltaCents: 2136, sortOrder: 1 },
          { name: "2.6L Bowl", priceDeltaCents: 2900, sortOrder: 2 },
        ],
      },
    ];

    const byItem = new Map<string, GroupDef[]>();
    for (const g of groups) {
      const list = byItem.get(g.itemKey) ?? [];
      list.push(g);
      byItem.set(g.itemKey, list);
    }

    for (const [itemKey, list] of byItem) {
      const itemId = itemIds.get(itemKey);
      if (!itemId) throw new Error(`Missing item ${itemKey}`);

      await client.query(`DELETE FROM "MenuModifierGroup" WHERE "itemId" = $1`, [
        itemId,
      ]);

      for (const g of list) {
        const groupId = cuid();
        const sourceCategoryId = g.sourceCategory
          ? (cats.get(g.sourceCategory) ?? null)
          : null;
        await client.query(
          `INSERT INTO "MenuModifierGroup"
             (id, "itemId", name, required, "minSelect", "maxSelect", "sortOrder", "sourceCategoryId", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
          [
            groupId,
            itemId,
            g.name,
            g.required,
            g.minSelect,
            g.maxSelect,
            g.sortOrder,
            sourceCategoryId,
          ],
        );

        if (g.sourceItemKeys) {
          for (const [index, key] of g.sourceItemKeys.entries()) {
            const sourceId = itemIds.get(key);
            if (!sourceId) throw new Error(`Missing source item ${key}`);
            await client.query(
              `INSERT INTO "MenuModifier"
                 (id, "groupId", name, "priceDeltaCents", available, "sortOrder", "sourceItemId", "createdAt", "updatedAt")
               VALUES ($1,$2,$3,$4,true,$5,$6,NOW(),NOW())`,
              [
                cuid(),
                groupId,
                itemNames.get(key)!,
                itemPrices.get(key)!,
                index,
                sourceId,
              ],
            );
          }
        }

        if (g.inline) {
          for (const m of g.inline) {
            await client.query(
              `INSERT INTO "MenuModifier"
                 (id, "groupId", name, "priceDeltaCents", available, "sortOrder", "createdAt", "updatedAt")
               VALUES ($1,$2,$3,$4,true,$5,NOW(),NOW())`,
              [cuid(), groupId, m.name, m.priceDeltaCents, m.sortOrder],
            );
          }
        }
      }
    }

    await client.query("COMMIT");

    const summary = await client.query(
      `SELECT
         (SELECT count(*)::int FROM "MenuCategory" WHERE "storeId" = $1) AS cats,
         (SELECT count(*)::int FROM "MenuItem" WHERE "storeId" = $1) AS items,
         (SELECT count(*)::int FROM "MenuModifierGroup" g
            JOIN "MenuItem" i ON i.id = g."itemId" WHERE i."storeId" = $1) AS groups,
         (SELECT count(*)::int FROM "MenuModifier" m
            JOIN "MenuModifierGroup" g ON g.id = m."groupId"
            JOIN "MenuItem" i ON i.id = g."itemId" WHERE i."storeId" = $1) AS mods`,
      [STORE_ID],
    );

    console.log(
      JSON.stringify(
        {
          store: store.rows[0].name,
          ...summary.rows[0],
          note: "Photos not restored — re-upload in dashboard.",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
