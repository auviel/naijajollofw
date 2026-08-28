import { defineQuery } from "next-sanity";

const postCardFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  publishedAt,
  mainImage,
  "excerpt": pt::text(body)[0..180]
`;

export const POSTS_PAGE_QUERY = defineQuery(`{
  "total": count(*[_type == "post" && defined(slug.current) && publishedAt <= now()]),
  "posts": *[_type == "post" && defined(slug.current) && publishedAt <= now()]
    | order(publishedAt desc) [$start...$end] {
      ${postCardFields}
    }
}`);

export const POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug && publishedAt <= now()][0] {
    ${postCardFields},
    body,
    seo
  }
`);

export const RELATED_POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current) && publishedAt <= now() && slug.current != $slug]
    | order(publishedAt desc) [0...$limit] {
      ${postCardFields}
    }
`);

export const POST_SLUGS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current) && publishedAt <= now()].slug.current
`);

export const POST_SITEMAP_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current) && publishedAt <= now()] {
    "slug": slug.current,
    publishedAt
  }
`);
