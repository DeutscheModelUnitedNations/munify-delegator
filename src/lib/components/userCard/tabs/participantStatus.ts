import { client, type Mutation } from '#lib/api/rumbleClient/client';
import { genericPromiseToastMessages } from '#lib/utils/toast';
import { toast } from 'svelte-sonner';

/**
 * The person's `conferenceParticipant` row: what the formalities and the conference tab show and
 * change. Both tabs read it on their own; they share the cache record.
 */
export function fetchParticipantStatus(userId: string, conferenceId: string) {
	return client.liveQuery.conferenceParticipants({
		__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
		id: true,
		paymentStatus: true,
		termsAndConditions: true,
		guardianConsent: true,
		mediaConsent: true,
		mediaConsentStatus: true,
		didAttend: true,
		assignedDocumentNumber: true,
		accessCardId: true
	});
}

/**
 * The status row plus the two dates that decide whether a guardian has to consent: the person's
 * birthday and the conference's start.
 */
export async function fetchStatusWithAge(userId: string, conferenceId: string) {
	const [statuses, user, conference] = await Promise.all([
		fetchParticipantStatus(userId, conferenceId),
		client.liveQuery.user({ __args: { id: userId }, id: true, birthday: true }),
		client.liveQuery.conference({ __args: { id: conferenceId }, id: true, startConference: true })
	]);
	return { statuses, user, conference };
}

/** The mutation's own argument type minus the identifying fields `changeParticipantStatus` fills in. */
export type StatusChange = Omit<
	Parameters<Mutation['updateConferenceParticipant']>[0],
	'id' | 'conferenceId' | 'userId'
>;

/** Changes one or more of the person's statuses, creating the row if there is none yet. */
export async function changeParticipantStatus(
	target: { id: string | undefined; conferenceId: string; userId: string },
	input: StatusChange
) {
	const promise = client.mutate.updateConferenceParticipant({
		__args: { ...input, ...target },
		id: true,
		termsAndConditions: true,
		guardianConsent: true,
		mediaConsent: true,
		mediaConsentStatus: true,
		paymentStatus: true,
		didAttend: true,
		assignedDocumentNumber: true,
		accessCardId: true
	});
	toast.promise(promise, genericPromiseToastMessages);
	await promise;
}
