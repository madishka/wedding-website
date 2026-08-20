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

  /**
   * Which sections appear behind a guest's link.
   *
   * The site grows as logistics firm up — flip a flag, no code changes.
   * Order on the page is fixed: hero → welcome → weekend → travel → rsvp.
   */
  sections: {
    welcomeNote: true,

    /** How to reach Santorini. Evergreen and already accurate. */
    gettingThere: true,

    /**
     * Hotel recommendations and room blocks. OFF until the blocks are
     * actually negotiated — publishing picks you might change is worse
     * than publishing nothing, because guests book against them.
     * Turn on in the fall with the real invitations.
     */
    whereToStay: false,
  },

  couple: { partnerA: "Madelaine", partnerB: "Philip" },
  dateLabel: "07.24.2027",
  placeLabel: "Santorini, Greece",
  /** RSVP deadline shown in the "Kindly reply by" block. */
  replyBy: { month: "October", day: "1", year: "2026" },

  /**
   * The welcome note. ⚠️ Placeholder — swap in your and Philip's real
   * words. Kept here rather than in the component so changing it is a
   * one-file edit.
   */
  welcomeNote: {
    eyebrow: "A note from us",
    title: "We're so glad you're here",
    paragraphs: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt.",
    ],
  },
};
