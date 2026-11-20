import { describe, expect, it, vi } from 'vitest';
import { logger } from '#lib/logger';
import {
	createSkillLibrary,
	fetchSkillFiles,
	PRODUCTION_ORIGIN,
	skillFilePaths,
	readSkillFile,
	skillInstructions,
	withInstanceLinks,
	type SkillRepository
} from './skills';

const skill: SkillRepository = {
	name: 'papierkorrektur',
	repository: 'owner/repo',
	ref: 'main',
	path: 'plugins/p/skills/papierkorrektur'
};

const SKILL_MD = `---
name: papierkorrektur
description: Korrigiert Papiere.
---
Link: ${PRODUCTION_ORIGIN}/dashboard/<conferenceId>/paperhub/<paperId>
`;

const COMMIT = 'a'.repeat(40);

/** A GitHub stand-in serving the skill folder (plus files outside it) at `COMMIT`. */
function gitHub(files: Record<string, string> = {}) {
	const content: Record<string, string> = {
		'plugins/p/skills/papierkorrektur/SKILL.md': SKILL_MD,
		'plugins/p/skills/papierkorrektur/references/guide.md': `See ${PRODUCTION_ORIGIN}.`,
		'README.md': 'not part of the skill',
		...files
	};
	return vi.fn(async (input: string | URL | Request) => {
		const url = String(input);
		if (url === 'https://api.github.com/repos/owner/repo/commits/main') {
			return new Response(`${COMMIT}\n`);
		}
		if (url === `https://api.github.com/repos/owner/repo/git/trees/${COMMIT}?recursive=1`) {
			return Response.json({
				tree: [
					...Object.keys(content).map((path) => ({ path, type: 'blob' })),
					{ path: 'plugins/p/skills/papierkorrektur/references', type: 'tree' }
				]
			});
		}
		const prefix = `https://raw.githubusercontent.com/owner/repo/${COMMIT}/`;
		const path = url.startsWith(prefix) ? url.slice(prefix.length) : '';
		return path in content ? new Response(content[path]) : new Response('', { status: 404 });
	});
}

/** Resolves after `ms`, or rejects once `signal` aborts. */
function delay({ ms, signal }: { ms: number; signal: AbortSignal | null | undefined }) {
	return new Promise<void>((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener('abort', () => {
			clearTimeout(timer);
			reject(signal.reason);
		});
	});
}

describe('skillFilePaths', () => {
	it('lists the files in the skill folder, relative to it', () => {
		expect(
			skillFilePaths({
				path: 'a/skill/',
				tree: [
					{ path: 'a/skill/SKILL.md', type: 'blob' },
					{ path: 'a/skill/references', type: 'tree' },
					{ path: 'a/skill/references/x.md', type: 'blob' },
					{ path: 'a/skillful/SKILL.md', type: 'blob' },
					{ path: 'README.md', type: 'blob' }
				]
			})
		).toEqual(['SKILL.md', 'references/x.md']);
	});
});

describe('withInstanceLinks', () => {
	it('points production links at the serving instance', () => {
		expect(
			withInstanceLinks({ text: `${PRODUCTION_ORIGIN}/a`, origin: 'https://localhost:5173' })
		).toBe('https://localhost:5173/a');
	});

	it('leaves the text alone on production', () => {
		expect(withInstanceLinks({ text: `${PRODUCTION_ORIGIN}/a`, origin: PRODUCTION_ORIGIN })).toBe(
			`${PRODUCTION_ORIGIN}/a`
		);
	});
});

describe('fetchSkillFiles', () => {
	it('reads the skill folder, keyed by skill name, with links to the instance', async () => {
		const files = await fetchSkillFiles({
			skill,
			origin: 'https://staging.example',
			fetch: gitHub()
		});
		expect(Object.keys(files).sort()).toEqual([
			'papierkorrektur/SKILL.md',
			'papierkorrektur/references/guide.md'
		]);
		expect(files['papierkorrektur/references/guide.md']).toBe('See https://staging.example.');
	});

	it('keeps files that are not text as bytes', async () => {
		const files = await fetchSkillFiles({
			skill,
			origin: PRODUCTION_ORIGIN,
			fetch: gitHub({ 'plugins/p/skills/papierkorrektur/assets/logo.png': 'png' })
		});
		expect(files['papierkorrektur/assets/logo.png']).toBeInstanceOf(Uint8Array);
	});

	it('fails without a SKILL.md', async () => {
		await expect(
			fetchSkillFiles({ skill: { ...skill, path: 'elsewhere' }, origin: '', fetch: gitHub() })
		).rejects.toThrow('SKILL.md');
	});

	it('reads the listing and every file at the commit the ref resolved to', async () => {
		const fetch = gitHub();
		await fetchSkillFiles({ skill, origin: PRODUCTION_ORIGIN, fetch });
		const urls = fetch.mock.calls.map(([url]) => String(url));
		expect(urls[0]).toBe('https://api.github.com/repos/owner/repo/commits/main');
		expect(urls.slice(1).every((url) => url.includes(COMMIT))).toBe(true);
	});

	it('fails when the ref does not resolve to a commit', async () => {
		const fetch = vi.fn(async () => new Response('not a sha'));
		await expect(fetchSkillFiles({ skill, origin: '', fetch })).rejects.toThrow(
			'did not resolve to a commit'
		);
	});

	it('gives the whole read one deadline', async () => {
		const files = gitHub();
		const fetch = vi.fn(
			async (input: string | URL | Request, init?: Parameters<typeof globalThis.fetch>[1]) => {
				await delay({ ms: 40, signal: init?.signal });
				return files(input);
			}
		);
		// Each request alone stays under the deadline; the three steps together do not.
		await expect(fetchSkillFiles({ skill, origin: '', fetch, timeoutMs: 100 })).rejects.toThrow();
	});

	it('fails when GitHub refuses', async () => {
		const fetch = vi.fn(async () => new Response('', { status: 403 }));
		await expect(fetchSkillFiles({ skill, origin: '', fetch })).rejects.toThrow('403');
	});
});

describe('createSkillLibrary', () => {
	it('serves the skills as an MCP skill catalog', async () => {
		const library = createSkillLibrary({
			repositories: [skill],
			origin: PRODUCTION_ORIGIN,
			fetch: gitHub()
		});
		const snapshot = await library.current();
		expect(snapshot?.entries.map((entry) => entry.uri)).toEqual([
			'skill://papierkorrektur/SKILL.md'
		]);
		expect(snapshot?.entries[0]?.frontmatter.description).toBe('Korrigiert Papiere.');
		if (!snapshot) throw new Error('no skills');
		expect(readSkillFile({ snapshot, skill: 'papierkorrektur', path: 'SKILL.md' })).toEqual({
			text: SKILL_MD
		});
		expect(readSkillFile({ snapshot, skill: 'papierkorrektur', path: '/SKILL.md' })).toEqual({
			text: SKILL_MD
		});
		expect(readSkillFile({ snapshot, skill: 'papierkorrektur', path: 'missing.md' })).toEqual({
			problem:
				'papierkorrektur has no text file missing.md. Its files: SKILL.md, references/guide.md.'
		});
		expect(readSkillFile({ snapshot, skill: 'other', path: 'SKILL.md' })).toEqual({
			problem: 'There is no skill other. Skills: papierkorrektur.'
		});
	});

	it('reads GitHub once while the copy is fresh, and again once it is stale', async () => {
		let time = 0;
		const fetch = gitHub();
		const library = createSkillLibrary({
			repositories: [skill],
			origin: PRODUCTION_ORIGIN,
			fetch,
			now: () => time
		});
		await library.current();
		const calls = fetch.mock.calls.length;
		await library.current();
		expect(fetch.mock.calls.length).toBe(calls);
		time += 2 * 60 * 60 * 1000;
		await library.current();
		await vi.waitFor(() => expect(fetch.mock.calls.length).toBe(2 * calls));
	});

	it('keeps the last good copy when GitHub fails', async () => {
		let time = 0;
		let down = false;
		const working = gitHub();
		const fetch = vi.fn(async (input: string | URL | Request) =>
			down ? new Response('', { status: 503 }) : working(input)
		);
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const library = createSkillLibrary({
			repositories: [skill],
			origin: PRODUCTION_ORIGIN,
			fetch,
			now: () => time
		});
		await library.current();
		down = true;
		time += 2 * 60 * 60 * 1000;
		await library.current();
		await vi.waitFor(() => expect(warn).toHaveBeenCalled());
		expect((await library.current())?.entries).toHaveLength(1);
		warn.mockRestore();
	});

	it('keeps the last good copy when the new one is broken', async () => {
		let time = 0;
		let broken = false;
		const good = gitHub();
		const bad = gitHub({ 'plugins/p/skills/papierkorrektur/SKILL.md': 'no frontmatter' });
		const fetch = vi.fn(async (input: string | URL | Request) =>
			broken ? bad(input) : good(input)
		);
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const library = createSkillLibrary({
			repositories: [skill],
			origin: PRODUCTION_ORIGIN,
			fetch,
			now: () => time
		});
		await library.current();
		broken = true;
		time += 2 * 60 * 60 * 1000;
		await library.current();
		await vi.waitFor(() => expect(warn).toHaveBeenCalled());
		const snapshot = await library.current();
		if (!snapshot) throw new Error('no skills');
		expect(readSkillFile({ snapshot, skill: 'papierkorrektur', path: 'SKILL.md' })).toEqual({
			text: SKILL_MD
		});
		warn.mockRestore();
	});

	it('serves no skills when none could be read', async () => {
		const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const library = createSkillLibrary({
			repositories: [skill],
			origin: PRODUCTION_ORIGIN,
			fetch: vi.fn(async () => new Response('', { status: 404 }))
		});
		expect((await library.current())?.entries).toEqual([]);
		warn.mockRestore();
	});
});

describe('skillInstructions', () => {
	it('says nothing without skills', () => {
		expect(skillInstructions([])).toBe('');
	});

	it('names each skill with its URI and description', () => {
		const text = skillInstructions([
			{
				uri: 'skill://papierkorrektur/SKILL.md',
				frontmatter: { name: 'papierkorrektur', description: 'Korrigiert Papiere.' },
				resources: []
			}
		]);
		expect(text).toContain('read_skill');
		expect(text).toContain(
			'- papierkorrektur (skill://papierkorrektur/SKILL.md): Korrigiert Papiere.'
		);
	});
});
