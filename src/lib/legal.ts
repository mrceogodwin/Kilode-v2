export const LEGAL_UPDATED = "21 September 2026";

export const LEGAL_NAV = [
  { id: "terms", label: "Terms of Use" },
  { id: "rules", label: "Community Rules" },
  { id: "content", label: "Content & liability" },
  { id: "howto", label: "How to use Kilode" },
  { id: "ads", label: "Ads & crypto" },
  { id: "privacy", label: "Privacy" },
  { id: "cookies", label: "Cookies" },
  { id: "contact", label: "Contact" },
] as const;

export const HOWTO = [
  {
    id: "guest",
    title: "Visitor (not signed in)",
    body: "Browse Feeds, Chat (read), Music, Cinema, and public Ads. You cannot post, vote, comment, place ads, or open Me / Messages / Dashboard. Tap Join to create a username + password. No email is collected.",
  },
  {
    id: "member",
    title: "Normal user",
    body: "Chat in rooms, publish in Feeds, comment, vote on Cinema once per title per day, apply to jobs, join or create up to 3 Teams, bookmark rooms, save posts. You cannot list music, place ads, or submit movies.",
  },
  {
    id: "writer",
    title: "Writer",
    body: "Same as a Normal user, plus Feeds is your desk: title, body, excerpt, category, tags, featured image, source URL, SEO title and description. You are the publisher of every line. Kilode is not the editor of your copy.",
  },
  {
    id: "artist",
    title: "Artist",
    body: "List music as a URL to Spotify, SoundCloud, Audiomack, Apple Music, Boomplay or Deezer. Kilode embeds their player. We never host audio files. Spotify may play a 30-second preview unless the listener is logged into Spotify. SoundCloud / Audiomack play the full track if you allowed streaming on that platform.",
  },
  {
    id: "advertiser",
    title: "Ads Poster",
    body: "Place a business ad (image, video, image+text, video+text, or text). Copy the wallet shown in the app, pay in crypto, paste the transaction hash. Staff approve before it appears on Advert or in Chat. Never send funds to an address from a DM.",
  },
  {
    id: "cinema",
    title: "Cinema Poster",
    body: "Submit a YouTube watch URL and title. Staff approve. Signed-in users vote. The top title (or a staff pin) becomes Watching Now — a YouTube embed on Kilode, not a file we host.",
  },
  {
    id: "job_poster",
    title: "Job Poster",
    body: "List a job with a contact link. Staff approve. No in-app hiring, payroll, or contracts.",
  },
  {
    id: "job_seeker",
    title: "Job Seeker",
    body: "Apply to approved jobs with your handle and profile. Kilode is not your employer or recruiter.",
  },
  {
    id: "vendor",
    title: "Marketplace seller",
    body: "Showcase products with a photo and contact link. No cart, no checkout, no escrow on Kilode.",
  },
  {
    id: "renter",
    title: "Rent / space lister",
    body: "List a space with a contact link. No in-app lease, deposit, or keys.",
  },
  {
    id: "brand",
    title: "Brand / business",
    body: "Company page plus ads. Same crypto + staff-approve path as Ads Poster.",
  },
] as const;

export const HOWTO_MORE: Record<string, string[]> = {
  guest: [
    "Tap Feeds, Chat, Music, Cinema, Ads in the bottom bar. You can read everything public.",
    "Tap Join (top right) → username + password → pick a type → year born (15+) → tick Terms + Rules.",
    "No email. If you forget the password, only staff can reset it after you prove the handle.",
  ],
  member: [
    "Join as Normal user. Open Chat, Accept the ticker, then send. No links. No phone numbers.",
    "Feeds: tap New post if your type allows. Comment on a story after you sign in.",
    "Cinema: vote once per title per day. Jobs: apply from Jobs with a short note.",
  ],
  writer: [
    "Create post → title, body, excerpt, category, tags, featured image, source URL, SEO title + description.",
    "Publish. It appears on Feeds under your handle. Comments stay on unless you turn them off.",
    "You are the publisher. Kilode does not edit your copy. Staff may hide a post that breaks Rules.",
  ],
  artist: [
    "Create → Music. Paste a Spotify, SoundCloud, Audiomack, Apple, Boomplay or Deezer URL. No files.",
    "We embed their player. Artwork comes from that platform. We never host audio.",
  ],
  advertiser: [
    "Ads tab → Place ad. Pick slot (grid / chat stream / chat pin), creative type, and 1 / 7 / 14 / 30 days.",
    "Copy the wallet in the app. Pay crypto. Paste the tx hash. Tick Ads terms. Submit.",
    "Staff approve. Your campaigns list shows status, days left, and views. Never send funds to a DM.",
  ],
  cinema: [
    "Submit a YouTube watch URL + title from Cinema. Staff approve.",
    "Signed-in users vote once a day. Top title (or a staff pin) becomes Watching Now.",
  ],
  job_poster: [
    "Jobs → title, company, city, contact, duration (7 / 14 / 30 days). Staff approve. Re-submit to renew.",
  ],
  job_seeker: ["Open an approved job. Write a short apply note. Contact is on the listing."],
  vendor: ["Marketplace → product title, contact, duration. Staff approve. No cart on Kilode."],
  renter: ["Rent → space title, area, contact, duration. Staff approve. No deposits inside the app."],
  brand: ["Same ads path as Ads Poster, plus a company page. Crypto + staff approve."],
};

export const TERMS_LONG = `Kilode Terms of Use

Last updated ${LEGAL_UPDATED}

These Terms are a contract between you and the operator of Kilode (kilode.ng). By creating an account, ticking the boxes on Join, or using post, comment, chat, music, cinema, ads, jobs, marketplace, rent, or teams, you agree.

1. The service
Kilode is a public community for conversation, news-style posts, music links, cinema voting, and classified-style listings. It is not a bank, lawyer, employer, streaming host, or payment processor.

2. Eligibility
You must be 15 or older. You pick the year you were born at register. Kilode is not for children under 15. If you are under 18, a parent or guardian must agree that you may use the service.

3. Account
You register with a username and password. We do not collect a public email. You pick one account type at register. You cannot change it. The operator may override a type if you registered as the wrong one. You are responsible for your password. There is no email reset. If you forget it, only the operator can set a new one after you prove the handle is yours in chat or contact.

4. One person, one handle
Do not sell handles, run bots that spam, or impersonate Kilode or another person.

5. Licence you give us
You keep ownership of your words and images. You grant Kilode a worldwide licence to host, display, and distribute them on the service so other people can read them. If you delete an account, cached copies and lawful backups may remain for a time.

6. Our licence to you
We grant you a personal, non-exclusive, revocable right to use Kilode. You do not buy the software, the name, or the data of other people.

7. Termination
We may hide content, lock a handle, or refuse the service if you break these Terms or the Rules. You may stop using Kilode at any time.

8. As-is
The service is provided as-is. Chat is not advice. Listings are not verified beyond staff review of the form. We do not warrant uninterrupted uptime.

9. Limitation
To the maximum the law allows, Kilode and its operator are not liable for what users post, for lost crypto sent to a wrong address, or for indirect loss. Our total liability to you is limited to the amount you paid Kilode in the 12 months before the claim, or USD 0 if you paid nothing.

10. Indemnity
You will defend and hold Kilode harmless from claims that arise from your content, your ads, your music URLs, or your listings.

11. Law
These Terms are governed by the laws of Nigeria, without regard to conflict rules. Courts of competent jurisdiction in Nigeria may hear disputes, unless a mandatory consumer law says otherwise.

12. Changes
We may update these Terms. The date at the top will change. Continued use after that date is acceptance.`;

export const RULES_LONG = `Community Rules

Last updated ${LEGAL_UPDATED}

These Rules sit under the Terms. Breaking them can get a post hidden, a handle muted or banned, or an ad refused.

1. You are the publisher
You are responsible for every post, comment, chat line, music URL, movie URL, ad, job, product, and rent listing you submit. Kilode is a venue, not the author.

2. Illegal content
Do not post anything that is illegal where you live or in Nigeria: scams, fraud, stolen data, child sexual abuse material, terrorist content, or instructions to commit a crime.

3. Hate and harassment
Do not attack people for who they are. Do not dox, stalk, or threaten.

4. Sexually explicit content
Do not post pornographic images or sexual content involving anyone who is, or looks, under 18. Adult discussion in words may still be hidden if it breaks other rules.

5. Spam and manipulation
Do not flood chat, scrape the site, or buy fake votes.

6. Intellectual property
Only post images, copy, and URLs you have the right to share. Music must be a link to a platform you control or that already hosts the track. Do not upload audio or movie files. Kilode does not host them.

7. Private data
Do not post other people’s phone numbers, bank details, NIN, BVN, home address, or medical data.

8. Impersonation
Do not pretend to be Kilode, a government, or another member.

9. Ads
Ads must match the creative you submitted. Crypto payment does not guarantee approval. Staff may refuse political scams, fake investment schemes, and anything that breaks these Rules.

10. Reports
Use Report on a post if you believe it breaks these Rules. We may act, or we may not, at our discretion.

11. Enforcement
Mute, ban, hide, and refuse are operator tools. Appeals go through Contact while signed in. There is no public staff list.`;

export const CONTENT_LONG = `Content, liability, and takedown

1. User content
Posts, comments, chat, music listings, cinema submissions, ads, jobs, marketplace and rent rows are user content. Kilode does not endorse them.

2. We are not liable for your post
By ticking the boxes at Join and at publish, you agree Kilode is not liable for what you submit, including defamation, copyright claims, and ad claims.

3. Staff review
Some queues (ads, cinema, jobs, listings) wait for staff. Review is not a legal clearance.

4. Removal
We may remove content that appears to break the Rules, a court order, or a valid copyright notice. We are not required to notify you first.

5. Copyright
If you believe your work is on Kilode without permission, use Contact with the URL, your handle or real name, and a statement that you are the owner. We will look at it. This is not a DMCA agent registration.

6. Music and cinema
Playback happens on YouTube, Spotify, SoundCloud, Audiomack and similar. Their terms apply. Kilode does not stream the file from our servers.

7. Teams
Teams are small named groups with a member list and a private-feeling chat room on Kilode (it is still on our servers). You may create up to 3 teams. Anyone signed in may join a team unless we close that later. Do not use Teams to run scams.`;

export const ADS_LONG = `Ads, crypto, and money

1. Manual crypto only
You copy the wallet address shown in this app, send the listed coin, and paste the transaction hash. Kilode checks the hash on the public chain against the listed wallet. Review still happens before an ad goes live. There is no card checkout.

2. Verify the address
After Copy, check the first 6 and last 6 characters against the screen. Kilode never DMs a wallet. Wrong network or a fake address = funds lost. We cannot reverse a chain transfer.

3. Prices
Advert grid, chat stream, and pinned chat prices are shown in the Advertise screen and may change. Payment does not buy a ranking guarantee.

4. Refunds
If staff reject an ad before it goes live, you may Contact us. Chain fees are never refundable. Approved ads that already ran are not refunded.

5. Taxes
You are responsible for your own tax.`;

export const PRIVACY_LONG = `Privacy

Last updated ${LEGAL_UPDATED}

1. What we collect
Username, password (stored hashed), account type, avatar seed, optional bio/city, posts and chat you type, ad forms, and basic device logs (IP, browser) needed to run the site and stop abuse. We do not ask for a public email.

2. What we do not collect
We do not sell your handle list. We do not run a public follower graph.

3. Why
To operate the community, approve ads, moderate, and keep you signed in.

4. Cookies
A session cookie keeps you signed in. The light/night skin is stored on your device (localStorage).

5. Chat lifetime
The operator sets how long chat lines live (hours to days, or keep). After that they are purged from the live room.

6. Third parties
YouTube, Spotify, SoundCloud and similar see you when you play an embed. Their privacy policies apply. Dicebear (avatar drawings) may see the seed you picked.

7. Access
There is no public email reset. Contact staff while signed in to ask about your data.

8. Children
Kilode is not directed at children under 15.`;

export const COOKIES_LONG = `Cookies and local storage

- Session cookie: sign-in.
- localStorage: night/light skin, some draft UI.
- No third-party ad pixel from Kilode itself. Embedded players may set their own cookies.`;

export const CONTACT_LONG = `Contact

Use Contact in the signed-in menu, or Telegram @Builtbystacks for the developer credit — that is not a support desk for user disputes.

Operator: Kilode
Site: kilode.ng
Developer credit: @Builtbystacks`;
