export default function formatNames(
	given_name: string | undefined,
	family_name: string | undefined
): string {
	if (!given_name) return family_name?.toUpperCase() || 'unknown name';
	if (!family_name) return given_name;
	const given_names = given_name.split(' ');
	const formatted_given_name = given_names
		.map((name) => name.charAt(0).toUpperCase() + name.slice(1))
		.join(' ');
	return `${formatted_given_name} ${family_name.toUpperCase()}`;
}

export function formatInitials(
	given_name: string | undefined,
	family_name: string | undefined
): string {
	if (!given_name) return family_name?.toUpperCase() || '--';
	if (!family_name) return given_name.charAt(0).toUpperCase();
	return `${given_name.charAt(0).toUpperCase()}${family_name.charAt(0).toUpperCase()}`;
}
