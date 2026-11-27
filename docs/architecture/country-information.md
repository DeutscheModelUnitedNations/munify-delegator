# Country information

What delegates (preparation stage dashboard, "Information on your country") and their supervisors
(**Country information** on a supervised delegation's card, a `Drawer`) see about an assigned
nation. One component, `#lib/components/countryStats/CountryStats.svelte`, in three parts that load
independently, each in its own `<svelte:boundary>` with a skeleton and `LoadError`:

| Part    | Component                          | Data                                                                              |
| ------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| Globe   | `CountryGlobe` → `CountryGlobeMap` | world-countries outlines (`#lib/countryStats/countryShapes`), OpenFreeMap basemap |
| Facts   | `CountryFacts`                     | world-countries (`#lib/countryStats/countryFacts`), bundled, no request           |
| Figures | `CountryIndicatorStats`            | `countryIndicators` query → World Bank, cached by the server                      |

## World Bank figures

- **Which indicators** is the app's choice: `COUNTRY_INDICATORS` in `#lib/countryStats/indicators.ts`
  (code, icon, format). The API serves only these, so it is no open proxy. Labels are messages
  (`countryIndicator…`) keyed by code in the component; formatting is `formatIndicator` (Intl,
  locale-aware short scales, USD, percent).
- **The server fetches** (`#api/handlers/countryIndicator/worldBank.ts`): the most recent non-null
  value of the last ten years and its year, 8 s timeout. `{ value: null }` means "the World Bank has
  none", `undefined` means "it did not answer usably".
- **Cache** (`countryIndicatorService.ts`, `createFigureCache`): Redis (`world-bank:v1:<ALPHA3>:<code>`,
  kept 180 days) when `REDIS_URL` is set, else process memory — the figures are public, nobody's
  data. A figure is fresh for 7 days; after that it is fetched again on the next request. A failed
  fetch serves the stale figure (or none) and is retried after 15 minutes, so an outage neither
  empties the page nor sends every view to the World Bank. Concurrent requests for one figure share
  one fetch. Bump the key's version when the entry shape changes.
- **Who**: anybody signed in (`countryIndicatorPermissions.ts`); no abilities, no table, no pubsub
  (the client reads with a one-shot `client.query`).

## Globe

- MapLibre with `projection: { type: 'globe' }` and the app's OpenFreeMap style (`mapStyle()`).
- Outlines: world-countries ships one GeoJSON file per country (9 MB together, Russia 0.8 MB). Only
  their URLs are bundled (`import.meta.glob(…, { query: '?url', eager: true })`); the browser fetches
  the country's and its neighbours' (`borders`) when the globe shows. A neighbour failing is left
  out; the country failing throws into the boundary's `LoadError`.
- Country filled blue, neighbours gold with their name on hover; countries under 30 000 km² also get
  a dot. Zoom from the area (`zoomForArea`, 1.5–3.5, so the globe stays round). A crosshair control
  flies back to the country.
- `CountryGlobeMap` takes everything as plain props: layers render in the map's children, where an
  awaited `$derived` read never renders (as `stats/widgets/AreaMap.svelte`).

## Facts

From world-countries: capital(s), area, region/subregion (translated by `worldRegions.ts`; a name
the package adds later shows untranslated), landlocked, neighbours with flags, languages and
currencies (`Intl.DisplayNames`, falling back to the package's English names), demonym (English
only — the package has no German ones), calling code (`callingCodeOf`: root + suffix for a single
suffix, the root alone for shared plans like +1 and +7), TLD, ISO codes.

## Next

Comparing countries: `docs/plans/country-comparison.md`.
