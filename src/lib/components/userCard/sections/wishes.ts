import { splitRole, type ConferenceRoleKind } from '#lib/helpers/conferenceRole.js';

/** One line of `WishList`. */
export interface Wish {
	id: string;
	label: string;
	alpha2Code?: string;
	icon?: string | null;
}

interface RoleApplication {
	id: string;
	rank: number | null;
	role: {
		kind: ConferenceRoleKind;
		name: string | null;
		fontAwesomeIcon: string | null;
		nation: { alpha2Code: string; alpha3Code: string } | null;
	};
}

/**
 * A delegation's wishes in the order it ranked them: a nation by its translated name and flag, a
 * non-state actor by its name and icon.
 */
export function delegationWishes(
	applications: readonly RoleApplication[],
	countryName: (alpha3Code: string) => string
): Wish[] {
	return applications
		.toSorted((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
		.map((application) => {
			const { nation, nonStateActor } = splitRole(application.role);
			if (nation) {
				return {
					id: application.id,
					label: countryName(nation.alpha3Code),
					alpha2Code: nation.alpha2Code
				};
			}
			return {
				id: application.id,
				label: nonStateActor?.name ?? 'N/A',
				icon: nonStateActor?.fontAwesomeIcon
			};
		});
}
