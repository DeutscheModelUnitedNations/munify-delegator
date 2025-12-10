import { md5 } from 'hash-wasm';

export const hashEditorContent = async (content: string) => {
	console.log('Hashing content:', content);
	console.log('Content length:', await md5(content));
	return await md5(content);
};

export const compareEditorContentHash = async (content: string, hash: string) => {
	const contentHash = await hashEditorContent(content);
	return contentHash === hash;
};
