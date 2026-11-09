import { describe, expect, test, vi } from 'vitest';
import { judgeScan, type ScanAcceptance } from './scanAcceptance';
import type { SignedCodeCheck } from '#lib/signedCode/signedCode';

vi.mock('#lib/api/signedCodeKeys', () => ({ loadSignedCodeKeys: vi.fn() }));

const attendance: ScanAcceptance = { conferenceId: 'mun', kinds: ['live'], printedNametags: true };
const postal: ScanAcceptance = { conferenceId: 'mun', kinds: ['print'], printedNametags: false };

const live = (conferenceId = 'mun'): SignedCodeCheck => ({
	valid: true,
	code: 'CODE',
	claims: { kind: 'live', userId: 'alice', conferenceId, issuedAt: 0, expiresAt: 1 }
});

describe('judgeScan', () => {
	test('a genuine code of its kind and conference leads to its holder', () => {
		expect(
			judgeScan({ text: 'x', format: 'qr_code', check: live(), acceptance: attendance })
		).toEqual({ accepted: true, code: 'CODE', userId: 'alice' });
	});

	test('a code of another kind or conference is refused', () => {
		expect(
			judgeScan({ text: 'x', format: 'qr_code', check: live(), acceptance: postal })
		).toMatchObject({ accepted: false });
		expect(
			judgeScan({ text: 'x', format: 'qr_code', check: live('other'), acceptance: attendance })
		).toMatchObject({ accepted: false });
	});

	test('a certificate is no nametag', () => {
		const certificate: SignedCodeCheck = {
			valid: true,
			code: 'CODE',
			claims: { kind: 'certificate', issuedAt: 0, certificate: { n: 'A', t: 'T', s: 0, e: 0 } }
		};
		expect(
			judgeScan({ text: 'x', format: 'qr_code', check: certificate, acceptance: attendance })
		).toMatchObject({ accepted: false });
	});

	test.each(['forged', 'expired', 'unknownKey', 'malformed'] as const)(
		'a %s code is refused',
		(reason) => {
			expect(
				judgeScan({
					text: 'x',
					format: 'qr_code',
					check: { valid: false, reason },
					acceptance: attendance
				})
			).toMatchObject({ accepted: false });
		}
	);

	test('without the keys nothing signed is taken', () => {
		expect(
			judgeScan({ text: 'x', format: 'qr_code', check: 'noKey', acceptance: attendance })
		).toMatchObject({ accepted: false });
	});

	test('an unsigned QR or Data Matrix code is refused everywhere', () => {
		for (const format of ['qr_code', 'data_matrix']) {
			expect(
				judgeScan({ text: 'alice', format, check: null, acceptance: attendance })
			).toMatchObject({ accepted: false });
		}
	});

	test("a printed nametag's barcode counts only where the scanner takes those", () => {
		expect(
			judgeScan({ text: 'alice', format: 'code_128', check: null, acceptance: attendance })
		).toEqual({ accepted: true, code: 'alice', userId: 'alice' });
		expect(
			judgeScan({ text: 'alice', format: 'code_128', check: null, acceptance: postal })
		).toMatchObject({ accepted: false });
	});

	test('a person picked or typed in by hand is taken as the user id', () => {
		expect(judgeScan({ text: 'alice', format: null, check: null, acceptance: postal })).toEqual({
			accepted: true,
			code: 'alice',
			userId: 'alice'
		});
	});
});
