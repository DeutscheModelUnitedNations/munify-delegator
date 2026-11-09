import { describe, expect, test, vi } from 'vitest';
import { idTarget, openIdLink } from './idLink';
import {
	parseSignedCode,
	signClaims,
	type SignedCodeCheck,
	type SignedCodeClaims
} from '#lib/signedCode/signedCode';
import { NO_TEAM_ACCESS, type TeamAccess } from '#lib/helpers/teamAccess';

const as = (...roles: TeamAccess['roles']): TeamAccess => ({ isAdmin: false, roles });
const live: Extract<SignedCodeClaims, { kind: 'live' }> = {
	kind: 'live',
	userId: 'alice',
	conferenceId: 'mun',
	issuedAt: 0,
	expiresAt: 1
};
const print: Extract<SignedCodeClaims, { kind: 'print' }> = {
	kind: 'print',
	userId: 'alice',
	conferenceId: 'mun',
	issuedAt: 0
};

describe('idTarget', () => {
	test('participant care opens a nametag on the user card', () => {
		expect(idTarget({ claims: live, code: 'C', access: as('PARTICIPANT_CARE') })).toBe(
			'/dashboard/mun/team/user/alice'
		);
		expect(idTarget({ claims: live, code: 'C', access: { isAdmin: true, roles: [] } })).toBe(
			'/dashboard/mun/team/user/alice'
		);
	});

	test('the rest of the team checks a nametag on the entrance scanner', () => {
		expect(idTarget({ claims: live, code: 'C', access: as('MEMBER') })).toBe(
			'/dashboard/mun/team/attendance?code=C'
		);
	});

	test('the application documents open on the postal registration, for participant care only', () => {
		expect(idTarget({ claims: print, code: 'C', access: as('PARTICIPANT_CARE') })).toBe(
			'/dashboard/mun/team/postal-registration?queryUserId=alice'
		);
		expect(idTarget({ claims: print, code: 'C', access: as('MEMBER') })).toBeNull();
	});

	test('nobody outside the team is sent anywhere', () => {
		expect(idTarget({ claims: live, code: 'C', access: NO_TEAM_ACCESS })).toBeNull();
		expect(idTarget({ claims: print, code: 'C', access: NO_TEAM_ACCESS })).toBeNull();
	});
});

async function sign(claims: SignedCodeClaims) {
	return signClaims({
		claims,
		kid: 1,
		sign: async (bytes) =>
			new Uint8Array(await crypto.subtle.sign('Ed25519', keys.privateKey, bytes))
	});
}

const keys = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);

describe('openIdLink', () => {
	const open = ({
		code,
		signedIn = true,
		access = as('PARTICIPANT_CARE'),
		check = { valid: true } as const
	}: {
		code: string;
		signedIn?: boolean;
		access?: TeamAccess;
		check?: { valid: true } | { valid: false; reason: 'forged' };
	}) => {
		const verify = vi.fn(async (): Promise<SignedCodeCheck> => {
			if (!check.valid) return check;
			const parsed = parseSignedCode(code);
			if (!parsed) throw new Error('unparsable');
			return { valid: true, claims: parsed.claims, code: parsed.code };
		});
		const outcome = openIdLink({
			code,
			path: `/id/${code}`,
			signedIn,
			accessOf: async () => access,
			verify
		});
		return { outcome, verify };
	};

	test('a certificate goes to its public check, signed in or not', async () => {
		const code = await sign({
			kind: 'certificate',
			issuedAt: 0,
			certificate: { n: 'A', t: 'T', s: 0, e: 0 }
		});
		expect(await open({ code, signedIn: false }).outcome).toEqual({
			redirect: `/validateCertificate/${code}`
		});
	});

	test('signed out, any other link asks for a login and checks nothing', async () => {
		const code = await sign(live);
		for (const text of [code, 'garbage']) {
			const { outcome, verify } = open({ code: text, signedIn: false });
			expect(await outcome).toEqual({
				redirect: `/login?${new URLSearchParams({ next: `/id/${text}` })}`
			});
			expect(verify).not.toHaveBeenCalled();
		}
	});

	test('someone the team role does not reach is refused before the code is checked', async () => {
		const { outcome, verify } = open({ code: await sign(print), access: as('MEMBER') });
		expect(await outcome).toEqual({ status: 403, reason: 'noAccess' });
		expect(verify).not.toHaveBeenCalled();
	});

	test('the team is sent to the person, unless the code is not genuine', async () => {
		const code = await sign(live);
		expect(await open({ code }).outcome).toEqual({ redirect: '/dashboard/mun/team/user/alice' });
		expect(await open({ code, check: { valid: false, reason: 'forged' } }).outcome).toEqual({
			status: 400,
			reason: 'forged'
		});
		expect(await open({ code: 'garbage' }).outcome).toEqual({ status: 404, reason: 'notFound' });
	});
});
