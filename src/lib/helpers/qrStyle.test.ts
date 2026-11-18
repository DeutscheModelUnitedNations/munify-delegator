import { describe, expect, it } from 'vitest';
import { qrStyle } from './qrStyle';

describe('qrStyle', () => {
	it('uses the highest error correction only when an emblem covers part of the code', () => {
		expect(qrStyle('data:image/png;base64,AAAA')).toMatchObject({
			errorCorrectionLevel: 'H',
			logo: 'data:image/png;base64,AAAA'
		});
		expect(qrStyle()).toMatchObject({ errorCorrectionLevel: 'M', logo: undefined });
	});

	it('never leaves the modules to the theme colour', () => {
		const style = qrStyle();
		for (const fill of [style.moduleFill, style.anchorOuterFill, style.anchorInnerFill]) {
			expect(fill).toMatch(/^#[0-9A-F]{6}$/);
		}
	});
});
