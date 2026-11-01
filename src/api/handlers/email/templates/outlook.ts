/**
 * Outlook for Windows draws mails with Word's engine: it ignores `max-width`, padding on links
 * and web fonts it cannot load (falling back to Times New Roman rather than the next font in the
 * stack). These conditional comments - read by Outlook alone - give it what the other clients get
 * from the CSS, the way MJML's output does.
 */

/** The namespaces `outlookHead`'s settings live in. */
export const outlookNamespaces = {
	'xmlns:v': 'urn:schemas-microsoft-com:vml',
	'xmlns:o': 'urn:schemas-microsoft-com:office:office'
};

/** Renders at 96 dpi on scaled screens, and in Arial instead of the web font. */
export const outlookHead =
	'<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>' +
	'<style>table, td, h1, p, a, span, li { font-family: Arial, Helvetica, sans-serif !important; }</style><![endif]-->';

/** A stylesheet only the clients that can load web fonts are given. */
export const webFontLink = (url: string) =>
	`<!--[if !mso]><!--><link rel="stylesheet" href="${url}" /><!--<![endif]-->`;

/** Opens a fixed-width column for Outlook, which ignores the `max-width` inside it. */
export const outlookColumnStart = (width: number) =>
	`<!--[if mso]><table role="presentation" align="center" width="${width}" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->`;

export const outlookColumnEnd = '<!--[if mso]></td></tr></table><![endif]-->';
