/**
 * Which files coverage is measured for: the app's own sources under src/, minus the generated
 * code nobody writes tests for - Paraglide's message functions, whose one huge module also makes
 * merging reports crawl, and the rumble client.
 */
const generated = ['/src/lib/paraglide/', '/src/lib/api/rumbleClient/'];

export function isMeasured(absolutePath: string, root: string) {
	return (
		absolutePath.startsWith(`${root}/src/`) &&
		!generated.some((dir) => absolutePath.startsWith(root + dir))
	);
}
