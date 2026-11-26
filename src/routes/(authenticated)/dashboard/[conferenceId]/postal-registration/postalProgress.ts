import { client } from '#lib/api/rumbleClient/client';
import { logger } from '#lib/logger';

export interface PostalProgressUpdate {
	infoRead?: boolean;
	confirmedDetails?: string;
	confirmedOfAge?: boolean;
}

/**
 * How far somebody is in their postal registration. `recorded` says whether what they do from here
 * on is kept: not while impersonated, and not without a part in the conference.
 */
export async function fetchPostalProgress({
	userId,
	conferenceId
}: {
	userId: string;
	conferenceId: string;
}) {
	const [[participant], user, { isImpersonating }] = await Promise.all([
		client.query.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
			postalInfoRead: true,
			postalConfirmedDetails: true,
			postalConfirmedOfAge: true
		}),
		client.query.user({ __args: { id: userId }, postalGuideCompletedAt: true }),
		client.query.impersonationStatus({ isImpersonating: true })
	]);
	return {
		read: participant?.postalInfoRead ?? false,
		confirmedDetails: participant?.postalConfirmedDetails ?? undefined,
		confirmedOfAge: participant?.postalConfirmedOfAge ?? undefined,
		hintsSeen: user.postalGuideCompletedAt !== null,
		recorded: participant !== undefined && !isImpersonating
	};
}

/** Keeps it. Failing, it is asked again another time, which nobody has to be told. */
export async function savePostalProgress({
	conferenceId,
	progress
}: {
	conferenceId: string;
	progress: PostalProgressUpdate;
}): Promise<void> {
	try {
		await client.mutate.updatePostalProgress({
			__args: { conferenceId, ...progress },
			postalInfoRead: true,
			postalConfirmedDetails: true,
			postalConfirmedOfAge: true
		});
	} catch (error) {
		logger.warn('Keeping the progress of the postal registration failed', error);
	}
}
