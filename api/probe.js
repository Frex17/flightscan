
// FlightScan - sonda diagnostica
// Mettere questo file in:  api/probe.js
// Gira come funzione serverless su Vercel (la rete e' aperta lato server).
// Prova gli endpoint anonimi di Ryanair e riporta quali rispondono e con che formato.
//
// Dopo il deploy, aprire nel browser:
//   https://TUO-APP.vercel.app/api/probe
//   (default: BRI -> MAD, agosto 2026)
// Oppure con parametri:
//   https://TUO-APP.vercel.app/api/probe?from=BRI&to=MAD&year=2026&month=8

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const q = req.query || {};
  const from = (q.from || "BRI").toUpperCase();
  const to = (q.to || "MAD").toUpperCase();
  const year = String(q.year || "2026");
  const month = String(q.month || "8");
  const mm = month.padStart(2, "0");

  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";
  const baseHeaders = {
    "User-Agent": UA,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-GB,en;q=0.9"
  };

  // Scalda i cookie contro www.ryanair.com (alcuni endpoint li richiedono).
  let cookie = "";
  try {
    const w = await fetch("https://www.ryanair.com/", { headers: baseHeaders });
    const sc = w.headers.get("set-cookie");
    if (sc) cookie = sc.split(",").map((s) => s.split(";")[0]).join("; ");
  } catch (e) {
    /* ignora */
  }
  const H = cookie ? Object.assign({}, baseHeaders, { Cookie: cookie }) : baseHeaders;

  const candidates = [
    {
      name: "schedules_services",
      url: `https://services-api.ryanair.com/timtbl/3/schedules/${from}/${to}/years/${year}/months/${month}`
    },
    {
      name: "schedules_www",
      url: `https://www.ryanair.com/api/timtbl/3/schedules/${from}/${to}/years/${year}/months/${month}`
    },
    {
      name: "routes_from_airport",
      url: `https://www.ryanair.com/api/views/locate/searchWidget/routes/en/airport/${from}`
    },
    {
      name: "airports_active",
      url: `https://www.ryanair.com/api/views/locate/5/airports/en/active`
    },
    {
      name: "fares_cheapest_per_day",
      url:
        `https://services-api.ryanair.com/farfnd/v4/oneWayFares/${from}/${to}/cheapestPerDay` +
        `?market=en-gb&outboundMonthOfDate=${year}-${mm}-01`
    }
  ];

  async function probe(c) {
    try {
      const r = await fetch(c.url, { headers: H });
      const ct = r.headers.get("content-type") || "";
      const text = await r.text();
      let topKeys = null;
      if (ct.includes("json")) {
        try {
          const j = JSON.parse(text);
          topKeys = Array.isArray(j)
            ? `array[${j.length}]`
            : Object.keys(j).slice(0, 12);
        } catch (e) {
          /* non json valido */
        }
      }
      return {
        name: c.name,
        url: c.url,
        status: r.status,
        ok: r.ok,
        contentType: ct,
        topKeys: topKeys,
        snippet: text.slice(0, 700)
      };
    } catch (e) {
      return { name: c.name, url: c.url, error: String(e) };
    }
  }

  const results = await Promise.all(candidates.map(probe));
  res
    .status(200)
    .send(
      JSON.stringify(
        { params: { from, to, year, month }, cookieWarmed: Boolean(cookie), results },
        null,
        2
      )
    );
}
