/**
 * Site-wide knobs, kept in one place on purpose.
 *
 * Later these move into the database (or Vercel Edge Config) so you can
 * flip them without a deploy — for now, editing this file and deploying
 * is perfectly fine.
 */
export const siteConfig = {
  /**
   * "save-the-date" → the current single-page site.
   * "full"          → the full wedding website, once the itinerary exists.
   * Layouts/pages can branch on this instead of maintaining two sites.
   */
  phase: "save-the-date" as "save-the-date" | "full",

  /**
   * Shown as a banner at the very top of the page when non-empty.
   * e.g. "Room blocks are live — see Where to stay below."
   */
  announcement: "",

  /**
   * WhatsApp group invite link (https://chat.whatsapp.com/...).
   * When set, a "Join the WhatsApp group" chip appears in the footer.
   */
  whatsappGroupUrl: "",

  couple: { partnerA: "Madelaine", partnerB: "Philip" },
  dateLabel: "07.24.2027",
  placeLabel: "Santorini, Greece",
  /** RSVP deadline shown in the "Kindly reply by" block. */
  replyBy: { month: "October", day: "1", year: "2026" },
};
