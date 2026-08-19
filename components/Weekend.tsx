import { Reveal } from "./Reveal";

/* Placeholder copy — swap in real details as they firm up. */
const EVENTS = [
  {
    date: "July 23 · Evening",
    title: "Boat party",
    body: "The night before the wedding, we're taking to the water. Lorem ipsum dolor sit amet — details on the meeting point, timing, and what to bring are coming with the invitation.",
    featured: false,
  },
  {
    date: "July 24",
    title: "The wedding",
    body: "A clifftop ceremony overlooking the caldera, followed by dinner and dancing. Lorem ipsum dolor sit amet, consectetur adipiscing elit — venue details and timing to follow.",
    featured: true,
  },
  {
    date: "July 25 · Morning",
    title: "Pool party",
    body: "Ease into the day after with a slow morning by the pool. Lorem ipsum dolor sit amet — location and timing to follow with the full itinerary.",
    featured: false,
  },
];

export function Weekend() {
  return (
    <section className="weekend" id="weekend">
      <div className="container">
        <Reveal>
          <p className="eyebrow center">The weekend</p>
          <h2 className="section-title center">A long weekend on the Aegean</h2>
        </Reveal>
        <div className="event-grid">
          {EVENTS.map((event, i) => (
            <Reveal key={event.title} delay={i * 100}>
              <article
                className={`event-card ${event.featured ? "featured" : ""}`}
              >
                <p className="event-date">{event.date}</p>
                <h3>{event.title}</h3>
                <p className="event-body">{event.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
