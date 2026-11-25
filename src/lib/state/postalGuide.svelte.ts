/**
 * The guide to sending the postal documents (`PostalGuide`), which whoever downloads them watches
 * first: `if (!(await passPostalGuide())) return;`. The postal registration page has it as one of
 * its steps; elsewhere `PostalGuideHost` renders it as a dialog.
 */

import { browser } from '$app/env';
import { client } from '#lib/api/rumbleClient/client';
import { logger } from '#lib/logger';
import { getCurrentUser } from './currentUser.svelte.js';

interface PostalGuideStatus {
	/** They watched it to its end before, or are not who it is about (impersonation). */
	skippable: boolean;
	/** Whether watching it to its end is kept on the account. */
	recorded: boolean;
}

interface PostalGuideRequest extends PostalGuideStatus {
	resolve: (passed: boolean) => void;
}

let current = $state.raw<PostalGuideRequest>();

/**
 * Once watched or skipped, nothing asks again until the page is reloaded: a supervisor downloads
 * one student's documents after the other. Only ever set in the browser.
 */
let passed = false;

/** What the guide asks of whoever is signed in. */
export async function fetchPostalGuideStatus(): Promise<PostalGuideStatus> {
	const { sub } = await getCurrentUser();
	const [user, { isImpersonating }] = await Promise.all([
		client.query.user({ __args: { id: sub }, postalGuideCompletedAt: true }),
		client.query.impersonationStatus({ isImpersonating: true })
	]);
	const completed = user.postalGuideCompletedAt !== null;
	return {
		skippable: completed || isImpersonating,
		recorded: !completed && !isImpersonating
	};
}

/**
 * Keeps on the account that the guide was watched to its end, where it is to be kept. Failing, it
 * is watched once more another time.
 */
export async function completePostalGuide({ recorded }: PostalGuideStatus): Promise<void> {
	if (!recorded) return;
	try {
		await client.mutate.completePostalGuide({ postalGuideCompletedAt: true });
	} catch (error) {
		logger.warn('Recording the postal guide as watched failed', error);
	}
}

/** The guide was watched or skipped: no download asks for it until the page is reloaded. */
export function markPostalGuidePassed() {
	if (browser) passed = true;
}

/** The dialog that is asked for. */
export const postalGuide = {
	get current() {
		return current;
	},
	/** Closes the guide: with `true` the download goes on, with `false` it does not. */
	close(goOn: boolean) {
		const request = current;
		current = undefined;
		if (goOn) markPostalGuidePassed();
		request?.resolve(goOn);
	}
};

/** Shows the guide before a download; whether the download may go on. */
export async function passPostalGuide(): Promise<boolean> {
	if (passed) return true;
	const status = await fetchPostalGuideStatus();
	return new Promise<boolean>((resolve) => {
		current?.resolve(false);
		current = { ...status, resolve };
	});
}
