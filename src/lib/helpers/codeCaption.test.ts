import { describe, expect, test } from 'vitest';
import { CODE_CAPTION, codeCaptionBaselines, codeCaptionSize, fitsBelowCode } from './codeCaption';
import { defaultLayout, squareInPoints } from './documentLayout';

describe('codeCaptionBaselines', () => {
	test('puts the lines below the code, the first one highest', () => {
		expect(codeCaptionBaselines({ square: { left: 0, bottom: 300, side: 100 }, lines: 2 })).toEqual(
			[294, 286]
		);
	});

	test('puts them above a code that sits right over the page number', () => {
		expect(codeCaptionBaselines({ square: { left: 0, bottom: 40, side: 100 }, lines: 2 })).toEqual([
			152, 144
		]);
	});

	test.each(['contract', 'guardianConsent', 'mediaConsent'] as const)(
		'has room below the code of %s by default',
		(document) => {
			const { bottom } = squareInPoints({
				placement: defaultLayout(document).code,
				width: 595.28,
				height: 841.89
			});
			expect(fitsBelowCode({ bottom, lines: 2 })).toBe(true);
		}
	);
});

describe('codeCaptionSize', () => {
	test('keeps a line that fits, and shrinks a longer one to the width of the code', () => {
		expect(codeCaptionSize({ width: 60, side: 100 })).toBe(CODE_CAPTION.size);
		expect(codeCaptionSize({ width: 125, side: 100 })).toBeCloseTo(5.6);
		expect(codeCaptionSize({ width: 900, side: 100 })).toBe(CODE_CAPTION.smallest);
	});
});
