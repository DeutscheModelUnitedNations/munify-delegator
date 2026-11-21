import { describe, expect, it } from 'vitest';
import { qrStyle } from './qrStyle';

describe('qrStyle', () => {
	it('uses the highest error correction only when an emblem covers part of the code', () => {
		expect(qrStyle({ logoUrl: 'data:image/png;base64,AAAA', corporate: true })).toMatchObject({
			errorCorrectionLevel: 'H',
			logo: 'data:image/png;base64,AAAA'
		});
		expect(qrStyle({ corporate: true })).toMatchObject({
			errorCorrectionLevel: 'M',
			logo: undefined
		});
	});

	it('never leaves the modules to the theme colour', () => {
		for (const corporate of [true, false]) {
			const style = qrStyle({ corporate });
			for (const fill of [style.moduleFill, style.anchorOuterFill, style.anchorInnerFill]) {
				expect(fill).toMatch(/^#[0-9A-F]{6}$/);
			}
		}
	});

	it('draws plain black squares without the emblem when the corporate design is off', () => {
		expect(qrStyle({ logoUrl: 'data:image/png;base64,AAAA', corporate: false })).toEqual({
			shape: 'square',
			errorCorrectionLevel: 'M',
			moduleFill: '#000000',
			anchorOuterFill: '#000000',
			anchorInnerFill: '#000000',
			logo: undefined
		});
	});
});
