/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Media in public/ never changes in place — replacing a clip or
        // image means giving it a new filename (v2, -av1, …), same as
        // the hashed _next/static assets. So guests returning to their
        // link (and they do return — it's where the RSVP lives) pay for
        // the videos exactly once.
        source: "/:file*.:ext(mp4|jpg|avif|webp|glb|png|svg)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
