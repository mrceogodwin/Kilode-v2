const ROOMS = [
  {
    title: "Feeds",
    body: "This is the newsroom. Stories sit in a grid. Open one for the full piece, comments, and related posts. The repost mark sends that story to the chat room you are in, or onto Socials under your own name, with a caption if you want one.",
  },
  {
    title: "Socials",
    body: "This is the street, not the paper. Short takes. Fact or cap. Reply, repost, like. Tap a name and you are on that person's profile, the same profile they use everywhere else. Search a @username at the top. The menu on a gist is how you report spam, a scam, hate, or a lie.",
  },
  {
    title: "Chat",
    body: "Rooms by topic and by place. The talk is live. Messages expire on a timer so a room stays a conversation, not a drawer of old links. Phone numbers and links stay out.",
  },
  {
    title: "Music",
    body: "An artist lists a track by its URL. Kilode does not store the song. The player points at the source. That door is for artists, not for a job poster who felt like uploading a beat.",
  },
  {
    title: "Cinema",
    body: "A YouTube title, watched here. Vote once a day on a title. Rate it. A cinema poster submits the link. Staff approve it before the room can vote it into Watching Now.",
  },
  {
    title: "Ads",
    body: "Paid slots, not a shout in the chat. You pay with Paystack, Flutterwave, or crypto. When the payment confirms, the ad runs on that slot for the days you bought. Staff can still take down a scam. A normal member never has to buy a slot just to talk.",
  },
  {
    title: "Jobs",
    body: "Job posters list the role. Seekers apply from their profile. Staff approve a listing before it is public. A job account posts jobs. It does not post music, and an artist account does not post a vacancy.",
  },
  {
    title: "Market, rent, downloads",
    body: "A product or a space is a listing plus a way to reach you. Kilode does not take that payment inside the app. Downloads is Kilode's own shelf: leave an email, get the file.",
  },
];

export function HowKilodePage() {
  return (
    <article className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      <button
        type="button"
        className="mb-3 text-[12px] font-semibold text-lime-2"
        onClick={() => window.dispatchEvent(new CustomEvent("kilode:goto", { detail: { screen: "home" } }))}
      >
        ← Back to Feeds
      </button>
      <p className="text-[10px] font-bold tracking-[0.2em] text-lime-2">ONE APP</p>
      <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight">How Kilode works</h1>
      <p className="mt-2 text-[15px] leading-6 text-muted">
        News sites do not talk. Social apps do not report. Job boards do not play the song. Kilode is the house that keeps all of them, with walls, so they do not smash into one feed.
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-black">
        <video
          className="aspect-video w-full bg-black"
          src="/howto/how-kilode.mp4"
          poster="/howto/poster.jpg"
          controls
          playsInline
          autoPlay
          muted
          loop
          preload="metadata"
        />
        <p className="px-3 py-2 text-[11px] text-muted">Ten seconds. The rooms, then the name. The writing under it is the real walkthrough.</p>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">The split was the trap</h2>
        <div className="mt-2 space-y-3 text-[14px] leading-6 text-fg/90">
          <p>
            You were told one app does one job. Read the news here. Argue over there. Look for work in a third place. Hear the culture in a fourth. By the time you are done, the people in the story, the people in the room, and the people hiring never meet.
          </p>
          <p>
            That split is the matrix. It looks tidy. It is just a way to make you open six doors for one life. Kilode breaks it by refusing the split, and by refusing the opposite mistake, which is dumping news, gossip, jobs, and songs into one endless scroll.
          </p>
          <p>
            So the house has rooms. Feeds is the paper. Socials is the take. Chat is the room with a clock. Music, cinema, jobs, ads, market, and rent each have their own door. Same person. Same @username. Same face. You do not write a second bio just to talk.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">The rooms</h2>
        <div className="mt-3 space-y-3">
          {ROOMS.map((r) => (
            <div key={r.title} className="rounded-2xl border border-line bg-panel px-3 py-3">
              <h3 className="text-[14px] font-extrabold">{r.title}</h3>
              <p className="mt-1 text-[13px] leading-5 text-muted">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">One profile. A locked type.</h2>
        <div className="mt-2 space-y-3 text-[14px] leading-6 text-fg/90">
          <p>
            Your face, @handle, bio, city, and verified mark live in one profile. Edit them from Me. They show on Socials, on your public page, and anywhere your name is the byline. There is no separate social bio to set up.
          </p>
          <p>
            You pick the account type when you join. It stays that type. A normal member reads, chats, posts a take, votes, and applies to jobs. An artist lists music. A writer files stories. A job poster lists roles. A seeker applies. An ads poster buys a slot. A cinema poster submits a film. A seller or a renter lists a thing and a way to reach them. A brand is the company door.
          </p>
          <p>
            The lock is not a punishment. A hybrid dies the day every account can do every thing. The newsroom stays a newsroom. The stage stays a stage. Work stays work. You chose the door because it matched the work.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">What is free, and what staff still check</h2>
        <div className="mt-2 space-y-3 text-[14px] leading-6 text-fg/90">
          <p>
            Reading Feeds, joining a chat room, posting on Socials, and a normal member account are free. You do not pay to have an opinion.
          </p>
          <p>
            Ads and cinema submissions are the paid doors. You pay in crypto. Staff still approve before it is public. A listing for a job can sit until staff pass it. Market and rent do not checkout inside Kilode. They show the listing and the contact.
          </p>
          <p>
            Super admin is not a type you can register. It is the desk that approves, hides, and removes. A report from Socials lands there. That desk is not for sale and it is not a badge you pick at join.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">A normal day</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-4 text-[14px] leading-6 text-fg/90">
          <li>Read the lead story in Feeds.</li>
          <li>Repost it to Socials with one line, or send it into the chat you are already in.</li>
          <li>Drop your own take. Fact or cap. People answer on the gist, not in a new app.</li>
          <li>If you make music, list the track. If you hire, post the role. If you came to watch, vote the film.</li>
          <li>Leave. The point is fewer apps, not another place that wants your whole night.</li>
        </ol>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-panel px-3 py-4">
        <h2 className="text-lg font-extrabold">If that is the house, join the right door</h2>
        <p className="mt-2 text-[13px] leading-5 text-muted">
          Pick the type that matches what you came to do. You can still read every room. You post through your own door. That is the whole idea, and it only works if the doors stay shut to the wrong work.
        </p>
        <button type="button" className="btn-join mt-3 w-full rounded-xl py-2.5 text-[13px] font-bold" onClick={() => (window.location.href = "/login?mode=up")}>
          Join Kilode
        </button>
      </section>
    </article>
  );
}
