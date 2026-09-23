import type { Campaign, ChatMsg, Join, MusicTrack, Note, Post } from "@/lib/qonvo-data";
import { parseMusicUrl } from "@/lib/qonvo-data";

/** Last-resort cover when no CDN art — avoid for DEMO_TRACKS. */
function poster(_bg: string, label: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(label.replace(/\s+/g, "-").toLowerCase())}/400/400`;
}

export const DEMO_POSTS: Post[] = [
  {
    id: "demo-week-1",
    title: "King’s College: Glory, decay and battle over the future",
    body: "Observers say the dispute has expanded into a broader debate regarding the future of public education in Nigeria.\n\nvia Premium Times",
    excerpt: "King’s College: Glory, decay and battle over the future",
    author: "Amaka#2201",
    ts: Date.now() - 3600000,
    comments: (() => {
      const ts = Date.now() - 1890000;
      return [
        { author: "Tunde#104", body: "This one dey trend for a reason.", ts },
        { author: "Kemi#0092", body: "Naija never sleeps — details matter.", ts: ts + 25000, parentTs: ts }
      ];
    })(),
    category: "Naija",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/headlines/910360-kings-college-glory-decay-and-battle-over-the-future.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2018/11/kings-college-300x179.jpeg",
    slug: "week-1-naija",
    status: "publish",
    views: 400,
  },
  {
    id: "demo-week-2",
    title: "When rain becomes a governance test, By AbdulAzeez Aliyu Elayo",
    body: "Rain will continue to fall. Whether it reaches our farms as nourishment, our reservoirs as water security or our homes as a destructive flood will depend partly on the climate, but also significantly on the decisions…\n\nvia Premium Times",
    excerpt: "When rain becomes a governance test, By AbdulAzeez Aliyu…",
    author: "Kemi#0092",
    ts: Date.now() - 7200000,
    comments: (() => {
      const ts = Date.now() - 1980000;
      return [
        { author: "Kemi#0092", body: "Naija never sleeps — details matter.", ts },
        { author: "Amaka#2201", body: "Seen. Sharing for the timeline.", ts: ts + 25000, parentTs: ts }
      ];
    })(),
    category: "News",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/top-news/910339-when-rain-becomes-a-governance-test-by-abdulazeez-aliyu-elayo.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2026/09/admin-ajax-1.jpg",
    slug: "week-2-news",
    status: "publish",
    views: 497,
  },
  {
    id: "demo-week-3",
    title: "2027: Wike says Otti backing Tinubu; Abia govt says ‘confirmation will come…",
    body: "Abia State Government’s carefully worded response neither endorsed nor rejected Mr Wike’s claim, leaving open the question of whether Mr Otti’s increasingly close engagement with the presidency will translate into an…\n\nvia Premium Times",
    excerpt: "2027: Wike says Otti backing Tinubu; Abia govt says…",
    author: "Chidi#4410",
    ts: Date.now() - 10800000,
    comments: (() => {
      const ts = Date.now() - 2070000;
      return [
        { author: "Amaka#2201", body: "Seen. Sharing for the timeline.", ts },
        { author: "Chidi#4410", body: "Context still incomplete but worth following.", ts: ts + 25000, parentTs: ts },
        { author: "Zara#77", body: "Government need to move faster on this.", ts: ts + 50000 }
      ];
    })(),
    category: "Politics",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/top-news/910351-2027-wike-says-otti-backing-tinubu-abia-govt-says-confirmation-will-come-at-appropriate-time.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2026/09/WhatsApp-Image-2026-09-17-at-14.00.10.jpeg",
    slug: "week-3-politics",
    status: "publish",
    views: 594,
  },
  {
    id: "demo-week-4",
    title: "Oil spill hits Akwa Ibom oil community as NOSDRA probes source",
    body: "Residents of Ntafre, a remote Akwa Ibom oil community, say a crude oil spill has contaminated their creek, disrupted fishing and left them without safe water as NOSDRA moves to determine the source.\n\nvia Premium Times",
    excerpt: "Oil spill hits Akwa Ibom oil community as NOSDRA probes…",
    author: "Baba#12",
    ts: Date.now() - 14400000,
    comments: (() => {
      const ts = Date.now() - 2160000;
      return [
        { author: "Chidi#4410", body: "Context still incomplete but worth following.", ts },
        { author: "Zara#77", body: "Government need to move faster on this.", ts: ts + 25000, parentTs: ts },
        { author: "Baba#12", body: "Sports side of this story go hit hard.", ts: ts + 50000 },
        { author: "Ife#830", body: "Business angle nobody dey talk yet.", ts: ts + 75000 }
      ];
    })(),
    category: "Business",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/top-news/910320-oil-spill-hits-akwa-ibom-oil-community-as-nosdra-probes-source.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2026/09/Photo-of-oil-spill-at-Ntafre-creek-as-shared-by-community-members.jpg",
    slug: "week-4-business",
    status: "publish",
    views: 691,
  },
  {
    id: "demo-week-5",
    title: "Rivers students cross dangerous floodwater on makeshift planks to reach…",
    body: "Students of Community Secondary School, Rumuapara, in Rivers State, attend classes in a flood-ravaged environment, using makeshift plank bridges to move between school buildings. The local government chairman says…\n\nvia Premium Times",
    excerpt: "Rivers students cross dangerous floodwater on makeshift…",
    author: "Ife#830",
    ts: Date.now() - 18000000,
    comments: (() => {
      const ts = Date.now() - 2250000;
      return [
        { author: "Zara#77", body: "Government need to move faster on this.", ts },
        { author: "Baba#12", body: "Sports side of this story go hit hard.", ts: ts + 25000, parentTs: ts }
      ];
    })(),
    category: "Naija",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/top-news/910338-video-rivers-students-cross-dangerous-floodwater-on-makeshift-planks-to-reach-classroom.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2026/09/WhatsApp-Image-2026-09-17-at-13.08.32.jpeg",
    slug: "week-5-naija",
    status: "publish",
    views: 788,
  },
  {
    id: "demo-week-6",
    title: "Police arrest 60 over assault of officer",
    body: "According to the police, a member of the public alerted officers at about 3:30 p.m. on 15 September that a police officer was being attacked around Goldie by Etim Edem Lane.\n\nvia Premium Times",
    excerpt: "Police arrest 60 over assault of officer",
    author: "Tunde#104",
    ts: Date.now() - 21600000,
    comments: (() => {
      const ts = Date.now() - 2340000;
      return [
        { author: "Baba#12", body: "Sports side of this story go hit hard.", ts },
        { author: "Ife#830", body: "Business angle nobody dey talk yet.", ts: ts + 25000, parentTs: ts }
      ];
    })(),
    category: "Naija",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/more-news/910332-police-arrest-60-over-assault-of-officer.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2026/09/The-assaulted-police-officer-e1789645242446.jpg",
    slug: "week-6-naija",
    status: "publish",
    views: 885,
  },
  {
    id: "demo-week-7",
    title: "Nigeria vs England: Five players who could decide crucial FIFA U-20 Women’s…",
    body: "The Falconets and Young Lionesses arrive at the knockout stage with different strengths but a similar objective: surviving one more round at the World Cup\n\nvia Premium Times",
    excerpt: "Nigeria vs England: Five players who could decide crucial…",
    author: "Zara#77",
    ts: Date.now() - 25200000,
    comments: (() => {
      const ts = Date.now() - 2430000;
      return [
        { author: "Ife#830", body: "Business angle nobody dey talk yet.", ts },
        { author: "Sade#900", body: "People on ground need help, not PR.", ts: ts + 25000, parentTs: ts },
        { author: "Femi#331", body: "Bookmarking — go read the full piece.", ts: ts + 50000 }
      ];
    })(),
    category: "Sports",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/top-news/910331-nigeria-vs-england-five-players-who-could-decide-crucial-fifa-u-20-womens-world-cup-round-of-16-clash.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2026/09/image-15-e1789645594584.png",
    slug: "week-7-sports",
    status: "publish",
    views: 982,
  },
  {
    id: "demo-week-8",
    title: "Instant payments outpace Central Africa’s anti-money laundering controls",
    body: "The region has joined an African cross-border payment system built for speed and trade – but it could accelerate financial crime.\n\nvia Premium Times",
    excerpt: "Instant payments outpace Central Africa’s anti-money…",
    author: "Sade#900",
    ts: Date.now() - 28800000,
    comments: (() => {
      const ts = Date.now() - 2520000;
      return [
        { author: "Sade#900", body: "People on ground need help, not PR.", ts },
        { author: "Femi#331", body: "Bookmarking — go read the full piece.", ts: ts + 25000, parentTs: ts },
        { author: "Ngozi#55", body: "Via the source link below. No fake quotes.", ts: ts + 50000 },
        { author: "Tunde#104", body: "This one dey trend for a reason.", ts: ts + 75000 }
      ];
    })(),
    category: "Business",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/headlines/910321-analysis-instant-payments-outpace-central-africas-anti-money-laundering-controls.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2026/09/7fa0ea4366f53403a5c7585991af7efd.jpg",
    slug: "week-8-business",
    status: "publish",
    views: 1079,
  },
  {
    id: "demo-week-9",
    title: "NIDCOM says Nigerian detained in India refused opportunity to return",
    body: "The Nigerian, however, disputed NIDCOM's narrative.\n\nvia Premium Times",
    excerpt: "NIDCOM says Nigerian detained in India refused opportunity…",
    author: "Femi#331",
    ts: Date.now() - 32400000,
    comments: (() => {
      const ts = Date.now() - 2610000;
      return [
        { author: "Femi#331", body: "Bookmarking — go read the full piece.", ts }
      ];
    })(),
    category: "Naija",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/top-news/910323-nidcom-says-nigerian-detained-in-india-refused-opportunity-to-return.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2025/01/pixelcut-export-49-e1736972646334.png",
    slug: "week-9-naija",
    status: "publish",
    views: 1176,
  },
  {
    id: "demo-week-10",
    title: "Police arrest suspected kidnappers, political thug in Niger",
    body: "The police state command disclosed this in a crime bulletin issued on Wednesday by spokesperson Wasiu Abiodun.\n\nvia Premium Times",
    excerpt: "Police arrest suspected kidnappers, political thug in Niger",
    author: "Ngozi#55",
    ts: Date.now() - 36000000,
    comments: [],
    category: "Naija",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/more-news/910319-police-arrest-suspected-kidnappers-political-thug-in-niger.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2024/07/Police-Force-1.jpg",
    slug: "week-10-naija",
    status: "publish",
    views: 1273,
  },
  {
    id: "demo-week-11",
    title: "Six party supporters killed in road crash",
    body: "While the campaign organisation said six people were killed in the accident, the police reported four deaths.\n\nvia Premium Times",
    excerpt: "Six party supporters killed in road crash",
    author: "Yemi#180",
    ts: Date.now() - 39600000,
    comments: (() => {
      const ts = Date.now() - 2790000;
      return [
        { author: "Tunde#104", body: "This one dey trend for a reason.", ts },
        { author: "Kemi#0092", body: "Naija never sleeps — details matter.", ts: ts + 25000, parentTs: ts },
        { author: "Amaka#2201", body: "Seen. Sharing for the timeline.", ts: ts + 50000 }
      ];
    })(),
    category: "Politics",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/top-news/910301-six-party-supporters-killed-in-road-crash.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2018/03/Social-Democratic-Party-e1751715934510.png",
    slug: "week-11-politics",
    status: "publish",
    views: 1370,
  },
  {
    id: "demo-week-12",
    title: "2027: Shettima calls for politics without bitterness",
    body: "Mr Shettima gave the advice on Wednesday in Ilorin at the turbaning of Kwara State Governor AbdulRahman AbdulRazaq as the Sardauna of the Ilorin Emirate.\n\nvia Premium Times",
    excerpt: "2027: Shettima calls for politics without bitterness",
    author: "Ada#404",
    ts: Date.now() - 43200000,
    comments: (() => {
      const ts = Date.now() - 2880000;
      return [
        { author: "Kemi#0092", body: "Naija never sleeps — details matter.", ts },
        { author: "Amaka#2201", body: "Seen. Sharing for the timeline.", ts: ts + 25000, parentTs: ts },
        { author: "Chidi#4410", body: "Context still incomplete but worth following.", ts: ts + 50000 },
        { author: "Zara#77", body: "Government need to move faster on this.", ts: ts + 75000 }
      ];
    })(),
    category: "Politics",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/top-news/910303-2027-shettima-calls-for-politics-without-bitterness.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2026/09/886683.jpg",
    slug: "week-12-politics",
    status: "publish",
    views: 1467,
  },
  {
    id: "demo-week-13",
    title: "APC lawmaker defends Wike as tension grows with party’s governors",
    body: "Kano lawmaker Abdulmumin Jibrin says Mr Wike had made sacrifices for the ruling party through his support for President Bola Tinubu.\n\nvia Premium Times",
    excerpt: "APC lawmaker defends Wike as tension grows with party’s…",
    author: "Ola#212",
    ts: Date.now() - 46800000,
    comments: (() => {
      const ts = Date.now() - 2970000;
      return [
        { author: "Amaka#2201", body: "Seen. Sharing for the timeline.", ts }
      ];
    })(),
    category: "Politics",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/more-news/910302-apc-lawmaker-defends-wike-as-tension-grows-with-partys-governors.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2026/09/Abdulmumin-Jibrin-.jpg",
    slug: "week-13-politics",
    status: "publish",
    views: 1564,
  },
  {
    id: "demo-week-14",
    title: "Supreme Court reserves judgment in INEC appeal over ZLP challenge to…",
    body: "The Supreme Court said the \"date for judgement would be communicated to the parties.\"\n\nvia Premium Times",
    excerpt: "Supreme Court reserves judgment in INEC appeal over ZLP…",
    author: "Bisi#88",
    ts: Date.now() - 50400000,
    comments: (() => {
      const ts = Date.now() - 3060000;
      return [
        { author: "Chidi#4410", body: "Context still incomplete but worth following.", ts },
        { author: "Zara#77", body: "Government need to move faster on this.", ts: ts + 25000, parentTs: ts }
      ];
    })(),
    category: "Politics",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/top-news/910298-supreme-court-reserves-judgment-in-inec-appeal-over-zlp-challenge-to-electoral-act.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2021/12/Supreme_Court-e1675957930419.jpg",
    slug: "week-14-politics",
    status: "publish",
    views: 1661,
  },
  {
    id: "demo-week-15",
    title: "Army rescues 22 kidnap victims in Niger",
    body: "Troops of the Nigerian Army rescued 22 kidnapped victims in Muchiya village, Rafi Local Government Area of Niger State, following a fighting patrol based on credible intelligence.\n\nvia Premium Times",
    excerpt: "Army rescues 22 kidnap victims in Niger",
    author: "Emeka#601",
    ts: Date.now() - 54000000,
    comments: [],
    category: "Naija",
    tags: "news, premium-times",
    link: "https://www.premiumtimesng.com/news/top-news/910296-army-rescues-22-kidnap-victims-in-niger.html",
    image: "https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2026/09/592125-e1789636023557.jpg",
    slug: "week-15-naija",
    status: "publish",
    views: 1758,
  },
  {
    id: "demo-week-16",
    title: "Tinubu orders NIN enrolment to hit 95% by December",
    body: "Kilode Feeds roundup — read the full report from the source.\n\nvia Punch",
    excerpt: "Tinubu orders NIN enrolment to hit 95% by December",
    author: "Hassan#19",
    ts: Date.now() - 57600000,
    comments: (() => {
      const ts = Date.now() - 3240000;
      return [
        { author: "Baba#12", body: "Sports side of this story go hit hard.", ts },
        { author: "Ife#830", body: "Business angle nobody dey talk yet.", ts: ts + 25000, parentTs: ts },
        { author: "Sade#900", body: "People on ground need help, not PR.", ts: ts + 50000 },
        { author: "Femi#331", body: "Bookmarking — go read the full piece.", ts: ts + 75000 }
      ];
    })(),
    category: "Politics",
    tags: "news, punch",
    link: "https://punchng.com/tinubu-orders-nin-enrolment-to-hit-95-by-december/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/14234205/Tinubu_1789425725.webp",
    slug: "week-16-politics",
    status: "publish",
    views: 1855,
  },
  {
    id: "demo-week-17",
    title: "King’s College: FG pauses concession, orders police withdrawal",
    body: "Kilode Feeds roundup — read the full report from the source.\n\nvia Punch",
    excerpt: "King’s College: FG pauses concession, orders police…",
    author: "Amaka#2201",
    ts: Date.now() - 61200000,
    comments: (() => {
      const ts = Date.now() - 3330000;
      return [
        { author: "Ife#830", body: "Business angle nobody dey talk yet.", ts }
      ];
    })(),
    category: "Naija",
    tags: "news, punch",
    link: "https://punchng.com/kings-college-fg-pauses-concession-orders-police-withdrawal/",
    image: "https://punchng.com/wp-content/uploads/2026/06/Tunji-Alausa-1062x598-1.webp",
    slug: "week-17-naija",
    status: "publish",
    views: 1952,
  },
  {
    id: "demo-week-18",
    title: "Robotic surgery cuts pain, shortens hospital stay — Surgeons",
    body: "Surgeons at Redeemer’s Health Village, Ogun State, say robotic surgery reduces patient pain and shortens hospital stays after a successful first procedure.\n\nvia Punch",
    excerpt: "Robotic surgery cuts pain, shortens hospital stay — Surgeons",
    author: "Kemi#0092",
    ts: Date.now() - 64800000,
    comments: (() => {
      const ts = Date.now() - 3420000;
      return [
        { author: "Sade#900", body: "People on ground need help, not PR.", ts },
        { author: "Femi#331", body: "Bookmarking — go read the full piece.", ts: ts + 25000, parentTs: ts }
      ];
    })(),
    category: "News",
    tags: "news, punch",
    link: "https://punchng.com/robotic-surgery-cuts-pain-shortens-hospital-stay-surgeons/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/17144037/WhatsApp-Image-2026-09-17-at-13.10.50_1789652437-1080x630.webp",
    slug: "week-18-news",
    status: "publish",
    views: 2049,
  },
  {
    id: "demo-week-19",
    title: "Benue CP warns politicians against recruiting thugs, cultists",
    body: "The Benue State Commissioner of Police, Cletus Nwadiogbu, has warned political parties and candidates against recruiting thugs and cult members for campaig\n\nvia Punch",
    excerpt: "Benue CP warns politicians against recruiting thugs,…",
    author: "Chidi#4410",
    ts: Date.now() - 68400000,
    comments: (() => {
      const ts = Date.now() - 3510000;
      return [
        { author: "Femi#331", body: "Bookmarking — go read the full piece.", ts },
        { author: "Ngozi#55", body: "Via the source link below. No fake quotes.", ts: ts + 25000, parentTs: ts },
        { author: "Tunde#104", body: "This one dey trend for a reason.", ts: ts + 50000 }
      ];
    })(),
    category: "Naija",
    tags: "news, punch",
    link: "https://punchng.com/benue-cp-warns-politicians-against-recruiting-thugs-cultists/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/17142923/IMG_6879_1789651763.webp",
    slug: "week-19-naija",
    status: "publish",
    views: 2146,
  },
  {
    id: "demo-week-20",
    title: "NiDCOM defends claim about Nigerian detained in India for visa overstay",
    body: "The Nigerians in Diaspora Commission has defended its claims about Ekene Vitus Chukwuma, a Nigerian detained in India for visa overstay with an expired pas\n\nvia Punch",
    excerpt: "NiDCOM defends claim about Nigerian detained in India for…",
    author: "Baba#12",
    ts: Date.now() - 72000000,
    comments: [],
    category: "Naija",
    tags: "news, punch",
    link: "https://punchng.com/nidcom-defends-claim-about-nigerian-detained-in-india-for-visa-overstay/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/17143009/images-21_1789651809.webp",
    slug: "week-20-naija",
    status: "publish",
    views: 2243,
  },
  {
    id: "demo-week-21",
    title: "PSG’s Qatari owners buy Belgian club Eupen",
    body: "Qatar Sports Investments (QSI), the owners of Paris Saint-Germain, have confirmed the full acquisition of Belgian second-division club KAS Eupen.\n\nvia Punch",
    excerpt: "PSG’s Qatari owners buy Belgian club Eupen",
    author: "Ife#830",
    ts: Date.now() - 75600000,
    comments: (() => {
      const ts = Date.now() - 3690000;
      return [
        { author: "Tunde#104", body: "This one dey trend for a reason.", ts }
      ];
    })(),
    category: "Sports",
    tags: "news, punch",
    link: "https://punchng.com/psgs-qatari-owners-buy-belgian-club-eupen/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/17135632/AFP__20260911__DPPI_40027011_066__v1__Mockup__FootballFrenchChampParisSgVMonaco_1789649792-1024x630.webp",
    slug: "week-21-sports",
    status: "publish",
    views: 2340,
  },
  {
    id: "demo-week-22",
    title: "I want Ballon d’Or back at Madrid – Mbappé",
    body: "Real Madrid forward Kylian Mbappé says he wants the Ballon d’Or to return to the club, stating his performances on the pitch are his best advocates.\n\nvia Punch",
    excerpt: "I want Ballon d’Or back at Madrid – Mbappé",
    author: "Tunde#104",
    ts: Date.now() - 79200000,
    comments: (() => {
      const ts = Date.now() - 3780000;
      return [
        { author: "Kemi#0092", body: "Naija never sleeps — details matter.", ts },
        { author: "Amaka#2201", body: "Seen. Sharing for the timeline.", ts: ts + 25000, parentTs: ts }
      ];
    })(),
    category: "Sports",
    tags: "news, punch",
    link: "https://punchng.com/i-want-ballon-dor-back-at-madrid-mbappe/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/07154216/Mbappe_1788792136.webp",
    slug: "week-22-sports",
    status: "publish",
    views: 2437,
  },
  {
    id: "demo-week-23",
    title: "Atiku’s aide faults power minister over ‘freezers freezing’ comment",
    body: "Atiku Abubakar’s aide, Paul Ibe, has criticised the Minister of Power, Joseph Tegbe, over his comment that some Nigerians’ freezers were freezing too much.\n\nvia Punch",
    excerpt: "Atiku’s aide faults power minister over ‘freezers…",
    author: "Zara#77",
    ts: Date.now() - 82800000,
    comments: (() => {
      const ts = Date.now() - 3870000;
      return [
        { author: "Amaka#2201", body: "Seen. Sharing for the timeline.", ts },
        { author: "Chidi#4410", body: "Context still incomplete but worth following.", ts: ts + 25000, parentTs: ts },
        { author: "Zara#77", body: "Government need to move faster on this.", ts: ts + 50000 }
      ];
    })(),
    category: "Politics",
    tags: "news, punch",
    link: "https://punchng.com/atikus-aide-faults-power-minister-over-freezers-freezing-comment/",
    image: "https://punchng.com/wp-content/uploads/2026/07/Screenshot-2026-07-08-070252_1783490561.webp",
    slug: "week-23-politics",
    status: "publish",
    views: 2534,
  },
  {
    id: "demo-week-24",
    title: "Madrid join race to sign Man United teenager JJ Gabriel – Report",
    body: "Real Madrid have reportedly joined the race to sign Manchester United’s 15-year-old academy player, JJ Gabriel, who has asked to leave the club.\n\nvia Punch",
    excerpt: "Madrid join race to sign Man United teenager JJ Gabriel –…",
    author: "Sade#900",
    ts: Date.now() - 86400000,
    comments: (() => {
      const ts = Date.now() - 3960000;
      return [
        { author: "Chidi#4410", body: "Context still incomplete but worth following.", ts },
        { author: "Zara#77", body: "Government need to move faster on this.", ts: ts + 25000, parentTs: ts },
        { author: "Baba#12", body: "Sports side of this story go hit hard.", ts: ts + 50000 },
        { author: "Ife#830", body: "Business angle nobody dey talk yet.", ts: ts + 75000 }
      ];
    })(),
    category: "Sports",
    tags: "news, punch",
    link: "https://punchng.com/madrid-join-race-to-sign-man-united-teenager-jj-gabriel-report/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/09152709/f92fe580-ac21-11f1-aed2-8d6da8d75094.jpg_1788964029.webp",
    slug: "week-24-sports",
    status: "publish",
    views: 2631,
  },
  {
    id: "demo-week-25",
    title: "Jide Kosoko, Eniola Badmus, Toyin Abraham, other celebrities named in APC…",
    body: "Nollywood and Fuji music stars including Jide Kosoko, Eniola Badmus, and Toyin Abraham have been named to the APC Lagos State Campaign Council.\n\nvia Punch",
    excerpt: "Jide Kosoko, Eniola Badmus, Toyin Abraham, other…",
    author: "Femi#331",
    ts: Date.now() - 90000000,
    comments: [],
    category: "Politics",
    tags: "news, punch",
    link: "https://punchng.com/full-list-jide-kosoko-eniola-badmus-toyin-abraham-other-celebrities-named-to-apc-lagos-campaign-council/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/17132939/MixCollage-17-Sep-2026-01-28-PM-9652_1789648179-1200x630.webp",
    slug: "week-25-politics",
    status: "publish",
    views: 2728,
  },
  {
    id: "demo-week-26",
    title: "How Yamal’s teenage stats compare with Mbappe’s – Report",
    body: "A report compares the teenage stats of Barcelona’s Lamine Yamal and Real Madrid’s Kylian Mbappe, showing Mbappe as the more prolific goalscorer.\n\nvia Punch",
    excerpt: "How Yamal’s teenage stats compare with Mbappe’s – Report",
    author: "Ngozi#55",
    ts: Date.now() - 93600000,
    comments: (() => {
      const ts = Date.now() - 4140000;
      return [
        { author: "Baba#12", body: "Sports side of this story go hit hard.", ts },
        { author: "Ife#830", body: "Business angle nobody dey talk yet.", ts: ts + 25000, parentTs: ts }
      ];
    })(),
    category: "Sports",
    tags: "news, punch",
    link: "https://punchng.com/how-yamals-teenage-stats-compare-with-mbappes-report/",
    image: "https://cdn.punchng.com/wp-content/uploads/2025/11/03164415/Untitled.jpg",
    slug: "week-26-sports",
    status: "publish",
    views: 425,
  },
  {
    id: "demo-week-27",
    title: "I’ve learnt Yoruba, can now campaign in language — Rhodes-Vivour",
    body: "Lagos governorship aspirant, Gbadebo Rhodes-Vivour, says he has learnt Yoruba and can now campaign in the language ahead of the 2027 election.\n\nvia Punch",
    excerpt: "I’ve learnt Yoruba, can now campaign in language —…",
    author: "Yemi#180",
    ts: Date.now() - 97200000,
    comments: (() => {
      const ts = Date.now() - 4230000;
      return [
        { author: "Ife#830", body: "Business angle nobody dey talk yet.", ts },
        { author: "Sade#900", body: "People on ground need help, not PR.", ts: ts + 25000, parentTs: ts },
        { author: "Femi#331", body: "Bookmarking — go read the full piece.", ts: ts + 50000 }
      ];
    })(),
    category: "Politics",
    tags: "news, punch",
    link: "https://punchng.com/ive-learnt-yoruba-can-now-campaign-in-language-rhodes-vivour/",
    image: "https://punchng.com/wp-content/uploads/2026/06/Rhodes-Vivour-1-1200x630.webp",
    slug: "week-27-politics",
    status: "publish",
    views: 522,
  },
  {
    id: "demo-week-28",
    title: "W’Bank mobilises $112bn private capital for developing economies",
    body: "The World Bank attracted a record $112bn in private capital for developing economies in its 2026 fiscal year, more than tripling the amount from 2022.\n\nvia Punch",
    excerpt: "W’Bank mobilises $112bn private capital for developing…",
    author: "Ada#404",
    ts: Date.now() - 100800000,
    comments: (() => {
      const ts = Date.now() - 4320000;
      return [
        { author: "Sade#900", body: "People on ground need help, not PR.", ts },
        { author: "Femi#331", body: "Bookmarking — go read the full piece.", ts: ts + 25000, parentTs: ts },
        { author: "Ngozi#55", body: "Via the source link below. No fake quotes.", ts: ts + 50000 },
        { author: "Tunde#104", body: "This one dey trend for a reason.", ts: ts + 75000 }
      ];
    })(),
    category: "Business",
    tags: "news, punch",
    link: "https://punchng.com/wbank-mobilises-112bn-private-capital-for-developing-economies/",
    image: "https://punchng.com/wp-content/uploads/2026/07/world-bank_1782889613.webp",
    slug: "week-28-business",
    status: "publish",
    views: 619,
  },
  {
    id: "demo-week-29",
    title: "US player sues hospital after on-field cardiac arrest",
    body: "US women’s national team player Savannah DeMelo has sued a hospital and two doctors over an on-field cardiac arrest she suffered during a match.\n\nvia Punch",
    excerpt: "US player sues hospital after on-field cardiac arrest",
    author: "Ola#212",
    ts: Date.now() - 104400000,
    comments: (() => {
      const ts = Date.now() - 4410000;
      return [
        { author: "Femi#331", body: "Bookmarking — go read the full piece.", ts }
      ];
    })(),
    category: "News",
    tags: "news, punch",
    link: "https://punchng.com/us-player-sues-hospital-after-on-field-cardiac-arrest/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/17123837/IMG_0102_1789645117.webp",
    slug: "week-29-news",
    status: "publish",
    views: 716,
  },
  {
    id: "demo-week-30",
    title: "Police arrest six suspected armed robbers, recover guns in Akwa Ibom",
    body: "Akwa Ibom police have arrested six suspected armed robbers, including a native doctor, terrorising Ikono, Ini, and Obot Akara LGAs, recovering guns.\n\nvia Punch",
    excerpt: "Police arrest six suspected armed robbers, recover guns in…",
    author: "Bisi#88",
    ts: Date.now() - 108000000,
    comments: [],
    category: "Naija",
    tags: "news, punch",
    link: "https://punchng.com/police-arrest-six-suspected-armed-robbers-recover-guns-in-akwa-ibom/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/08153659/1003393637_1788878219-1200x630.webp",
    slug: "week-30-naija",
    status: "publish",
    views: 813,
  },
  {
    id: "demo-week-31",
    title: "Sanwo-Olu, Fashola, Ambode named in Lagos APC campaign council",
    body: "The Lagos APC has released its campaign council list for the 2027 elections, naming Governor Sanwo-Olu, and ex-governors Fashola and Ambode in key roles.\n\nvia Punch",
    excerpt: "Sanwo-Olu, Fashola, Ambode named in Lagos APC campaign…",
    author: "Emeka#601",
    ts: Date.now() - 111600000,
    comments: (() => {
      const ts = Date.now() - 4590000;
      return [
        { author: "Tunde#104", body: "This one dey trend for a reason.", ts },
        { author: "Kemi#0092", body: "Naija never sleeps — details matter.", ts: ts + 25000, parentTs: ts },
        { author: "Amaka#2201", body: "Seen. Sharing for the timeline.", ts: ts + 50000 }
      ];
    })(),
    category: "Politics",
    tags: "news, punch",
    link: "https://punchng.com/full-list-sanwo-olu-fashola-ambode-named-in-lagos-apc-campaign-council/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/17120516/Akinwunmi-Ambode-and-Babajide-Sanwo-Olu-1280x914_1789643116-1200x630.webp",
    slug: "week-31-politics",
    status: "publish",
    views: 910,
  },
  {
    id: "demo-week-32",
    title: "What every business should know about CAC annual returns",
    body: "Learn why filing CAC annual returns is a separate obligation from paying taxes for your business and how to avoid penalties for non-compliance in Nigeria.\n\nvia Punch",
    excerpt: "What every business should know about CAC annual returns",
    author: "Hassan#19",
    ts: Date.now() - 115200000,
    comments: (() => {
      const ts = Date.now() - 4680000;
      return [
        { author: "Kemi#0092", body: "Naija never sleeps — details matter.", ts },
        { author: "Amaka#2201", body: "Seen. Sharing for the timeline.", ts: ts + 25000, parentTs: ts },
        { author: "Chidi#4410", body: "Context still incomplete but worth following.", ts: ts + 50000 },
        { author: "Zara#77", body: "Government need to move faster on this.", ts: ts + 75000 }
      ];
    })(),
    category: "Business",
    tags: "news, punch",
    link: "https://punchng.com/explainer-what-every-business-should-know-about-cac-annual-returns/",
    image: "https://punchng.com/wp-content/uploads/2026/06/CAC-577x313-1.webp",
    slug: "week-32-business",
    status: "publish",
    views: 1007,
  },
  {
    id: "demo-week-33",
    title: "SMEDAN, EFCC deepen collaboration on youth empowerment, cybersecurity",
    body: "SMEDAN and the EFCC have agreed to deepen their collaboration on youth empowerment, cybersecurity, and responsible entrepreneurship in Nigeria.\n\nvia Punch",
    excerpt: "SMEDAN, EFCC deepen collaboration on youth empowerment,…",
    author: "Amaka#2201",
    ts: Date.now() - 118800000,
    comments: (() => {
      const ts = Date.now() - 4770000;
      return [
        { author: "Amaka#2201", body: "Seen. Sharing for the timeline.", ts }
      ];
    })(),
    category: "Business",
    tags: "news, punch",
    link: "https://punchng.com/smedan-efcc-deepen-collaboration-on-youth-empowerment-cybersecurity/",
    image: "https://punchng.com/wp-content/uploads/2026/06/SMEDAN_1782322846.webp",
    slug: "week-33-business",
    status: "publish",
    views: 1104,
  },
  {
    id: "demo-week-34",
    title: "UNIPORT ASUU declares indefinite strike over incomplete salaries, allowances",
    body: "The Academic Staff Union of Universities, UNIPORT branch, has declared an indefinite strike over the incomplete payment of salaries and allowances to membe\n\nvia Punch",
    excerpt: "UNIPORT ASUU declares indefinite strike over incomplete…",
    author: "Kemi#0092",
    ts: Date.now() - 122400000,
    comments: (() => {
      const ts = Date.now() - 4860000;
      return [
        { author: "Chidi#4410", body: "Context still incomplete but worth following.", ts },
        { author: "Zara#77", body: "Government need to move faster on this.", ts: ts + 25000, parentTs: ts }
      ];
    })(),
    category: "Naija",
    tags: "news, punch",
    link: "https://punchng.com/uniport-asuu-declares-indefinite-strike-over-incomplete-salaries-allowances/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/06/01165550/UNIPORT-gate.webp",
    slug: "week-34-naija",
    status: "publish",
    views: 1201,
  },
  {
    id: "demo-week-35",
    title: "Meet Chelsea’s new owners, Clearlake Capital",
    body: "American investment firm Clearlake Capital has taken full control of Chelsea FC after acquiring the stakes of Todd Boehly and Mark Walter.\n\nvia Punch",
    excerpt: "Meet Chelsea’s new owners, Clearlake Capital",
    author: "Chidi#4410",
    ts: Date.now() - 126000000,
    comments: [],
    category: "Sports",
    tags: "news, punch",
    link: "https://punchng.com/meet-chelseas-new-owners-clearlake-capital/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/04/01134354/Chelsea.jpg",
    slug: "week-35-sports",
    status: "publish",
    views: 1298,
  },
  {
    id: "demo-week-36",
    title: "Ninth woman found dead in South Africa killing spree",
    body: "South African police have recovered the ninth body of a woman east of Johannesburg in two months, amid a string of murders stoking public anxiety.\n\nvia Punch",
    excerpt: "Ninth woman found dead in South Africa killing spree",
    author: "Baba#12",
    ts: Date.now() - 129600000,
    comments: (() => {
      const ts = Date.now() - 5040000;
      return [
        { author: "Baba#12", body: "Sports side of this story go hit hard.", ts },
        { author: "Ife#830", body: "Business angle nobody dey talk yet.", ts: ts + 25000, parentTs: ts },
        { author: "Sade#900", body: "People on ground need help, not PR.", ts: ts + 50000 },
        { author: "Femi#331", body: "Bookmarking — go read the full piece.", ts: ts + 75000 }
      ];
    })(),
    category: "Business",
    tags: "news, punch",
    link: "https://punchng.com/ninth-woman-found-dead-in-south-africa-killing-spree/",
    image: "https://cdn.punchng.com/wp-content/uploads/2026/09/17111627/AFP__20260917__C8K33W3__v1__MidRes__SafricaCrimeDeath_1789640187-1200x630.webp",
    slug: "week-36-business",
    status: "publish",
    views: 1395,
  }
];

export const DEMO_ADS: Campaign[] = [
  {
    id: "demo-ad-hero",
    name: "Paystack for hustle",
    note: "Collect payments in Naira.",
    ts: Date.now() - 4000_000,
    status: "approved",
    placement: "chat-pin",
    amount: "80 USDT",
    coin: "usdt",
    txHash: "0xdemohero001",
    link: "https://paystack.com",
    image: "https://picsum.photos/seed/paystack-ad/640/160",
    kind: "image-text",
    views: 1280,
    days: 30,
  },
  {
    id: "demo-ad-side",
    name: "Glo data bundle",
    note: "Stay online.",
    ts: Date.now() - 3000_000,
    status: "approved",
    placement: "chat",
    amount: "40 USDC",
    coin: "usdc",
    txHash: "0xdemoside001",
    link: "https://gloworld.com",
    image: "https://picsum.photos/seed/glo-ad/640/160",
    kind: "image",
    views: 940,
    days: 7,
  },
  {
    id: "demo-ad-chat",
    name: "Spotify Naija mix",
    note: "Afrobeats this week.",
    ts: Date.now() - 2000_000,
    status: "approved",
    placement: "board",
    amount: "55 USDC",
    coin: "usdc",
    txHash: "0xdemochat001",
    link: "https://open.spotify.com",
    image: "https://picsum.photos/seed/spotify-ad/640/160",
    kind: "image-text",
    views: 2104,
    days: 7,
  },
  {
    id: "demo-ad-mtn",
    name: "MTN pulse",
    note: "Data that lasts.",
    ts: Date.now() - 1800_000,
    status: "approved",
    placement: "featured",
    coin: "eth",
    link: "https://www.mtn.ng",
    image: "https://picsum.photos/seed/mtn-ad/640/160",
    kind: "image",
    views: 640,
    days: 1,
  },
  {
    id: "demo-ad-jumia",
    name: "Jumia deals",
    note: "Shop today.",
    ts: Date.now() - 1600_000,
    status: "approved",
    placement: "board",
    coin: "btc",
    link: "https://www.jumia.com.ng",
    image: "https://picsum.photos/seed/jumia-ad/640/160",
    kind: "image-text",
    views: 402,
    days: 30,
  },
  {
    id: "demo-ad-bolt",
    name: "Bolt rides",
    note: "Move around town.",
    ts: Date.now() - 1400_000,
    status: "approved",
    placement: "board",
    coin: "sol",
    link: "https://bolt.eu",
    image: "https://picsum.photos/seed/bolt-ad/640/160",
    kind: "text",
    views: 188,
    days: 1,
  },
  {
    id: "demo-ad-yt",
    name: "Nollywood trailer",
    note: "Watch the teaser.",
    ts: Date.now() - 1200_000,
    status: "approved",
    placement: "board",
    coin: "usdc",
    link: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
    video: "kJQP7kiw5Fk",
    kind: "video-text",
    views: 3301,
    days: 30,
  },
  {
    id: "demo-ad-yt2",
    name: "Afrobeats live",
    note: "",
    ts: Date.now() - 1100_000,
    status: "approved",
    placement: "board",
    coin: "sol",
    video: "9bZkp7q19f0",
    kind: "video",
    views: 5120,
    days: 7,
  },
  {
    id: "demo-ad-wait",
    name: "Pending crypto review",
    note: "Waiting on hash check.",
    ts: Date.now() - 600_000,
    status: "paid",
    placement: "board",
    amount: "50 USDT",
    coin: "usdt",
    txHash: "0xpending99",
  },
];

function moreAd(id: string, name: string, note: string, days: 1 | 7 | 14 | 30, extra: Partial<Campaign> = {}): Campaign {
  return {
    ts: Date.now() - 900_000,
    status: "approved",
    placement: "board",
    kind: "image-text",
    views: 180 + id.length * 21,
    image: `https://picsum.photos/seed/${id}/640/360`,
    link: "https://kilode.ng/advertise",
    coin: "usdt",
    ...extra,
    id,
    name,
    note,
    days,
  };
}

/** Removed: shared demo chat polluted every Chat room. Per-room history comes from nf_msgs. */
export const DEMO_CHAT: ChatMsg[] = [];

export type DemoListing = {
  id: string;
  kind: "job" | "market" | "rent";
  title: string;
  body: string;
  city: string;
  contact: string;
  link: string;
  company: string;
  status: "approved";
  submitter: string;
  ts: number;
  views: number;
  days: number;
  image: string;
};

export const DEMO_LISTINGS: DemoListing[] = [
  { id: "dj1", kind: "job", title: "Frontend designer — Lagos", body: "Figma + React. Remote-friendly. Apply with a short note.", city: "Lagos", contact: "", link: "", company: "Kilode Studio", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 86_400_000, views: 312, days: 30, image: "https://picsum.photos/seed/job-lagos-ui/640/400" },
  { id: "dj2", kind: "job", title: "Content writer — Abuja", body: "Naija news and culture. Five posts a week.", city: "Abuja", contact: "", link: "", company: "Kilode Desk", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 72_000_000, views: 188, days: 14, image: "https://picsum.photos/seed/job-abuja-write/640/400" },
  { id: "dj3", kind: "job", title: "Community moderator", body: "Night shift. Chat rooms + reports. Handle only.", city: "Remote", contact: "", link: "", company: "Kilode", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 40_000_000, views: 94, days: 7, image: "https://picsum.photos/seed/job-mod/640/400" },
  { id: "dj4", kind: "job", title: "Motion designer — PH", body: "Shorts for Cinema trailers. After Effects.", city: "Port Harcourt", contact: "", link: "", company: "Reel Naija", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 20_000_000, views: 141, days: 30, image: "https://picsum.photos/seed/job-motion/640/400" },
  { id: "dj5", kind: "job", title: "Sales lead — Kano", body: "Marketplace sellers. Field + WhatsApp. Commission.", city: "Kano", contact: "", link: "", company: "Stack Commerce", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 18_000_000, views: 76, days: 14, image: "https://picsum.photos/seed/job-kano-sales/640/400" },
  { id: "dj6", kind: "job", title: "Nurse — Ibadan clinic", body: "Day shift. Licence required. Apply with note.", city: "Ibadan", contact: "", link: "", company: "Ring Road Care", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 16_000_000, views: 121, days: 30, image: "https://picsum.photos/seed/job-ibadan-nurse/640/400" },
  { id: "dj7", kind: "job", title: "Product manager — Remote", body: "Feeds + Ads tools. Shipping weekly.", city: "Remote", contact: "", link: "", company: "Kilode", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 14_000_000, views: 203, days: 30, image: "https://picsum.photos/seed/job-pm/640/400" },
  { id: "dj8", kind: "job", title: "Electrician — Enugu", body: "Estates and shops. Tools provided.", city: "Enugu", contact: "", link: "", company: "Coal Power", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 12_000_000, views: 55, days: 7, image: "https://picsum.photos/seed/job-enugu-elec/640/400" },
  { id: "dj9", kind: "job", title: "Data analyst — Lagos", body: "SQL + sheets. News desk metrics.", city: "Lagos", contact: "", link: "", company: "Kilode Desk", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 9_000_000, views: 167, days: 14, image: "https://picsum.photos/seed/job-data/640/400" },
  { id: "dm1", kind: "market", title: "Ankara two-piece set", body: "Made in Aba. WhatsApp to order. No checkout in Kilode.", city: "Aba", contact: "WhatsApp on listing", link: "https://instagram.com", company: "Adire Co", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 50_000_000, views: 420, days: 30, image: "https://picsum.photos/seed/mkt-ankara/640/400" },
  { id: "dm2", kind: "market", title: "Shea butter 500ml", body: "Unrefined. Jos. Contact the seller.", city: "Jos", contact: "wa.me", link: "", company: "Plateau Shea", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 30_000_000, views: 210, days: 14, image: "https://picsum.photos/seed/mkt-shea/640/400" },
  { id: "dm3", kind: "market", title: "Beats for artists", body: "Afrobeats pack. URL only — no audio file on Kilode.", city: "Lagos", contact: "DM", link: "https://audiomack.com", company: "Stack Beats", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 12_000_000, views: 156, days: 7, image: "https://picsum.photos/seed/mkt-beats/640/400" },
  { id: "dm4", kind: "market", title: "Leather slippers — Onitsha", body: "Wholesale pairs. Showcase + contact.", city: "Onitsha", contact: "080 listing", link: "", company: "Main Market", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 8_000_000, views: 88, days: 30, image: "https://picsum.photos/seed/mkt-slippers/640/400" },
  { id: "dm5", kind: "market", title: "Palm oil 25L", body: "Delta. Contact to order. No checkout.", city: "Warri", contact: "Seller", link: "", company: "Delta Press", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 7_000_000, views: 132, days: 14, image: "https://picsum.photos/seed/mkt-palm/640/400" },
  { id: "dm6", kind: "market", title: "Phone cases — Computer Village", body: "Bulk iPhone and Tecno. Showcase.", city: "Ikeja", contact: "Shop 12", link: "", company: "CV Cases", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 6_000_000, views: 97, days: 7, image: "https://picsum.photos/seed/mkt-cases/640/400" },
  { id: "dm7", kind: "market", title: "Handmade beads", body: "Benin craft. Instagram on the card.", city: "Benin", contact: "IG", link: "https://instagram.com", company: "Edo Beads", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 5_000_000, views: 64, days: 30, image: "https://picsum.photos/seed/mkt-beads/640/400" },
  { id: "dm8", kind: "market", title: "Suya spice pack", body: "Abuja mix. Contact to restock.", city: "Abuja", contact: "Seller", link: "", company: "Wuse Grill", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 4_000_000, views: 201, days: 14, image: "https://picsum.photos/seed/mkt-suya/640/400" },
  { id: "dm9", kind: "market", title: "Solar lantern", body: "Jos assembled. Showcase + contact.", city: "Jos", contact: "Maker", link: "", company: "Plateau Light", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 3_000_000, views: 73, days: 30, image: "https://picsum.photos/seed/mkt-lantern/640/400" },
  { id: "dr1", kind: "rent", title: "Self-con in Yaba", body: "New tiles, prepaid meter. Agent contact on listing.", city: "Lagos", contact: "Agent", link: "", company: "Yaba Lets", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 60_000_000, views: 276, days: 30, image: "https://picsum.photos/seed/rent-yaba/640/400" },
  { id: "dr2", kind: "rent", title: "2-bed in Wuse II", body: "Serviced. No deposit inside Kilode.", city: "Abuja", contact: "Agent", link: "", company: "Wuse Homes", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 44_000_000, views: 198, days: 14, image: "https://picsum.photos/seed/rent-wuse/640/400" },
  { id: "dr3", kind: "rent", title: "Shop space — Computer Village", body: "Ground floor. Call the lister.", city: "Ikeja", contact: "Lister", link: "", company: "CV Shops", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 22_000_000, views: 133, days: 7, image: "https://picsum.photos/seed/rent-cv/640/400" },
  { id: "dr4", kind: "rent", title: "Room and parlour — Enugu", body: "Gated. Agent on the card.", city: "Enugu", contact: "Agent", link: "", company: "Coal City Lets", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 10_000_000, views: 77, days: 30, image: "https://picsum.photos/seed/rent-enugu/640/400" },
  { id: "dr5", kind: "rent", title: "Mini flat — Ikeja GRA", body: "Generator. Agent contact only.", city: "Lagos", contact: "Agent", link: "", company: "GRA Lets", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 9_000_000, views: 154, days: 14, image: "https://picsum.photos/seed/rent-ikeja/640/400" },
  { id: "dr6", kind: "rent", title: "Office desk — Yaba", body: "Hot desk. No rent paid in Kilode.", city: "Lagos", contact: "Host", link: "", company: "Yaba Hub", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 8_000_000, views: 91, days: 7, image: "https://picsum.photos/seed/rent-desk/640/400" },
  { id: "dr7", kind: "rent", title: "3-bed — Gwarinpa", body: "Family house. Agent on the card.", city: "Abuja", contact: "Agent", link: "", company: "Gwarinpa Homes", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 7_000_000, views: 188, days: 30, image: "https://picsum.photos/seed/rent-gwarinpa/640/400" },
  { id: "dr8", kind: "rent", title: "Warehouse — Apapa", body: "Ground floor. Lister contact.", city: "Lagos", contact: "Lister", link: "", company: "Apapa Yards", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 6_000_000, views: 62, days: 14, image: "https://picsum.photos/seed/rent-apapa/640/400" },
  { id: "dr9", kind: "rent", title: "Short-let — Victoria Island", body: "Weekend stay. Contact the host. No booking in-app.", city: "Lagos", contact: "Host", link: "", company: "VI Stays", status: "approved", submitter: "Kilode.ng", ts: Date.now() - 5_000_000, views: 240, days: 7, image: "https://picsum.photos/seed/rent-vi/640/400" },
];

export const MORE_DEMO_ADS: Campaign[] = [
  moreAd("demo-ad-airtel", "Airtel 5G", "Faster in 36 states.", 7, { placement: "featured", link: "https://www.airtel.com.ng" }),
  moreAd("demo-ad-opay", "OPay wallet", "Send Naira in seconds.", 14, { link: "https://www.opayweb.com" }),
  moreAd("demo-ad-access", "Access Bank", "More than banking.", 30, { link: "https://www.accessbankplc.com" }),
  moreAd("demo-ad-infinix", "Infinix Hot", "Phones that last.", 7, { link: "https://www.infinixmobility.com" }),
  moreAd("demo-ad-dangote", "Dangote Cement", "Build with it.", 30),
  moreAd("demo-ad-guinness", "Guinness Malta", "Greatness.", 7),
  moreAd("demo-ad-coke", "Coca-Cola Naija", "Open happiness.", 14),
  moreAd("demo-ad-bet9ja", "Bet9ja weekend", "Play responsible.", 1),
  moreAd("demo-ad-konga", "Konga deals", "Shop Nigeria.", 7, { link: "https://www.konga.com" }),
  moreAd("demo-ad-ibom", "Ibom Air", "Fly the east.", 14),
  moreAd("demo-ad-shoprite", "Shoprite Lagos", "Fill the cart.", 7),
  moreAd("demo-ad-farm", "FarmCrowdy", "Grow with agro.", 30),
  moreAd("demo-ad-total", "TotalEnergies", "Fuel that holds.", 14),
  moreAd("demo-ad-gtb", "GTBank", "Orange is the new banking.", 30, { link: "https://www.gtbank.com" }),
  moreAd("demo-ad-tecno", "Tecno Spark", "Capture more.", 7),
  moreAd("demo-ad-flutter", "Flutterwave", "Accept payments.", 14, { link: "https://flutterwave.com" }),
  moreAd("demo-ad-hotel", "Eko Hotels", "Lagos stay.", 7),
  moreAd("demo-ad-wapic", "WAPIC insurance", "Cover the unexpected.", 30),
  moreAd("demo-ad-cowry", "Cowrywise", "Save in Naira.", 14),
  moreAd("demo-ad-pmt", "Peace Mass Transit", "Move the country.", 7),
  moreAd("demo-ad-indomie", "Indomie", "You are the best.", 1),
  moreAd("demo-ad-dstv", "DStv Compact", "Naija on screen.", 30),
  moreAd("demo-ad-unilag", "UNILAG extra mural", "Learn after work.", 14),
  moreAd("demo-ad-reddin", "Reddington Hospital", "Care in Lagos.", 30),
  moreAd("demo-ad-rccg", "RCCG Lagos", "Sunday service.", 7),
  moreAd("demo-ad-toyota", "Toyota Nigeria", "Drive longer.", 30),
  moreAd("demo-ad-furn", "Furniture Palace", "Homes that sit well.", 14),
  moreAd("demo-ad-quilox", "Quilox nights", "Victoria Island.", 1),
  moreAd("demo-ad-event", "EventOne halls", "Weddings and launch.", 7),
  moreAd("demo-ad-kuda", "Kuda Bank", "Free transfers.", 14, { link: "https://kuda.com" }),
];

export const DEMO_JOINS: Join[] = [
  { name: "Amaka#2201", ts: Date.now() - 120_000, room: "ng" },
  { name: "Kemi#0092", ts: Date.now() - 300_000, room: "lounge" },
  { name: "Chidi#4410", ts: Date.now() - 480_000, room: "tech" },
  { name: "Baba#12", ts: Date.now() - 700_000, room: "sport" },
  { name: "Ife#830", ts: Date.now() - 900_000, room: "ng" },
];

export const DEMO_NOTES: Note[] = [
  { id: "dn1", text: "New feed posted: “Lagos night market still hits different”", ts: Date.now() - 3600_000 },
  { id: "dn2", text: "Ad approved: Glo data bundle", ts: Date.now() - 3000_000 },
  { id: "dn3", text: "Ad approved: Spotify Naija mix", ts: Date.now() - 2000_000 },
  { id: "dn4", text: "New feed posted: “Best jollof is not even a debate”", ts: Date.now() - 7200_000 },
  { id: "dn5", text: "Amaka#2201 joined Nigeria", ts: Date.now() - 120_000 },
];

function track(partial: Omit<MusicTrack, "embed" | "platform" | "url"> & { url: string }): MusicTrack {
  const parsed = parseMusicUrl(partial.url);
  return {
    ...partial,
    url: parsed?.url ?? partial.url,
    platform: parsed?.platform ?? "Link",
    embed: parsed?.embed,
  };
}

export const DEMO_TRACKS: MusicTrack[] = [
  track({ id: "demo-track-1", title: "Last Last", artist: "Burna Boy", url: "https://music.apple.com/us/album/last-last/1623677591?i=1623677811", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/ca/eb/31/caeb3173-eaf0-0cd5-65ea-585adfe312ba/075679745156.jpg/600x600bb.jpg", genre: "Afrobeats", album: "Love, Damini", author: "Kemi#0092", ts: Date.now() - 4000000 }),
  track({ id: "demo-track-2", title: "Essence", artist: "Wizkid", url: "https://music.apple.com/us/album/essence-feat-tems/1531532301?i=1531532767", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b0/09/8e/b0098ed0-ef53-f2b5-386a-c8e6181f3c8a/886448775256.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Amaka#2201", ts: Date.now() - 8000000 }),
  track({ id: "demo-track-3", title: "Calm Down", artist: "Rema", url: "https://music.apple.com/us/album/calm-down/1614063395?i=1614063459", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b2/b4/7c/b2b47cf9-d8e2-53f6-5c62-c974d665c95b/22UMGIM08994.rgb.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Chidi#4410", ts: Date.now() - 12000000 }),
  track({ id: "demo-track-4", title: "Rush", artist: "Ayra Starr", url: "https://music.apple.com/us/album/rush/1642898371?i=1642898573", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/93/c1/9293c1af-2881-bcb7-439f-99a516e5d715/5059449090122.png/600x600bb.jpg", genre: "Afrobeats", author: "Ada#5512", ts: Date.now() - 14000000 }),
  track({ id: "demo-track-5", title: "Sungba", artist: "Asake", url: "https://music.apple.com/us/album/sungba-feat-burna-boy-remix/1616238858?i=1616238860", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/15/df/2f/15df2f12-e18b-b114-8bfb-3c6183dc966f/194690805264_cover.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Tunde#104", ts: Date.now() - 16000000 }),
  track({ id: "demo-track-6", title: "Terminator", artist: "Asake", url: "https://music.apple.com/us/album/terminator/1636748658?i=1636748672", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/5e/4f/66/5e4f6644-a234-d037-609d-7ed53fd6c7f9/194690909856_cover.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Kemi#0092", ts: Date.now() - 18000000 }),
  track({ id: "demo-track-7", title: "It's Plenty", artist: "Burna Boy", url: "https://music.apple.com/us/album/its-plenty/1749165462?i=1749167041", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/d2/c5/ae/d2c5ae58-d8c0-bea0-3427-e55166218438/075679688477.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Amaka#2201", ts: Date.now() - 20000000 }),
  track({ id: "demo-track-8", title: "Sability", artist: "Ayra Starr", url: "https://music.apple.com/us/album/sability/1667892664?i=1667892665", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/24/38/e2/2438e2e2-19b2-488c-e64d-ef5b63d1defe/5059449109398.png/600x600bb.jpg", genre: "Afrobeats", author: "Chidi#4410", ts: Date.now() - 22000000 }),
  track({ id: "demo-track-9", title: "Bandana", artist: "Fireboy DML", url: "https://music.apple.com/us/album/peru/1600604157?i=1600604159", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b9/a8/79/b9a87900-13cb-5655-2ac8-64191ee6ec5d/194690720895_cover.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Ada#5512", ts: Date.now() - 24000000 }),
  track({ id: "demo-track-10", title: "Calm Down", artist: "Rema", url: "https://music.apple.com/us/album/calm-down/1614063395?i=1614063459", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b2/b4/7c/b2b47cf9-d8e2-53f6-5c62-c974d665c95b/22UMGIM08994.rgb.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Tunde#104", ts: Date.now() - 26000000 }),
  track({ id: "demo-track-11", title: "Alone", artist: "Burna Boy", url: "https://music.apple.com/us/album/alone/1653546033?i=1653546264", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/e9/a0/16/e9a016aa-a82f-8e67-50b2-f1101e0be964/22UM1IM30248.rgb.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Kemi#0092", ts: Date.now() - 28000000 }),
  track({ id: "demo-track-12", title: "Joro", artist: "Wizkid", url: "https://music.apple.com/us/album/joro/1471034859?i=1471034860", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/20/05/17/200517ab-c3a3-b833-74b3-9bb3399c780c/886447834886.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Amaka#2201", ts: Date.now() - 30000000 }),
  track({ id: "ka-1", title: "Palm Wine Radio", artist: "Sade Okafor", url: "https://music.apple.com/us/album/calm-down/1614063395?i=1614063459", cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&h=600&q=80", genre: "Afrobeats", author: "SadeOkafor", ts: Date.now() - 3500000 }),
  track({ id: "ka-2", title: "Wuse After Dark", artist: "Chuka Metro", url: "https://music.apple.com/us/album/rush/1642898371?i=1642898573", cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&h=600&q=80", genre: "Afrobeats", author: "ChukaMetro", ts: Date.now() - 4500000 }),
  track({ id: "ka-3", title: "Neon Market", artist: "Bisi Neon", url: "https://music.apple.com/us/album/water/1699082722?i=1699082734", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba60b75b?auto=format&fit=crop&w=600&h=600&q=80", genre: "Amapiano", author: "BisiNeon", ts: Date.now() - 5500000 }),
  track({ id: "ka-4", title: "Dusk in Dugbe", artist: "Teniola Waves", url: "https://music.apple.com/us/album/joro/1471034859?i=1471034860", cover: "https://images.unsplash.com/photo-1459749411175-04bf529e0013?auto=format&fit=crop&w=600&h=600&q=80", genre: "Afrobeats", author: "TeniolaWaves", ts: Date.now() - 6500000 }),
];

export const DIGITAL_TRACKS: MusicTrack[] = [
  track({ id: "dig-1", title: "Love Nwantiti", artist: "CKay", url: "https://music.apple.com/us/album/love-nwantiti-ah-ah-ah-feat-joeboy-kuami-eugene-remix/1497212536?i=1497212542", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/47/75/a4/4775a4de-e5bd-e553-7dec-5a3911718276/795152501603.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 5000000 }),
  track({ id: "dig-2", title: "Last Last", artist: "Burna Boy", url: "https://music.apple.com/us/album/last-last/1623677591?i=1623677811", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/ca/eb/31/caeb3173-eaf0-0cd5-65ea-585adfe312ba/075679745156.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 6000000 }),
  track({ id: "dig-3", title: "Peru", artist: "Fireboy DML", url: "https://music.apple.com/us/album/peru/1600604157?i=1600604159", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b9/a8/79/b9a87900-13cb-5655-2ac8-64191ee6ec5d/194690720895_cover.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 7000000 }),
  track({ id: "dig-4", title: "Unavailable", artist: "Davido", url: "https://music.apple.com/us/album/unavailable-feat-musa-keys-sean-paul-ding-dong-remix/1704156396?i=1704156397", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f2/6f/40/f26f409e-958b-0b9f-adce-395673632c18/196871414814.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 8000000 }),
  track({ id: "dig-5", title: "Soweto", artist: "Victony", url: "https://music.apple.com/us/album/soweto-mixed/6769222685?i=6769223116", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/fa/a8/e5/faa8e5f7-a1c5-6842-24a4-1587afc96c32/823375178248_Cover.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 9000000 }),
  track({ id: "dig-6", title: "Dull", artist: "Asake", url: "https://music.apple.com/us/album/dull/1636748658?i=1636748669", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/5e/4f/66/5e4f6644-a234-d037-609d-7ed53fd6c7f9/194690909856_cover.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 10000000 }),
  track({ id: "dig-7", title: "Water", artist: "Tyla", url: "https://music.apple.com/us/album/water/1699082722?i=1699082734", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/1e/c9/5b/1ec95bbc-a56f-cbef-070c-ddec9f4fdd3c/196871296205.jpg/600x600bb.jpg", genre: "Amapiano", author: "Spotify", ts: Date.now() - 11000000 }),
  track({ id: "dig-8", title: "City Boys", artist: "Burna Boy", url: "https://music.apple.com/us/album/city-boys/1704311790?i=1704312957", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/01/ee/63/01ee6370-1805-15e4-de8c-293a889a439c/075679676351.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 12000000 }),
  track({ id: "dig-9", title: "Finesse", artist: "Pheelz", url: "https://music.apple.com/us/album/finesse/1614660789?i=1614660802", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/21/ec/0e/21ec0eab-75de-82f3-8080-9a3de6b5fce8/610012522003.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 13000000 }),
  track({ id: "dig-10", title: "Monalisa", artist: "Lojay", url: "https://music.apple.com/us/album/monalisa/1564963618?i=1564964655", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c9/83/0e/c9830e14-663a-9064-954c-ef84670db7e1/196006598723.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 14000000 }),
  track({ id: "dig-11", title: "KU LO SA", artist: "Oxlade", url: "https://music.apple.com/us/album/ku-lo-sa-a-colors-show/1628124903?i=1628125458", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/22/5c/fc/225cfcdb-3107-87d1-02b4-8d58ebe19e57/196589232137.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 15000000 }),
  track({ id: "dig-12", title: "Risky", artist: "Davido", url: "https://music.apple.com/us/album/risky/1484518867?i=1484518885", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/51/ca/d9/51cad909-e31b-160a-126d-28e69ac89405/886448091097.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 16000000 }),
  track({ id: "dig-13", title: "Coming", artist: "Asake", url: "https://music.apple.com/us/album/lonely-at-the-top/1688641478?i=1688642838", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/cc/23/83/cc2383d9-eecc-f974-5f5b-d445c583acdb/197342233958_cover.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 17000000 }),
  track({ id: "dig-14", title: "Extra Chill", artist: "Wizkid", url: "https://music.apple.com/us/album/essence-feat-tems/1531532301?i=1531532767", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b0/09/8e/b0098ed0-ef53-f2b5-386a-c8e6181f3c8a/886448775256.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 18000000 }),
  track({ id: "dig-15", title: "Holiday", artist: "Rema", url: "https://music.apple.com/us/album/holiday/1669761326?i=1669761328", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/54/69/0f/54690f2c-0b36-5c86-0296-98ec3ef51260/23SYMIM02992.rgb.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 19000000 }),
  track({ id: "dig-16", title: "Feel", artist: "Davido", url: "https://music.apple.com/us/album/feel/1675379314?i=1675379321", cover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/40/12/87/4012878d-d267-09b8-7fe0-8c3fd8fdf169/886449553617.jpg/600x600bb.jpg", genre: "Afrobeats", author: "Spotify", ts: Date.now() - 20000000 }),
];

export const MUSIC_GENRES = ["All", "Afrobeats", "Amapiano", "Highlife", "Hip-Hop", "Gospel", "R&B", "Fuji", "Jazz"] as const;

export const MUSIC_RAILS: { id: string; title: string; subtitle: string; color: string }[] = [
  { id: "made", title: "Made for you", subtitle: "Daily mix · Afrobeats", color: "#14351f" },
  { id: "charts", title: "Naija Top 50", subtitle: "Charts this week", color: "#1a2744" },
  { id: "new", title: "New releases", subtitle: "Fresh drops", color: "#3b2a16" },
  { id: "mood", title: "Chill vibes", subtitle: "Soft evenings", color: "#2a2438" },
  { id: "party", title: "Party starter", subtitle: "Weekend energy", color: "#2d1f3d" },
  { id: "focus", title: "Focus flow", subtitle: "Work & study", color: "#243018" },
  { id: "gospel", title: "Sunday best", subtitle: "Gospel picks", color: "#1f3d2e" },
  { id: "throwback", title: "Throwback", subtitle: "Classics on repeat", color: "#3a1f2e" },
];

export const VIDEO_SECTIONS = [
  "Movies",
  "Nollywood",
  "Trailers",
  "Music videos",
  "Comedy",
  "Sports",
  "News",
  "Documentary",
  "Shorts",
  "Interviews",
  "Kids",
] as const;

export const VIDEO_CATALOG: Record<string, { id: string; title: string }[]> = {
  Movies: [
    { id: "xjDjIWPwcPU", title: "Black Panther — trailer" },
    { id: "_Z3QKkl1WyM", title: "Wakanda Forever — trailer" },
    { id: "3RDaPV_rJ1Y", title: "The Woman King — trailer" },
    { id: "sYc1gUwXJk0", title: "Coming 2 America — trailer" },
  ],
  Nollywood: [
    { id: "lQjFGCqE_6E", title: "The Black Book — trailer" },
    { id: "oqkz5k3f1nA", title: "King of Boys — trailer" },
  ],
  Trailers: [
    { id: "TcMBFSGVi1c", title: "Avengers Endgame — trailer" },
    { id: "8g18jFHCLXk", title: "Dune — trailer" },
  ],
  "Music videos": [
    { id: "iuoQyKbwzN0", title: "Burna Boy — Ye" },
    { id: "CQLsdm1ZYAw", title: "Rema — Calm Down" },
  ],
  Comedy: [{ id: "5qap5aO4i9A", title: "Live sample" }],
  Sports: [{ id: "Nq4NIpj9K0I", title: "Sports clip" }],
  News: [{ id: "9Auq9mYxFEE", title: "News clip" }],
  Documentary: [{ id: "5qap5aO4i9A", title: "Doc sample" }],
  Shorts: [{ id: "CQLsdm1ZYAw", title: "Short clip" }],
  Interviews: [{ id: "iuoQyKbwzN0", title: "Interview sample" }],
  Kids: [{ id: "sYc1gUwXJk0", title: "Family trailer" }],
};
