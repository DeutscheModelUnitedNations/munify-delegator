import { execFile } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const TYPST_BIN = join(process.cwd(), 'node_modules/.bin/typst');

/** A proxy nothing listens on: every connection through it is refused. */
const DEAD_PROXY = 'http://127.0.0.1:9';

/**
 * The environment a compile runs in. Only `PATH` comes from the server, which the `typst` wrapper
 * needs to find `node`: the compiler never sees the app's secrets. All traffic goes to a dead proxy,
 * so a source importing a `@preview` package the server has not cached fails instead of
 * downloading it (Typst 0.10 has no flag to switch package downloads off).
 */
export function compileEnv(path: string | undefined): Record<string, string> {
	return {
		...(path ? { PATH: path } : {}),
		HTTPS_PROXY: DEAD_PROXY,
		HTTP_PROXY: DEAD_PROXY,
		https_proxy: DEAD_PROXY,
		http_proxy: DEAD_PROXY
	};
}

/** Whether the Typst compiler is installed on this server. */
export async function typstAvailable() {
	try {
		await access(TYPST_BIN);
		return true;
	} catch {
		return false;
	}
}

/** Compiles `source` to a PDF in `dir` and returns the PDF's bytes. */
export async function compileTypst({ dir, source }: { dir: string; source: string }) {
	await writeFile(join(dir, 'resolution.typ'), source);
	await execFileAsync(TYPST_BIN, ['compile', 'resolution.typ', 'resolution.pdf'], {
		cwd: dir,
		env: compileEnv(process.env.PATH),
		timeout: 30_000
	});
	return readFile(join(dir, 'resolution.pdf'));
}
