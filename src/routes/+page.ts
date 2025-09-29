import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query ConferencesPreview {
		findManyConferences {
			state
			startAssignment
			location
			title
			id
			startAssignment
			totalSeats
			totalParticipants
			waitingListLength
		}
	}
`);
