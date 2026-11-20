import {
	memorySkillFiles,
	SkillsExtension,
	type Skill
} from '@modelcontextprotocol/server/ext/skills';
import { z } from 'zod';
import { logger } from '#lib/logger';

/**
 * Skills the MCP server offers assistants (MCP skills extension, SEP-2640): instructions for whole
 * tasks, such as correcting papers, kept in their own public repositories and read from GitHub,
 * so a change there reaches every assistant without a release. Assistants whose client does not
 * load skills read them with the `read_skill` tool; the server's instructions name them.
 */

/** Where a skill lives: a folder with a `SKILL.md` in a public GitHub repository. */
export interface SkillRepository {
	/** The skill's name, its folder in `skill://<name>/…`; the `name` in its `SKILL.md`. */
	name: string;
	/** `owner/repo` on GitHub. */
	repository: string;
	ref: string;
	/** The skill's folder in the repository. */
	path: string;
}

const SKILL_REPOSITORIES: SkillRepository[] = [
	{
		name: 'papierkorrektur',
		repository: 'DeutscheModelUnitedNations/papierkorrektur-skill',
		ref: 'main',
		path: 'plugins/papierkorrektur/skills/papierkorrektur'
	}
];

/** The instance the skills link to; rewritten to the serving instance's origin. */
export const PRODUCTION_ORIGIN = 'https://delegator.munify.cloud';

/** How long a skill read from GitHub is served before it is read again. */
const MAX_AGE_MS = 60 * 60 * 1000;
/** When a read failed, the next try comes this much sooner. */
const RETRY_AFTER_MS = 5 * 60 * 1000;

/** A GitHub request taking longer fails: the first MCP request waits for it. */
const FETCH_TIMEOUT_MS = 10_000;

/** Files read as text (and their links rewritten); anything else is passed on as bytes. */
const TEXT_FILE = /\.(md|txt|py|json|ya?ml)$/i;

const treeSchema = z.object({
	tree: z.array(z.object({ path: z.string(), type: z.string() })),
	truncated: z.boolean().optional()
});

/** The files of the skill folder `path` in a GitHub tree listing, relative to that folder. */
export function skillFilePaths({
	tree,
	path
}: {
	tree: z.infer<typeof treeSchema>['tree'];
	path: string;
}) {
	const prefix = `${path.replace(/\/+$/, '')}/`;
	return tree
		.filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix))
		.map((entry) => entry.path.slice(prefix.length))
		.sort();
}

/** A skill text with links to the production instance pointing at `origin` instead. */
export function withInstanceLinks({ text, origin }: { text: string; origin: string }) {
	return origin === PRODUCTION_ORIGIN ? text : text.replaceAll(PRODUCTION_ORIGIN, origin);
}

/**
 * Reads one skill's files from GitHub, keyed `<name>/<path>` as a skill catalog wants them. The
 * ref is resolved to one commit first, so the listing and every file come from the same revision,
 * and one deadline (`timeoutMs`) covers the whole read.
 */
export async function fetchSkillFiles({
	skill,
	origin,
	fetch,
	timeoutMs = FETCH_TIMEOUT_MS
}: {
	skill: SkillRepository;
	origin: string;
	fetch: typeof globalThis.fetch;
	timeoutMs?: number;
}) {
	const signal = AbortSignal.timeout(timeoutMs);
	const answer = async ({ url, accept }: { url: string; accept?: string }) => {
		const response = await fetch(url, {
			headers: { 'User-Agent': 'munify-delegator', ...(accept ? { Accept: accept } : {}) },
			signal
		});
		if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${url}`);
		return response;
	};
	const api = `https://api.github.com/repos/${skill.repository}`;
	const commit = (
		await (
			await answer({
				url: `${api}/commits/${encodeURIComponent(skill.ref)}`,
				accept: 'application/vnd.github.sha'
			})
		).text()
	).trim();
	if (!/^[0-9a-f]{40}$/.test(commit)) {
		throw new Error(`${skill.repository}@${skill.ref} did not resolve to a commit`);
	}
	const listing = treeSchema.parse(
		await (await answer({ url: `${api}/git/trees/${commit}?recursive=1` })).json()
	);
	if (listing.truncated) throw new Error(`The file listing of ${skill.repository} is incomplete`);
	const paths = skillFilePaths({ tree: listing.tree, path: skill.path });
	if (!paths.includes('SKILL.md'))
		throw new Error(`${skill.repository} has no ${skill.path}/SKILL.md`);
	const files: Record<string, string | Uint8Array> = {};
	await Promise.all(
		paths.map(async (path) => {
			const response = await answer({
				url: `https://raw.githubusercontent.com/${skill.repository}/${commit}/${skill.path}/${path}`
			});
			files[`${skill.name}/${path}`] = TEXT_FILE.test(path)
				? withInstanceLinks({ text: await response.text(), origin })
				: new Uint8Array(await response.arrayBuffer());
		})
	);
	return files;
}

/**
 * Throws unless `files` make one valid skill named `name`: a `SKILL.md` with frontmatter whose
 * name matches, within the publication limits. Checked before a read replaces the last good copy.
 */
async function assertValidSkill({
	name,
	files
}: {
	name: string;
	files: Record<string, string | Uint8Array>;
}) {
	const catalog = await SkillsExtension.load(memorySkillFiles(files), { strict: true });
	const names = catalog.entries.map((entry) => entry.frontmatter.name);
	if (names.length !== 1 || names[0] !== name) {
		throw new Error(`Expected the one skill ${name}, found: ${names.join(', ') || 'none'}`);
	}
}

/** The skills as served right now: the catalog for the extension and the files for `read_skill`. */
export interface SkillSnapshot {
	catalog: SkillsExtension;
	entries: readonly Skill[];
	files: Readonly<Record<string, string | Uint8Array>>;
}

/**
 * Keeps the skills of `repositories` read from GitHub: the first call waits for them, later ones
 * get what was read last; the first call after the copy went stale starts reading it again in
 * the background. A skill GitHub does not deliver, or delivers broken, keeps its last good copy;
 * one never read is left out.
 */
export function createSkillLibrary({
	repositories,
	origin,
	fetch = globalThis.fetch,
	now = Date.now
}: {
	repositories: SkillRepository[];
	origin: string;
	fetch?: typeof globalThis.fetch;
	now?: () => number;
}) {
	const filesBySkill = new Map<string, Record<string, string | Uint8Array>>();
	let snapshot: SkillSnapshot | undefined;
	let refreshAt = 0;
	let pending: Promise<void> | undefined;

	async function refresh() {
		let failed = false;
		await Promise.all(
			repositories.map(async (skill) => {
				try {
					const files = await fetchSkillFiles({ skill, origin, fetch });
					await assertValidSkill({ name: skill.name, files });
					filesBySkill.set(skill.name, files);
				} catch (error) {
					failed = true;
					logger.warn('Reading an MCP skill from GitHub failed', {
						skill: skill.name,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			})
		);
		const files = Object.assign({}, ...filesBySkill.values());
		const catalog = await SkillsExtension.load(memorySkillFiles(files), {
			onWarning: (warning) => logger.warn('An MCP skill has a problem', warning)
		});
		snapshot = { catalog, entries: catalog.entries, files };
		refreshAt = now() + (failed ? RETRY_AFTER_MS : MAX_AGE_MS);
	}

	return {
		/** The skills to serve; waits only while none were read yet. */
		async current() {
			if (now() >= refreshAt && !pending) {
				pending = refresh()
					.catch((error) => logger.error('Building the MCP skill catalog failed', error))
					.finally(() => {
						pending = undefined;
					});
			}
			if (!snapshot) await pending;
			return snapshot;
		}
	};
}

let library: ReturnType<typeof createSkillLibrary> | undefined;

/** The skills this server offers, with links pointing at `origin` (the server's public origin). */
export function mcpSkills(origin: string) {
	library ??= createSkillLibrary({ repositories: SKILL_REPOSITORIES, origin });
	return library.current();
}

/**
 * What `read_skill` answers: the text of a skill file, or why there is none (naming the skill's
 * files, or the skills, so the assistant can ask again).
 */
export function readSkillFile({
	snapshot,
	skill,
	path
}: {
	snapshot: SkillSnapshot;
	skill: string;
	path: string;
}): { text: string } | { problem: string } {
	const file = snapshot.files[`${skill}/${path.replace(/^\/+/, '')}`];
	if (typeof file === 'string') return { text: file };
	const entry = snapshot.entries.find((candidate) => candidate.frontmatter.name === skill);
	if (!entry) {
		const names = snapshot.entries.map((candidate) => candidate.frontmatter.name);
		return { problem: `There is no skill ${skill}. Skills: ${names.join(', ')}.` };
	}
	const files = Array.isArray(entry.resources)
		? entry.resources.map((resource) => resource.uri.replace(`skill://${skill}/`, ''))
		: [];
	return { problem: `${skill} has no text file ${path}. Its files: ${files.join(', ')}.` };
}

/** The paragraph of the server's instructions naming the skills; empty when there are none. */
export function skillInstructions(entries: readonly Skill[]) {
	if (entries.length === 0) return '';
	const list = entries
		.map((entry) => `- ${entry.frontmatter.name} (${entry.uri}): ${entry.frontmatter.description}`)
		.join('\n');
	return `\n\nSkills: this server offers instructions for whole tasks. When the user's request matches one, use it and say so: load it as an MCP skill, or, where your client does not, read its SKILL.md with read_skill and then the files it points to. Skills you already have installed under the same name are the same instructions.\n${list}`;
}
