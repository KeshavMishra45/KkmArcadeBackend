// Server-side price list. Keep ids/prices in sync with AVATARS and BANNERS in js/app.js.
// The server decides prices so nobody can buy things cheaper by editing the frontend.
const AVATARS = { a1: 0, a2: 500, a3: 800, a4: 1200, a5: 1500, a6: 2000, a7: 2500, a8: 3000, a9: 3500, a10: 4000 };
const BANNERS = { b1: 0, b2: 500, b3: 800, b4: 1200, b5: 1500, b6: 2000, b7: 2500, b8: 3000, b9: 3500, b10: 4000 };

module.exports = {
  avatar: { prices: AVATARS, list: 'avatars', equipped: 'avatar' },
  banner: { prices: BANNERS, list: 'banners', equipped: 'banner' },
};
