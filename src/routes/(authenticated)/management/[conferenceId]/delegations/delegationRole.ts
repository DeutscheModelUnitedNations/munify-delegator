/** The name of the nation or non-state actor a delegation was given, or `N/A`. */
export function assignedRoleName(delegation: {
	assignedNation?: { name: string } | null;
	assignedNonStateActor?: { name: string } | null;
}): string {
	return delegation.assignedNation?.name ?? delegation.assignedNonStateActor?.name ?? 'N/A';
}
