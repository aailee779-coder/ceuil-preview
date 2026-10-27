// Villa data. Every figure is from the client brochure (EN): plot table p.5, plan pages p.6–23.
// Status: all available (Anas, 2026-10-23). The villa→type mapping is deduced from the site-plan highlights (to confirm).
window.CEUIL = {
  types: {
    1: { plots: [1, 11], built: 563, suites: 4, baths: 5, lift: false,
         levels: [
           { key: 'gf', img: 't1-gf', living: 219, terrace: 105, total: 324 },
           { key: 'gf_b', img: 't1-gf-b', living: 219, terrace: 105, total: 324 },
           { key: 'ff', img: null }
         ], note: 't1_note' },
    2: { plots: [2, 6, 8], built: 945, suites: 6, baths: 9, lift: true,
         levels: [
           { key: 'gf', img: 't2-gf', living: 293, terrace: 124, total: 417 },
           { key: 'ff', img: 't2-ff', living: 273, terrace: 50, total: 323 },
           { key: 'b', img: 't2-b', living: 160, terrace: 45, total: 205 }
         ] },
    3: { plots: [3, 4, 5, 10], built: 576, suites: 4, baths: 6, lift: false,
         levels: [
           { key: 'gf', img: 't3-gf', living: 217, terrace: 130, total: 347 },
           { key: 'ff', img: 't3-ff', living: 181, terrace: 48, total: 229 }
         ] },
    4: { plots: [9], built: 933, suites: 5, baths: 8, lift: true,
         levels: [
           { key: 'gf', img: 't4-gf', living: 290, terrace: 170, total: 460 },
           { key: 'ff', img: 't4-ff', living: 232, terrace: 69, total: 301 },
           { key: 'b', img: 't4-b', living: 140, terrace: 32, total: 172 }
         ] },
    5: { plots: [7], built: 824, suites: 4, baths: 7, lift: true,
         levels: [
           { key: 'gf', img: 't5-gf', living: 284, terrace: 114, total: 398 },
           { key: 'ff', img: 't5-ff', living: 233, terrace: 56, total: 289 },
           { key: 'b', img: 't5-b', living: 116, terrace: 21, total: 137 }
         ] }
  },
  // x/y = % position of the plot number on the master-plan image
  plots: [
    { n: 1, type: 1, land: 1005.82, built: 563, status: 'available', x: 85.1, y: 47.9 },
    { n: 2, type: 2, land: 1340.76, built: 945, status: 'available', x: 80.8, y: 26.6 },
    { n: 3, type: 3, land: 1001.58, built: 576, status: 'available', x: 63.9, y: 26.6 },
    { n: 4, type: 3, land: 1002.39, built: 576, status: 'available', x: 46.2, y: 27.3 },
    { n: 5, type: 3, land: 1002.40, built: 576, status: 'available', x: 29.9, y: 27.3 },
    { n: 6, type: 2, land: 1180.72, built: 945, status: 'available', x: 11.9, y: 26.9 },
    { n: 7, type: 5, land: 1164.27, built: 824, status: 'available', x: 12.4, y: 50.7 },
    { n: 8, type: 2, land: 1376.25, built: 945, status: 'available', x: 13.8, y: 78.3 },
    { n: 9, type: 4, land: 1152.73, built: 933, status: 'available', x: 29.4, y: 72.4 },
    { n: 10, type: 3, land: 1009.72, built: 576, status: 'available', x: 46.7, y: 57.7 },
    { n: 11, type: 1, land: 1019.80, built: 563, status: 'available', x: 59.8, y: 55.6 }
  ],
  // Golf courses: names, km, drive minutes and holes from the developer's "Marrakech Golf Lifestyle" map (2026-10-27).
  // x/y = % position on the illustrated map (img/golfmap), traced from that map; illustrative, not to scale.
  golf: [
    { n: 1, name: 'Noria Golf Club', km: 2, min: 5, holes: 18, x: 25.4, y: 44.5 },
    { n: 2, name: 'The Tony Jacklin Marrakech', km: 4, min: 8, holes: 18, x: 7.5, y: 39.5 },
    { n: 3, name: 'Argan Golf Resort', km: 2.5, min: 6, holes: 18, x: 17.6, y: 48.8 },
    { n: 4, name: 'Akenza Golf Resort', km: 3, min: 7, holes: 18, x: 29, y: 57.5 },
    { n: 5, name: 'Atlas Golf Marrakech', km: 5, min: 10, holes: 18, x: 30, y: 72.8 },
    { n: 6, name: 'The Montgomerie Marrakech', km: 9, min: 15, holes: 18, x: 53.4, y: 55 },
    { n: 7, name: 'Assoufid Golf Club', km: 13.5, min: 25, holes: 18, x: 58.6, y: 64.5 },
    { n: 8, name: 'Samanah Golf Club', km: 12.5, min: 22, holes: 18, x: 75.8, y: 73.7 },
    { n: 9, name: 'Royal Golf Marrakech', km: 13, min: 22, holes: 27, x: 73.6, y: 40 },
    { n: 10, name: 'Al Maaden Golf Resort', km: 15.6, min: 28, holes: 18, x: 85.3, y: 55.7 },
    { n: 11, name: 'Amelkis Golf Club', km: 16.5, min: 28, holes: 27, x: 62.8, y: 27.3 },
    { n: 12, name: 'PalmGolf Ourika', km: 8, min: 18, holes: 18, x: 81.4, y: 84.5 },
    { n: 13, name: 'PalmGolf Palmeraie', km: 20, min: 30, holes: 18, x: 43.6, y: 7.8 }
  ],
  map: { you: [17, 57], city: [44.3, 36.1], airport: [14, 21.5] },
  wa: '212664106546'
};
