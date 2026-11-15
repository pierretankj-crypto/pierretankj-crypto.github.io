// The two businesses, as case studies with proof (Showcase › Achievements).
// Keyboard photos are cropped out of customer chats so no customer details show; on the Carousell
// screenshot the buyers' names and pictures are blurred. The raw screenshots are kept off this repository.
const files = import.meta.glob('./assets/biz/*.webp', { eager: true, query: '?url', import: 'default' });
const b = (name) => files[`./assets/biz/${name}.webp`];

export const businesses = [
  {
    id: 'keygalore',
    kind: 'Founder · custom mechanical keyboards · TikTok and Carousell',
    title: 'Keygalore',
    intro: 'A one-person custom keyboard business. Customers send me an idea, often a favourite character or colour scheme, and I pick the case, switches and keycaps, build the board and ship it. Short reveal videos on TikTok do the selling, and the business grew past S$10,000 in gross revenue.',
    tags: ['Sales', 'Short-form video', 'Sourcing', 'Customer service', 'TikTok', 'Carousell'],
    links: [{ label: 'See @keyga.lore on TikTok', href: 'https://www.tiktok.com/@keyga.lore' }],
    note: 'Photos are of boards I built for customers, cropped from their messages so no customer details show.',
    gallery: [b('kb-crimson'), b('kb-violet'), b('kb-red'), b('kb-rgb'), b('kb-purple')],
    steps: [
      {
        title: 'Built to each customer’s request',
        text: 'Every board starts as a message: a theme, a layout, a budget. I spec the parts, build and test the board, then send it off. These are a few of the boards I built for customers, photographed after they arrived.',
        media: { type: 'gallery', items: [b('kb-violet'), b('kb-red'), b('kb-purple'), b('kb-rgb')], label: 'Custom keyboards built for customers' },
      },
      {
        title: 'Selling with short videos',
        text: 'Each build gets a short reveal video. The account has <b>374 followers and 25.7K likes</b>, yet individual reveals reach far past the follower count: <em>30K</em> and <em>24.2K</em> views on recent ones, and my best video reached <b>183K views</b>. The bio says it plainly: trusted by 100+ customers.',
        media: { type: 'img', src: b('tiktok-profile'), portrait: true }, alt: 'The KeyGalore TikTok profile: 374 followers, 25.7K likes, and keyboard reveal videos with up to 30K views',
      },
      {
        title: 'From DM to delivery',
        text: 'Orders come in through TikTok and Carousell messages. I handle the quote, payment, build and delivery myself, in Singapore and overseas, which is how the shop passed <b>S$10,000 in gross revenue</b>. Running it taught me to answer fast, set clear expectations and make the customer feel the board was made for them.',
        media: { type: 'img', src: b('kb-crimson') }, alt: 'A black and red custom keyboard built for a customer',
      },
    ],
  },
  {
    id: 'trendy',
    kind: 'Founder · online retail · Carousell and Shopee',
    title: 'Trendy Traders',
    intro: 'My first online shop. I found products that were trending, listed them on Carousell and Shopee, and handled the pricing, customer questions and delivery myself, selling more than 50 products.',
    tags: ['E-commerce', 'Sourcing', 'Pricing', 'Customer service', 'Shopee', 'Carousell'],
    links: [],
    note: 'Buyers’ names and profile pictures are blurred.',
    cover: b('shopee-shop'), coverPortrait: true,
    steps: [
      {
        title: 'Designing every product listing',
        text: 'I designed the listing image for each product: its own name, a one-line tagline and a consistent card carrying the TrendyTraders mark, so the shop reads like a brand rather than a pile of random listings. Five of them, from the <em>Velvet Calm</em> slippers to the <em>Kinetic Dynasty</em> shorts.',
        media: { type: 'img', src: b('trendy-designs'), wide: true }, alt: 'Five TrendyTraders product listing designs: Velvet Calm, Cotton Kiss and Blueberry Plush slippers, and Kinetic Hikari and Kinetic Dynasty shorts',
      },
      {
        title: 'A 5.0-rated Shopee shop',
        text: 'TrendyTraders on Shopee holds a <b>5.0 rating</b>. Its best seller, cotton home slippers at S$8.70, sold <em>23 pairs</em>, alongside items such as large anime desk mats.',
        media: { type: 'img', src: b('shopee-shop'), portrait: true }, alt: 'The TrendyTraders Shopee shop with a 5.0 rating and products with 23 and 3 sold',
      },
      {
        title: 'Five-star reviews on Carousell',
        text: 'On Carousell I sold streetwear shorts. Buyers left <b>five-star reviews</b> for product quality, fast deals and good communication, the parts of the job I could control myself.',
        media: { type: 'img', src: b('carousell-reviews'), portrait: true }, alt: 'Two five-star Carousell reviews from buyers of shorts, with the buyers’ names blurred',
      },
    ],
  },
];
