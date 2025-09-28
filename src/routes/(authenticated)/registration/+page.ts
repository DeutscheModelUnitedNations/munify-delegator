import { graphql } from '$houdini';
import type { ConferenceOpenForRegistrationQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query ConferenceOpenForRegistrationQuery($userId: String!, $currentDate: DateTime!) {
		findManyConferences(
			orderBy: [{ startConference: asc }]
			where: { startConference: { gt: $currentDate } }
		) {
			id
			location
			longTitle
			startAssignment
			startConference
			state
			title
			website
			endConference
			imageDataURL
			language
			totalSeats
			totalParticipants
			state
			waitingListLength
		}
		findManyDelegationMembers(where: { userId: { equals: $userId } }) {
			conference {
				id
			}
		}
		findManySingleParticipants(where: { userId: { equals: $userId } }) {
			conference {
				id
			}
		}
		findManyConferenceSupervisors(where: { userId: { equals: $userId } }) {
			conference {
				id
			}
		}
	}
`);

export const _ConferenceOpenForRegistrationQueryVariables: ConferenceOpenForRegistrationQueryVariables =
	async (event) => {
		return {
			userId: (await event.parent()).user.sub,
			currentDate: new Date()
		};
	};
