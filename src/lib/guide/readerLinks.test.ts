import { expect, test } from 'vitest';
import { isExternal, readerHref } from './readerLinks';

const pageHref = (pageId: string) => `/guide/${pageId}`;

test('readerHref sends guide links into the app and keeps safe ones', () => {
	expect(readerHref({ href: 'guide:p1', pageHref })).toBe('/guide/p1');
	expect(readerHref({ href: 'https://dmun.de', pageHref })).toBe('https://dmun.de');
	expect(readerHref({ href: 'mailto:team@dmun.de', pageHref })).toBe('mailto:team@dmun.de');
	expect(readerHref({ href: 'javascript:alert(1)', pageHref })).toBeUndefined();
	expect(readerHref({ href: undefined, pageHref })).toBeUndefined();
});

test('isExternal tells the web from the app', () => {
	expect(isExternal('https://dmun.de')).toBe(true);
	expect(isExternal('/guide/p1')).toBe(false);
	expect(isExternal(undefined)).toBe(false);
});
