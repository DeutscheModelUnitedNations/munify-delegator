import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * The compiler binary. It ships with the `typst` dependency, as the optional package of the
 * platform `bun install` ran on (the image's, since it installs inside the build), so every
 * install has it. It is run directly rather than through the package's `node` wrapper.
 */
function typstBinary() {
	return createRequire(import.meta.url).resolve(
		`@typst-community/typst-${process.platform}-${process.arch}`
	);
}

/**
 * The fonts of the corporate design (Outfit, `#lib/helpers/typstTemplate`), in `typst-fonts/` at
 * the root of the checkout and of the image (`Dockerfile`). Without the folder Typst sets the
 * PDFs in its fallback fonts.
 */
export function typstFontArgs(root: string = process.cwd()): string[] {
	const fonts = join(root, 'typst-fonts');
	return existsSync(fonts) ? ['--font-path', fonts] : [];
}

/** A proxy nothing listens on: every connection through it is refused. */
const DEAD_PROXY = 'http://127.0.0.1:9';

/**
 * The environment a compile runs in. Only `PATH` comes from the server: the compiler never sees
 * the app's secrets. All traffic goes to a dead proxy, so a source importing a `@preview` package
 * the server has not cached fails instead of downloading it (Typst 0.10 has no flag to switch
 * package downloads off).
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

/** Compiles `source` to a PDF in `dir` and returns the PDF's bytes. */
export async function compileTypst({ dir, source }: { dir: string; source: string }) {
	await writeFile(join(dir, 'resolution.typ'), source);
	await execFileAsync(
		typstBinary(),
		['compile', ...typstFontArgs(), 'resolution.typ', 'resolution.pdf'],
		{
			cwd: dir,
			env: compileEnv(process.env.PATH),
			timeout: 30_000
		}
	);
	return readFile(join(dir, 'resolution.pdf'));
}
