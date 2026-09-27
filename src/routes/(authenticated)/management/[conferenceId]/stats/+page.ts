/**
 * The statistics dashboard is client-only: it fetches a large aggregate and renders charts, none
 * of which is useful in the first HTML response. The page itself fetches in its component; this
 * file carries the page option and nothing else.
 */
export const ssr = false;
