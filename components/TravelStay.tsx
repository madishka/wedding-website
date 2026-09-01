import { Reveal } from "./Reveal";
import { siteConfig } from "@/lib/site-config";

const GETTING_THERE = [
  {
    title: "By air",
    body: "Santorini's airport (JTR) is served by several daily flights from Athens, plus seasonal direct routes from many European cities.",
  },
  {
    title: "By sea",
    body: "Several ferries run daily from Athens (Piraeus) to the Santorini port, with both high-speed and slower conventional options.",
  },
  {
    title: "Getting around",
    body: "Uber is limited on the island and taxis can be expensive. Rental cars are available at both the pier and the airport, and are a good option if you're looking to explore the island. ATVs are a popular choice too.",
    note: "Please note: transportation to and from our wedding day will be provided.",
  },
];

/* Placeholder hotels — swap in the real recommendations. */
const HOTELS = [
  {
    name: "Hotel Levanta",
    town: "Imerovigli",
    body: "Caldera-view suites a short walk from the shuttle pickup. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    name: "Hotel Meltemi",
    town: "Imerovigli",
    body: "A quieter cliffside stay with a pool overlooking the sea. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    name: "Hotel Kyma",
    town: "Imerovigli",
    body: "Simple, lovely rooms in the heart of town. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
];

/**
 * Two halves that firm up on different timelines.
 *
 * "Getting there" is evergreen — JTR, the ferries, and the fact that we
 * run the shuttles. True now, true in a year. "Where to stay" depends on
 * room blocks that don't exist yet, so it stays off: a guest who books
 * against a recommendation you later change has either overpaid or has
 * to cancel. Both are toggled in lib/site-config.ts.
 */
export function TravelStay() {
  const { gettingThere, whereToStay } = siteConfig.sections;
  if (!gettingThere && !whereToStay) return null;

  return (
    <section className="travel" id="travel">
      <div className="container">
        <Reveal>
          <p className="eyebrow center">Travel &amp; stay</p>
          <h2 className="section-title center">Getting to Santorini</h2>
        </Reveal>
        {gettingThere && (
        <div className="travel-grid">
          {GETTING_THERE.map((block, i) => (
            <Reveal key={block.title} delay={i * 90}>
              <article className="travel-block">
                <h3>{block.title}</h3>
                <p>{block.body}</p>
                {block.note && <p className="travel-note">{block.note}</p>}
              </article>
            </Reveal>
          ))}
        </div>
        )}

        {/* Until room blocks exist, tell guests plainly not to book yet —
            it is the single most useful thing this section can say. */}
        {gettingThere && !whereToStay && (
          <Reveal delay={140}>
            <p className="stay-note center">
              We&apos;re still sorting hotel blocks and recommendations —
              those come with the full invitation in the autumn. No need to
              book anywhere to stay just yet.
            </p>
          </Reveal>
        )}

        {whereToStay && (
        <div className="stay">
          <Reveal>
            <h3 className="stay-title">Where to stay</h3>
            <p className="stay-intro">
              We recommend booking at one of these hotels — it keeps shuttle
              logistics simple, and you&apos;ll be close to everything.
            </p>
          </Reveal>
          <div className="hotel-grid">
            {HOTELS.map((hotel, i) => (
              <Reveal key={hotel.name} delay={i * 90}>
                <article className="hotel-card">
                  <p className="hotel-town">{hotel.town}</p>
                  <h4>{hotel.name}</h4>
                  <p className="hotel-body">{hotel.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="stay-note">
              Prefer an Airbnb? That works too — we&apos;d just suggest staying
              in or near Imerovigli, since that&apos;s where the wedding
              shuttles will pick up and drop off.
            </p>
          </Reveal>
        </div>
        )}
      </div>
    </section>
  );
}
