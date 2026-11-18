/**
 * Rendered in the browser only. The resolution editor works on `resolutionStore`, a module-level
 * store: on the server every request shares it, and the page's own effects (the committee name,
 * the draft from localStorage) never run there, so the server's HTML did not match the browser's.
 * Hydrating it failed, and every full load of this page showed an error instead of the editor.
 */
export const ssr = false;
