import { resolve } from '$app/paths';
import { mayOpenTeamRoute, teamRoutes } from '#lib/data/teamRoutes';
import type { TeamAccess } from '#lib/helpers/teamAccess';
import {
	parseSignedCode,
	type SignedCodeCheck,
	type SignedCodeClaims
} from '#lib/signedCode/signedCode';

function mayOpen({ id, access }: { id: string; access: TeamAccess }) {
	const route = teamRoutes.find((entry) => entry.id === id);
	return !!route && mayOpenTeamRoute({ route, access });
}

/**
 * Where a team member who opens a code's link is sent, or `null` when their part in the team
 * does not let them check it:
 * - a digital nametag: the person's user card for participant care, the entrance scanner (which
 *   checks the code again and records nothing without a session) for the rest of the team;
 * - the application documents: the postal registration, opened on the person.
 * Certificates are public and never come here.
 */
export function idTarget({
	claims,
	code,
	access
}: {
	claims: Exclude<SignedCodeClaims, { kind: 'certificate' }>;
	code: string;
	access: TeamAccess;
}): string | null {
	const { conferenceId, userId } = claims;
	if (claims.kind === 'print') {
		if (!mayOpen({ id: 'postalRegistration', access })) return null;
		const path = resolve('/(authenticated)/dashboard/[conferenceId]/team/postal-registration', {
			conferenceId
		});
		return `${path}?${new URLSearchParams({ queryUserId: userId })}`;
	}
	if (mayOpen({ id: 'participants', access })) {
		return resolve('/(authenticated)/dashboard/[conferenceId]/team/user/[userId]', {
			conferenceId,
			userId
		});
	}
	if (!mayOpen({ id: 'attendance', access })) return null;
	const path = resolve('/(authenticated)/dashboard/[conferenceId]/team/attendance', {
		conferenceId
	});
	return `${path}?${new URLSearchParams({ code })}`;
}

/** What opening a code's link comes to: a redirect, or an error page. */
export type IdLinkOutcome =
	| { redirect: string }
	| { status: 400 | 403 | 404; reason: 'notFound' | 'noAccess' | SignedCodeRefusal };

type SignedCodeRefusal = Extract<SignedCodeCheck, { valid: false }>['reason'];

/**
 * What opening the link of `code` does (see `/id/[code]/+page.server.ts`). A certificate goes to its
 * public check. Anything else tells nobody anything, not even whether it is genuine, unless they
 * may check it: without a session the visitor signs in first (`next` brings them back), and a
 * signed-in caller whose part in the conference's team does not reach it gets a 403. Only then is
 * the code checked, and the caller sent to the person's page (`idTarget`).
 */
export async function openIdLink({
	code,
	path,
	signedIn,
	accessOf,
	verify
}: {
	code: string;
	/** The link's own path, to come back to after signing in */
	path: string;
	signedIn: boolean;
	accessOf: (conferenceId: string) => Promise<TeamAccess>;
	verify: (code: string) => Promise<SignedCodeCheck>;
}): Promise<IdLinkOutcome> {
	const parsed = parseSignedCode(code);
	if (parsed?.claims.kind === 'certificate') {
		return { redirect: `/validateCertificate/${parsed.code}` };
	}
	if (!signedIn) return { redirect: `/login?${new URLSearchParams({ next: path })}` };
	if (!parsed) return { status: 404, reason: 'notFound' };

	const { claims } = parsed;
	const target = idTarget({
		claims,
		code: parsed.code,
		access: await accessOf(claims.conferenceId)
	});
	if (!target) return { status: 403, reason: 'noAccess' };

	const checked = await verify(parsed.code);
	return checked.valid ? { redirect: target } : { status: 400, reason: checked.reason };
}
