export async function toDataURL(file: File): Promise<string> {
	const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
	console.log(dataUrl.slice(0, 100));
	return dataUrl;
}
