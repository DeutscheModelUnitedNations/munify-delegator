/**
 * The statistics dashboard is client-only: its widgets fetch statistics aggregates and render
 * charts, none of which is useful in the first HTML response. Each widget fetches in its own
 * component; this file carries the page option and nothing else.
 */
export const ssr = false;
