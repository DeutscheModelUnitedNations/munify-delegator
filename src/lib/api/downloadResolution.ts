import { client } from '#lib/api/rumbleClient/client';
import { downloadFromURL } from '#lib/utils/downloadHelpers';

/**
 * Fetches one resolution's PDF and hands it to the browser as a download. Lists never fetch the
 * file itself, which is up to 10 MB a resolution; it is read only when somebody asks for it.
 */
export async function downloadResolution(id: string) {
	const resolution = await client.query.resolution({
		__args: { id },
		title: true,
		file: { url: true, fileName: true }
	});
	await downloadFromURL({
		url: resolution.file.url,
		filename: resolution.file.fileName ?? `${resolution.title}.pdf`
	});
}
