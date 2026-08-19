import { Reveal } from "./Reveal";

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
    note: "Please note: transportation to and from all wedding activities will be provided.",
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

export function TravelStay() {
  return (
    <section className="travel" id="travel">
      <div className="container">
        <Reveal>
          <p className="eyebrow center">Travel &amp; stay</p>
          <h2 className="section-title center">Getting to Santorini</h2>
        </Reveal>
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
      </div>
    </section>
  );
}
