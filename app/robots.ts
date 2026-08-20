import type { MetadataRoute } from "next";

/** The whole site stays out of search results — including the public
 *  save-the-date page, which still names the couple and the date. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
