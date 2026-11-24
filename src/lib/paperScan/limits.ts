/** The largest scan of a page that is taken, in bytes. */
export const MAX_POSTAL_SCAN_SIZE = 40_000_000;

/** The largest file scans come in: one is taken in page by page, so it may be a stack of thousands. */
export const MAX_SCAN_FILE_SIZE = 20_000_000_000;

/** More pages than this are no application documents, whoever scanned them. */
export const MAX_SCAN_PAGES = 20_000;
