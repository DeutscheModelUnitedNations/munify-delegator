import { error, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages';
import { fetchTeamAccess } from '#lib/api/teamAccess';
import { verifyCode } from '#api/handlers/signedCode/signedCodeService';
import { openIdLink } from './idLink';
import type { PageServerLoad } from './$types';

const messages = {
	notFound: m.notFound,
	noAccess: m.noAccess,
	malformed: m.scanCodeForged,
	unknownKey: m.scanCodeForged,
	forged: m.scanCodeForged,
	expired: m.scanCodeExpired
};

/** Where a signed code's link leads (`signedCodeLink`): what a phone's camera app opens. */
export const load: PageServerLoad = async ({ params, locals, url }) => {
	const outcome = await openIdLink({
		code: params.code,
		path: url.pathname,
		signedIn: !!locals.oidc,
		accessOf: fetchTeamAccess,
		verify: (code) => verifyCode({ text: code })
	});
	if ('redirect' in outcome) redirect(302, outcome.redirect);
	error(outcome.status, messages[outcome.reason]());
};
