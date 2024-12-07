export default async function fetchWBStat(country: string, indicator: string) {
	const url = new URL(
		'https://api.worldbank.org/v2/country/' +
			country +
			'/indicator/' +
			indicator +
			'?format=json&per_page=10'
	);
	url.searchParams.set('format', 'json');
	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error('Failed to fetch data from the World Bank API');
	}
	const data = await response.json();

	return extractValue(data);
}

function extractValue(data: any) {
	for (const item of data[1]) {
		if (item.value !== null) {
			return item.value;
		}
	}
}
