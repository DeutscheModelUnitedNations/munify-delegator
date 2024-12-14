import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

const MESSAGES_DIR = './src/i18n';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

async function askQuestion(query: string): Promise<string> {
	return new Promise((resolve) => rl.question(query, resolve));
	rl.close();
}

async function main() {
	console.log('Enter the translation key:');
	const key = await askQuestion('');

	if (!key) {
		console.error('Key is required');
		process.exit(1);
	}

	const languages = ['en', 'de'];
	const translations: Record<string, string> = {};

	for (const lang of languages) {
		console.log(`Enter the translation for ${lang}:`);
		const translation = await askQuestion('');
		translations[lang] = translation || '';
	}

	for (const lang of languages) {
		const filePath = join(MESSAGES_DIR, `${lang}.json`);
		let content = readFileSync(filePath, 'utf-8');

		const newTranslation = `"${key}": "${translations[lang]}"`;

		// Remove the last curly brace
		content = content.replace(/}$/, '');

		// Remove the last line(s) if they're empty
		content = content.trimEnd();

		// Add a comma to the last line
		content += ',';

		// Add the new translation
		content += `\n\t${newTranslation}`;

		// Add the last curly brace
		content += '\n}';

		writeFileSync(filePath, content);
	}

	console.log('Translations added successfully!');

	// Ask if the user wants to add another translation
	const response = await askQuestion('Do you want to add another translation? (Y/n): ');
	return !(response.toLowerCase() === 'n');
}

let continueLoop = true;
while (continueLoop) {
	try {
		continueLoop = await main();
	} catch (error) {
		console.error('An error occurred:', error);
	}
}

console.log('Exiting...');
process.exit(0);
