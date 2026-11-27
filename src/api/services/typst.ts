import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { TypstBrand, TypstLogo } from '#lib/helpers/typstTemplate';

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
 * The folder of the files the compiler reads besides the source: Outfit (`fonts/`) and DMUN's
 * logos (`logos/`), at the root of the checkout and of the image (`Dockerfile`).
 */
function typstAssetsDir(root: string = process.cwd()) {
	return join(root, 'typst-assets');
}

/**
 * The fonts of the corporate design (Outfit, `#lib/helpers/typstTemplate`). Without the folder
 * Typst sets the PDFs in its fallback fonts.
 */
export function typstFontArgs(root: string = process.cwd()): string[] {
	const fonts = join(typstAssetsDir(root), 'fonts');
	return existsSync(fonts) ? ['--font-path', fonts] : [];
}

/**
 * Copies DMUN's Wort-Bild-Marke of `brand` (colour and white) into `dir`; undefined when the
 * assets are not there.
 */
export async function copyBrandLogo({
	brand,
	dir,
	assets = typstAssetsDir()
}: {
	brand: TypstBrand;
	dir: string;
	assets?: string;
}): Promise<TypstLogo | undefined> {
	const path = `${brand}-lang.svg`;
	const darkPath = `${brand}-lang-darkmode.svg`;
	const source = (name: string) => join(assets, 'logos', name);
	if (!existsSync(source(path)) || !existsSync(source(darkPath))) return undefined;
	await copyFile(source(path), join(dir, path));
	await copyFile(source(darkPath), join(dir, darkPath));
	return { path, darkPath, clearSpace: true };
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
