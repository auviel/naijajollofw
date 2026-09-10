/**
 * Re-link orphan R2 photos (old menu item IDs) to the restored Waterloo catalog.
 *
 * Keeps existing public CDN URLs / object keys — no re-upload.
 *
 * Usage:
 *   DATABASE_URL='postgresql://...railway...' npx tsx scripts/reattach-r2-menu-images.ts
 *   DRY_RUN=1 ...  # print plan only
 */
import { randomBytes } from "node:crypto";
import pg from "pg";

const STORE_ID = "seed-store-waterloo";
const PUBLIC_BASE = "https://media.naijajollofw.ca";

/** old R2 folder id → target menu item name(s) (exact DB names). */
const OLD_FOLDER_TO_NAMES: Record<string, string[]> = {
  // Early protein / side uploads
  cmsgawtmz0001xvkdi882yxoo: ["Assorted"],
  cmsgawtpy0003xvkdyjdy0p5u: ["Chicken"],
  cmsgawtts0005xvkdjfema7yg: ["Peppered Fish", "Fish"],
  cmsgawtve0007xvkde1jo3mlq: ["Turkey"],
  cmsgawtwz0009xvkdyr5ru3q2: ["Egg"],
  cmsgawtyk000bxvkdmvmw1kz1: ["Poundo Yam"],
  cmsgawu0u000dxvkd4g6lnjvo: ["Efo Riro Soup"],

  // Drinks + sides batch
  cmsgd91iu0001xvl8ivp5ira0: ["Plantain"],
  cmsgd91la0003xvl8fdov6yhs: ["Water"],
  cmsgd91my0005xvl8vl87nyrz: ["Malt"],
  cmsgd91oj0007xvl8jf9o6ttw: ["Orange Crush"],
  cmsgd91q90009xvl8ycokk1ln: ["Pepsi"],
  cmsgd91rr000bxvl8wv4vtrj2: ["Coca Cola"],
  cmsgd91td000dxvl8txrynh87: ["Sprite"],
  cmsgd91ux000fxvl8bd3pofe3: ["Canada Dry"],
  cmsgd91wi000hxvl8dphjp12t: ["Orange Juice"],
  cmsgd91y1000jxvl8jdwsjcv9: ["Zobo"],
  cmsgd91zm000lxvl8yu0vigl6: ["Chivita"],
  cmsgd9218000nxvl82nzj66lc: ["Pure Heaven"],
  cmsgd923m000pxvl8wqeb0wqw: ["Jollof Rice and Turkey"],

  cmsgdlx730001xvg8jeuo1pdb: ["Egusi Soup"],
  cmsgdtekh0001xvowb860q2fp: ["Okra Soup"],
  cmsgduhoj0001xvb6242dk169: ["Agege Bread - sliced"],
  cmsgduhqy0003xvb6k9pl8zkm: ["Agege Bread - unsliced"],
  cmsgduhty0005xvb6r16vyxha: ["Beans and Plantain"],
  cmsgfdska0001xvljoex9wv0p: ["Ayamashe Stew with White Rice"],

  // Custom catalog uploads
  cmt2opiuk0001uu9s3gm21cff: ["Suya"],
  cmt2orme80001uuj12v672xev: ["Jollof Rice and Fish"],
  cmt2p5hlb0001uu9b79ubsbvq: ["Jollof Rice and Chicken"],
  cmt2pfnqf0001uurgupp7dzik: ["Jollof Rice, Plantain and Chicken"],
  cmt2pjs5p0001uu38aqcpjxzy: ["Fried Rice and Chicken"],
  cmt2pkykv0001uugkej4qi961: ["Tomato Stew with White Rice"],
  cmt2pmgd80001uuksv3i17giy: ["Puff-Puff"],
  cmt2pnxtv0001uuop9syw42s6: ["Ogbono Soup"],
  cmt2ppoyj0001uuiqwhrjga1x: ["Asun — Spicy Goat Meat"],
  cmt2pqmaf0001uu44wckb9zyh: ["Meat Pie"],
  cmt2prsfk0001uu7usgixdpja: ["Assorted Stew"],
  cmt2psy3y0001uu7ejrd04zxi: ["Jollof and Asun (Spicy Goat Meat)"],
  cmt2pts3u0001uu64q2c7cj5x: ["Jollof Rice and Assorted Beef"],
  cmt2pukg70001uutf65ofy1pu: ["Chicken Stew"],
  cmt2q80eb0001uu31s5crwa3y: ["Jollof Rice and Suya"],
  cmt2qdfe00001uuf8ap8y0y2v: ["Ayamashe Stew Bulk", "Ayamase Stew Only"],
  cmt2qeeco0001uuy4lylhdeeu: ["Stewed Fish (5 pieces)"],
  cmt2qfhkc0001uuuzgwvh9696: ["Peppered Chicken", "Stewed Chicken (5 pieces)"],
  cmt2qh80h0001uu4mmmwb5u2s: ["Tomato Stew with Chicken"],
  cmt2qqa0s0001uuufko7qvwop: ["Puff-Puff"], // second gallery shot
  cmt2qqtzo0001uu6smm6hylb1: ["Moi Moi"],
  cmt2qzr3n000duu61ip1t3rwo: ["Half Tray Party Rice"],
  cmt2qzrbf000juu6174wesbu9: ["Full Tray Party Rice - Family Pack"],
  cmt2qzrlx000vuu61sso9im7n: ["Ayamashe Stew Bulk"], // same pot photo as qdfe
  cmt2qzrsl0017uu61095psypv: ["Egusi Soup Bulk"],
  cmt2qzrzh001juu61c6adj5jl: ["Efo Riro Soup Bulk"],
  cmt2qzs67001vuu61hau2mlw5: ["Okra Soup Bulk"],
  cmt2qzscw0027uu61vnvhbtjb: ["Ogbono Soup Bulk"],
  cmt2qzsit002juu61nzzizkk2: ["Half Tray of Fried Plantain"],
  cmt2qzsk9002luu61bjk5jo8q: ["Peppered Fish"],
  cmt2qzslr002nuu619ydhfmd9: ["Peppered Chicken"],
  cmt2r6ibz0001uurcm2x1ukxa: ["Beans Bulk"],
};

/** object filename per folder (from R2 list). */
const FOLDER_FILES: Record<string, string> = {
  cmsgawtmz0001xvkdi882yxoo: "70f14bad-622e-4613-aa59-c7ad12455555.jpg",
  cmsgawtpy0003xvkdyjdy0p5u: "d958ca27-d31f-47b3-b56b-6eb83f1a552b.jpg",
  cmsgawtts0005xvkdjfema7yg: "49a15b1a-7bd4-4953-8348-6043b2321cf4.jpg",
  cmsgawtve0007xvkde1jo3mlq: "4a62e255-6206-44a7-b6b9-83f2f8b68c55.jpg",
  cmsgawtwz0009xvkdyr5ru3q2: "b2ffec44-d9ba-423f-9575-d246ba92c49f.jpg",
  cmsgawtyk000bxvkdmvmw1kz1: "90343854-aeb3-4ffb-9b3f-262a037454c9.jpg",
  cmsgawu0u000dxvkd4g6lnjvo: "dcc50eba-2b5f-4cda-ab24-b34816331ef2.jpg",
  cmsgd91iu0001xvl8ivp5ira0: "daf5eade-0aca-4b3b-9f0d-e85610064dcb.jpg",
  cmsgd91la0003xvl8fdov6yhs: "c8bfa2c0-bb6c-477a-a3d1-9fa295b5388c.jpg",
  cmsgd91my0005xvl8vl87nyrz: "707d1b3d-c053-4a72-8134-1c2241442399.jpg",
  cmsgd91oj0007xvl8jf9o6ttw: "ad8c98b4-cc2a-4f7d-9dab-0c2b6e3aaa75.jpg",
  cmsgd91q90009xvl8ycokk1ln: "4237dbd4-d4a2-4738-b2e6-ff3d7c8f80ad.jpg",
  cmsgd91rr000bxvl8wv4vtrj2: "4a4ca5ea-4929-426b-9657-39b46d044c64.jpg",
  cmsgd91td000dxvl8txrynh87: "a1e2ca5a-8a22-44a0-bf31-c7d80e8f91c3.jpg",
  cmsgd91ux000fxvl8bd3pofe3: "9af9fa70-dd94-425b-9a01-9c2c7c5b7237.jpg",
  cmsgd91wi000hxvl8dphjp12t: "01f7b919-09be-4cee-8a3f-07d03ef7524d.jpg",
  cmsgd91y1000jxvl8jdwsjcv9: "ced510c4-70bc-4763-b7a5-32006645fd08.jpg",
  cmsgd91zm000lxvl8yu0vigl6: "528fe449-5301-4e93-80d0-eb2ae2d63025.jpg",
  cmsgd9218000nxvl82nzj66lc: "89015262-c627-47b0-a5ea-83161f54d32c.jpg",
  cmsgd923m000pxvl8wqeb0wqw: "b012afd8-1fc0-47ab-af42-b7ad16822b4a.jpg",
  cmsgdlx730001xvg8jeuo1pdb: "7c012331-eb16-4958-9ace-56fa1bc45f3b.jpg",
  cmsgdtekh0001xvowb860q2fp: "b526b410-44ba-4c9d-9a90-3fb045a997ea.jpg",
  cmsgduhoj0001xvb6242dk169: "ceadfc32-9a01-4684-bd65-9dd2ce3c64d8.jpg",
  cmsgduhqy0003xvb6k9pl8zkm: "0c1371ef-0bcf-40e6-8764-ef736fd616e7.jpg",
  cmsgduhty0005xvb6r16vyxha: "f42b49bc-1237-4c9e-8bda-40a07de6fa4a.jpg",
  cmsgfdska0001xvljoex9wv0p: "d8871235-02ee-46fb-9307-fe7bc80a7326.jpg",
  cmt2opiuk0001uu9s3gm21cff: "1eb23550-4db0-4b03-9a63-15248341ec5b.png",
  cmt2orme80001uuj12v672xev: "442d4c9e-c98c-48bf-bf00-db71dd226302.jpg",
  cmt2p5hlb0001uu9b79ubsbvq: "85ffb249-3e76-4d1f-8c63-3e7fa5064811.jpg",
  cmt2pfnqf0001uurgupp7dzik: "d4d66c2e-dac6-4dd1-aaf4-06fe146efcb6.jpg",
  cmt2pjs5p0001uu38aqcpjxzy: "5d739b63-3eeb-48ba-b2da-a5067be2347b.jpg",
  cmt2pkykv0001uugkej4qi961: "270a98b3-3ba3-4528-834c-e8e16964172e.jpg",
  cmt2pmgd80001uuksv3i17giy: "416f48e0-6dce-4cfb-bac8-c0e70d8abe9a.jpg",
  cmt2pnxtv0001uuop9syw42s6: "ff6234a7-9d8c-4a36-902c-0d8977a6c0ff.jpg",
  cmt2ppoyj0001uuiqwhrjga1x: "7c5510ad-5c06-40d7-9ced-6238bcb8e20f.jpg",
  cmt2pqmaf0001uu44wckb9zyh: "8a2d7b7c-0042-46f2-b824-038b95978602.jpg",
  cmt2prsfk0001uu7usgixdpja: "c55f3c81-d0a9-4a75-8feb-77633112739f.png",
  cmt2psy3y0001uu7ejrd04zxi: "be38eddf-2c6c-41d6-ac9f-254bb2dedad3.jpg",
  cmt2pts3u0001uu64q2c7cj5x: "76b0274d-b1da-410c-842a-4329729e302a.jpg",
  cmt2pukg70001uutf65ofy1pu: "d75e4d49-5cfa-4588-ab0e-be673b7bcbe3.jpg",
  cmt2q80eb0001uu31s5crwa3y: "c3f116af-3d24-49a4-a632-79c21fe6f20b.jpg",
  cmt2qdfe00001uuf8ap8y0y2v: "978cc391-6d1a-4cec-802e-18ecd6f2c389.jpg",
  cmt2qeeco0001uuy4lylhdeeu: "591b830b-7bec-45b5-afde-8bdc7b55fba6.jpg",
  cmt2qfhkc0001uuuzgwvh9696: "6504833a-c0a2-447a-b24e-a2753e8afe8f.jpg",
  cmt2qh80h0001uu4mmmwb5u2s: "c06c071e-df31-4b91-b972-211f27d9e86c.jpg",
  cmt2qqa0s0001uuufko7qvwop: "271a4fce-aceb-4080-af85-e9f8d2ba3bae.jpg",
  cmt2qqtzo0001uu6smm6hylb1: "e351b5e3-4c13-4223-b127-5a8537131a9f.jpg",
  cmt2qzr3n000duu61ip1t3rwo: "147af02d-3688-4951-a07b-675d0827a601.jpg",
  cmt2qzrbf000juu6174wesbu9: "ee88ae01-f41d-4bb9-b5c2-096697a6b913.png",
  cmt2qzrlx000vuu61sso9im7n: "f39d8833-1c08-445f-9df7-832fbbfe1e2f.jpg",
  cmt2qzrsl0017uu61095psypv: "917d2cb4-a96d-4d84-93f6-72cc7cc0447b.jpg",
  cmt2qzrzh001juu61c6adj5jl: "ef3a3754-44dd-4a88-93f3-ef0248bc512f.jpg",
  cmt2qzs67001vuu61hau2mlw5: "93085266-ab35-4aad-8568-fadfd13fbc23.jpg",
  cmt2qzscw0027uu61vnvhbtjb: "de60da23-3432-4ab7-aee0-30721a1124bf.jpg",
  cmt2qzsit002juu61nzzizkk2: "4d0c29bd-6793-4930-8ed0-a95612cd79f7.jpg",
  cmt2qzsk9002luu61bjk5jo8q: "f6970156-f2c4-46b1-a270-c8c3e351383a.jpg",
  cmt2qzslr002nuu619ydhfmd9: "3801848f-46aa-4810-bd48-3fcd26e607ed.jpg",
  cmt2r6ibz0001uurcm2x1ukxa: "4eeaf5af-059d-4cac-84a1-abd16c9b5c87.jpg",
};

function cuid(): string {
  return `c${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;
}

function assertRailwayLikeUrl(url: string) {
  if (!/\.rlwy\.net|\.railway\.app/i.test(url)) {
    throw new Error(
      "Refusing: DATABASE_URL does not look like Railway. Pass the Railway public URL explicitly.",
    );
  }
}

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  assertRailwayLikeUrl(url);

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const items = await client.query<{ id: string; name: string; imageUrl: string | null }>(
    `select id, name, "imageUrl" from "MenuItem" where "storeId"=$1`,
    [STORE_ID],
  );
  const byName = new Map(items.rows.map((r) => [r.name, r]));

  const missingNames = new Set<string>();
  type Link = { oldId: string; name: string; itemId: string; url: string; objectKey: string };
  const links: Link[] = [];

  for (const [oldId, names] of Object.entries(OLD_FOLDER_TO_NAMES)) {
    const file = FOLDER_FILES[oldId];
    if (!file) {
      console.warn("No file for folder", oldId);
      continue;
    }
    const objectKey = `stores/${STORE_ID}/menu/${oldId}/${file}`;
    const publicUrl = `${PUBLIC_BASE}/${objectKey}`;
    for (const name of names) {
      const item = byName.get(name);
      if (!item) {
        missingNames.add(name);
        continue;
      }
      links.push({ oldId, name, itemId: item.id, url: publicUrl, objectKey });
    }
  }

  // Deduplicate identical url+itemId (e.g. Ayamashe Bulk from two folders)
  const seen = new Set<string>();
  const uniqueLinks = links.filter((l) => {
    const k = `${l.itemId}::${l.url}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  console.log(`Planned links: ${uniqueLinks.length}`);
  if (missingNames.size) {
    console.warn("Missing item names in DB:", [...missingNames]);
  }

  const covered = new Set(uniqueLinks.map((l) => l.name));
  const uncovered = items.rows
    .map((r) => r.name)
    .filter((n) => !covered.has(n))
    .sort();
  console.log(`Items still without a mapped photo (${uncovered.length}):`);
  for (const n of uncovered) console.log(`  - ${n}`);

  if (dryRun) {
    for (const l of uniqueLinks) {
      console.log(`${l.name} ← ${l.oldId}`);
    }
    await client.end();
    return;
  }

  let inserted = 0;
  let coversSet = 0;

  await client.query("BEGIN");
  try {
    // Clear any existing gallery rows for this store (should be empty after wipe)
    await client.query(
      `delete from "MenuItemImage" where "itemId" in (select id from "MenuItem" where "storeId"=$1)`,
      [STORE_ID],
    );

    const sortByItem = new Map<string, number>();
    for (const l of uniqueLinks) {
      const sortOrder = sortByItem.get(l.itemId) ?? 0;
      sortByItem.set(l.itemId, sortOrder + 1);
      const id = cuid();
      await client.query(
        `insert into "MenuItemImage" (id, "itemId", url, "objectKey", "sortOrder", "createdAt", "updatedAt")
         values ($1,$2,$3,$4,$5,now(),now())`,
        [id, l.itemId, l.url, l.objectKey, sortOrder],
      );
      inserted++;

      const item = byName.get(l.name)!;
      if (!item.imageUrl || sortOrder === 0) {
        await client.query(`update "MenuItem" set "imageUrl"=$1, "updatedAt"=now() where id=$2`, [
          l.url,
          l.itemId,
        ]);
        item.imageUrl = l.url;
        if (sortOrder === 0) coversSet++;
      }
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }

  const after = await client.query<{ with_img: number; gallery: number }>(
    `select
       (select count(*)::int from "MenuItem" where "storeId"=$1 and "imageUrl" is not null) as with_img,
       (select count(*)::int from "MenuItemImage" i join "MenuItem" m on m.id=i."itemId" where m."storeId"=$1) as gallery`,
    [STORE_ID],
  );
  console.log({ inserted, coversSet, ...after.rows[0] });
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
