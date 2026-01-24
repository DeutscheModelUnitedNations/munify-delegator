import countries from 'world-countries';

export function getInitials(firstName: string, lastName: string) {
	return `${firstName.charAt(0)}.${lastName.charAt(0)}.`;
}

export function getDelegateLabel(
	user: { given_name: string; family_name: string },
	delegationMember: any,
	singleParticipant: any
) {
	let label = 'Participant';

	if (delegationMember) {
		if (delegationMember.delegation.assignedNation) {
			const nation = countries.find(
				(c) => c.cca3 === delegationMember.delegation.assignedNation?.alpha3Code
			);
			const nationName = nation
				? nation.name.common
				: delegationMember.delegation.assignedNation.alpha3Code;

			label = nationName;
			if (delegationMember.assignedCommittee) {
				label += ` (${delegationMember.assignedCommittee.abbreviation || delegationMember.assignedCommittee.name})`;
			}
		} else if (delegationMember.delegation.assignedNonStateActor) {
			label = delegationMember.delegation.assignedNonStateActor.name;
			const initials = getInitials(user.given_name, user.family_name);
			label += ` (${initials})`;
		}
	} else if (singleParticipant) {
		if (singleParticipant.assignedRole) {
			const initials = getInitials(user.given_name, user.family_name);
			label = `${singleParticipant.assignedRole.name} (${initials})`;
		}
	}
	return label;
}
