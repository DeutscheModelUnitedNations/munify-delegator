# Comparing countries (plan)

Status: **brainstorm, nothing built yet.** Builds on the country information
(`docs/architecture/country-information.md`). Sources, licences and endpoints below are from
desk research and are marked _verify_ where they must be checked before building on them.

## Goal

A delegate preparing a country should be able to put its numbers in context: _is 3 % unemployment
much? how does my country stand next to the others in my committee?_ Supervisors see the same in
their drawer.

## Decisions so far

| Topic        | Decision                                                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compare with | **All four**: a freely chosen country, **Germany by default**, the **committee peers** (nations seated in the delegate's committees), and the **world / region** (rank, percentile, median). |
| Data kinds   | **Governance & democracy** and **socio-economic & climate**. Not now: UN voting alignment, memberships/alliances.                                                                            |
| Placement    | Inside the existing "Information on your country" section (and the supervisor drawer), below the World Bank figures.                                                                         |
| Licence rule | Only data whose licence allows showing it in the app with attribution (CC BY, CC BY-SA, public domain, World Bank/IMF terms). Restrictive indices are links at most.                         |

## Candidate sources

| Source                                                                            | What                                                                                                                                                         | Access                                                                                             | Licence                                                                        | Coverage / cadence                           |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| **World Bank WDI**                                                                | CO₂ per capita, military spending % GDP, internet users, health/education spending, Gini, urbanisation, electricity access, population growth                | same API as today: `api.worldbank.org/v2/country/{all\|ISO3}/indicator/{code}?format=json&mrnev=1` | CC BY 4.0                                                                      | ~217 economies, yearly                       |
| **Worldwide Governance Indicators** (WB)                                          | voice & accountability, political stability, government effectiveness, regulatory quality, rule of law, control of corruption (−2.5…2.5 and percentile rank) | WB API, source 3 (_verify_: codes were renamed in the 2024 revision)                               | CC BY 4.0                                                                      | ~214 countries, yearly                       |
| **UNDP Human Development Report**                                                 | HDI, gender inequality index, inequality-adjusted HDI                                                                                                        | CSV downloads; API at hdrdata.org needs a free key (_verify_)                                      | CC BY 3.0 IGO (_verify_)                                                       | ~190, yearly                                 |
| **V-Dem**                                                                         | electoral / liberal democracy index                                                                                                                          | CSV (large), or via Our World in Data                                                              | CC BY-SA 4.0                                                                   | ~180, yearly                                 |
| **Our World in Data**                                                             | ready-made series incl. HDI, V-Dem, CO₂, energy mix, life satisfaction; one consistent format                                                                | `ourworldindata.org/grapher/<slug>.csv` + `.metadata.json` (_verify_ query params)                 | CC BY 4.0 for OWID work; third-party data keep their licence (check per chart) | varies                                       |
| **IMF DataMapper**                                                                | GDP growth, inflation, government debt, current account, incl. projections                                                                                   | `imf.org/external/datamapper/api/v1/{indicator}/{ISO3}`, no key                                    | IMF terms, reuse with attribution (_verify_)                                   | ~190, twice a year                           |
| **WHO GHO**                                                                       | health: UHC index, physicians per 1000, child mortality                                                                                                      | OData API `ghoapi.azureedge.net/api/{indicator}`                                                   | CC BY-NC-SA 3.0 IGO (_verify_ — NC may be fine for a non-profit)               | ~194, yearly                                 |
| **ND-GAIN**                                                                       | climate vulnerability and readiness                                                                                                                          | CSV download                                                                                       | open, attribution (_verify_)                                                   | ~185, yearly                                 |
| Freedom House, RSF Press Freedom, TI CPI, EIU Democracy Index, Global Peace Index | well-known rankings                                                                                                                                          | downloads                                                                                          | restrictive (permission, ND or registration)                                   | **links only** unless permission is obtained |

## Shape

### Data

The current cache is per country and indicator. Ranks, region medians and committee peers need an
indicator **for every country**, and the World Bank gives that in one call
(`country/all/indicator/{code}?mrnev=1&per_page=400`, _verify_ `mrnev` with `all`). So:

1. Turn the cache into **datasets**: one entry per (source, indicator) with the value and year of
   every country, `refreshAt` as today. Seven indicators today = seven requests a week instead of
   seven per country. The country figures read from the dataset.
2. A **provider** per source (`worldBank`, `owid`, `imf`, …) with one function: indicator →
   `{ [alpha3]: { value, year } }`. The cache and everything above stay source-agnostic.
3. Indicator definitions grow from `COUNTRY_INDICATORS` into a catalogue: source, code, unit/format,
   direction (is higher better? for colouring only, never judging), group (governance, economy,
   climate…), licence/attribution text.
4. Still no table: datasets are public, small (≈ 200 numbers each) and rebuilt from the source.
   If the outage behaviour is not enough, a weekly `delegator-jobs` job can pre-warm them.

### API

- `countryComparison(alpha3Codes: [String!]!, group: String)` → for each indicator of the group:
  values of the asked countries, plus world and region median, the asked countries' rank and
  percentile.
- Committee peers come from what the client already knows (the delegate's committees and their
  nations); the client passes their codes. No new permission: the data is public, the peer list is
  the caller's own.

### UI sketch

Below the World Bank figures, a "Compare" card:

- A **country picker** (search with flags, Germany preselected) and a **tab bar**: _Country_ ·
  _Committee_ · _World & region_.
- _Country_: two columns (your country, the other) per indicator, the better-ranked one not
  highlighted as "better" — MUN is about perspective, the bar just shows the position.
- _Committee_: one indicator at a time (select), the committee's nations as a sorted bar list, your
  country highlighted. Good for spotting likely allies.
- _World & region_: per indicator a strip with all countries as dots, your country, the region
  median and the world median marked, plus "rank 34 of 189".
- Groups as small headings: Governance & democracy, Economy, Society, Climate.
- Every figure with its year and source; the sources line lists the licences used.

## Open questions

1. Which indicators exactly — a short list per group (my suggestion: WGI rule of law, control of
   corruption, voice & accountability; HDI; V-Dem electoral democracy; CO₂ per capita; renewable
   share; military spending % GDP; internet users; Gini).
2. Should the team be able to choose indicators per conference (e.g. climate figures for an
   environment committee), or is one catalogue for everybody enough?
3. Committee peers: all nations seated in any of the delegation's committees, or one committee at a
   time (delegation members sit in different committees)?
4. May we ask Freedom House / RSF / TI for permission, or stay with links?
5. Should the comparison also be reachable outside one's own country (e.g. any country from the
   committee list), which would make it a small country browser?

## Phases

1. Dataset cache + World Bank `all` provider; switch today's figures to it (no UI change).
2. Comparison API + "Country" tab with Germany default and the picker.
3. World & region tab (ranks, medians).
4. Committee tab.
5. Further providers (OWID/V-Dem, UNDP, IMF) behind the catalogue.
