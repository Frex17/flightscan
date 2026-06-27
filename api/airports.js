// FlightScan - lista aeroporti per autocomplete
// Mettere in: api/airports.js
const R = require("./_ryanair.js");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
  try {
    const map = await R.getAirports();
    const list = Object.keys(map).map((k) => {
      const a = map[k];
      return { code: a.code, name: a.name, city: a.city, country: a.country, base: a.base };
    });
    res.status(200).send(JSON.stringify(list));
  } catch (e) {
    res.status(502).send(JSON.stringify({ error: String((e && e.message) || e) }));
  }
};
