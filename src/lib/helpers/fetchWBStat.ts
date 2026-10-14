export default async function fetchWBStat(
	country: string,
	indicator: string
): Promise<number | null> {
	try {
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
			console.warn(`World Bank API returned ${response.status} for ${country}/${indicator}`);
			return null;
		}

		const data = await response.json();
		return extractValue(data);
	} catch (error) {
		// Network errors, CORS issues, etc.
		console.warn(`Failed to fetch World Bank data for ${country}/${indicator}:`, error);
		return null;
	}
}

function extractValue(data: unknown): number | null {
	if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
		return null;
	}

	for (const item of data[1]) {
		if (item && typeof item === 'object' && 'value' in item && item.value !== null) {
			return item.value;
		}
	}
	return null;
}
