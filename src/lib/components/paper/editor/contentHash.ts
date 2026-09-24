import { md5 } from 'hash-wasm';

export const hashEditorContent = async (content: string) => {
	return await md5(content);
};

export const compareEditorContentHash = async (
	content: string | undefined,
	hash: string | undefined
) => {
	if (!content || !hash) {
		return false;
	}
	const contentHash = await hashEditorContent(content);
	return contentHash === hash;
};
