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
   * How much of the weekend to show behind a guest's link.
   *
   * "outline"   → the shape of the weekend only: the wedding day, with the
   *               days either side marked as still being planned. Nobody
   *               sees which specific gatherings they are or aren't in.
   * "per-event" → the real itinerary, filtered through `party_events` to
   *               the events this household is actually invited to.
   *
   * The database is the same either way. `party_events` keeps recording who
   * is invited to what while this says "outline", so flipping to
   * "per-event" with the real invitations needs no migration and no
   * re-import — just this line.
   */
  weekendDetail: "outline" as "outline" | "per-event",

  /**
   * The outline above, in words. Edited here rather than in the component
   * so changing the copy is a one-file edit — and so the day either side
   * can become real without touching any layout.
   *
   * Deliberately unspecific. "Something the evening before" tells a guest
   * to book two nights; naming the boat party would tell everyone it
   * exists, including the households not invited to it.
   */
  weekendOutline: [
    {
      dayLabel: "Friday",
      dateLabel: "July 23",
      name: "The evening before",
      body: "We're planning something to open the weekend. Details to come with the full invitation.",
      tbd: true,
    },
    {
      dayLabel: "Saturday",
      dateLabel: "July 24",
      name: "The wedding",
      body: "A clifftop ceremony overlooking the caldera, followed by dinner and dancing.",
      tbd: false,
    },
    {
      dayLabel: "Sunday",
      dateLabel: "July 25",
      name: "The morning after",
      body: "A slow send-off before everyone scatters. Details to come.",
      tbd: true,
    },
  ],

  /**
   * Which sections appear behind a guest's link.
   *
   * The site grows as logistics firm up — flip a flag, no code changes.
   * Order on the page is fixed: hero → weekend → travel → rsvp.
   */
  sections: {
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
  dateLabel: "July 24, 2027",
  placeLabel: "Santorini, Greece",
  /** RSVP deadline shown in the "Kindly reply by" block. */
  replyBy: { month: "October", day: "1", year: "2026" },

  /**
   * The note from us. No longer its own section — it opens the RSVP
   * card (SoftRsvp.tsx, left column), so the greeting, the message and
   * the ask to reply all live in one place. The greeting line is built
   * from the household's actual guests at render time — see
   * lib/names.ts — so this is only the body around it.
   */
  welcomeNote: {
    /** Precedes the names: "Dear Eric, Rebecca and Mia," — the
     *  personalized greeting is the card's title. */
    greeting: "Dear",
    paragraphs: [
      "We would love to celebrate with you! We're asking this early just to get a rough sense of numbers.",
    ],
  },
};
