<script lang="ts">
	import { graphql } from '$houdini';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	let conferenceSchoolsQuery = graphql(`
		query ConferenceSchools($conferenceId: String!) {
			findUniqueConference(where: { id: $conferenceId }) {
				id
				schools {
					count
					school
				}
			}
		}
	`);

	$effect(() => {
		if (conferenceId) {
			conferenceSchoolsQuery.fetch({ variables: { conferenceId } });
		}
	});

	const normalizeSchools = graphql(`
		mutation NormalizeSchools(
			$conferenceId: String!
			$schoolsToMerge: [String!]!
			$newSchoolName: String!
		) {
			normalizeSchoolsInConference(
				conferenceId: $conferenceId
				schoolsToMerge: $schoolsToMerge
				newSchoolName: $newSchoolName
			) {
				id
				schools {
					count
					school
				}
			}
		}
	`);
</script>
