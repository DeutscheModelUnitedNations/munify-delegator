import { readFileSync, writeFileSync } from 'fs';
import inquirer from 'inquirer';
import { join } from 'path';
import * as readline from 'readline';

const MESSAGES_DIR = './messages';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

function saveToTranslationFile(data: Record<string, string>, languages: string[]) {
	for (const lang of languages) {
		const filePath = join(MESSAGES_DIR, `${lang}.json`);
		let content = readFileSync(filePath, 'utf-8');

		const newTranslation = `"${data.key}": "${data[lang]}"`;

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
}

async function singleAdd() {
	const languages = ['de', 'en'];
	const prompts = [
		{
			type: 'input',
			name: 'key',
			message: 'Enter the key:'
		}
	];

	for (const lang of languages) {
		prompts.push({
			type: 'input',
			name: lang,
			message: `Enter the translation for ${lang}:`
		});
	}

	const prompt = inquirer.createPromptModule();
	const data = await prompt(prompts);

	if (!data.key) {
		console.error('Key is required');
		process.exit(1);
	}

	saveToTranslationFile(data, languages);
	console.log('Translations added!');
}

async function bulkAdd() {
	console.log('The translations should be in the following format:');
	console.log('   key;de;en');
	console.log('   key2;de;en');
	console.log('   ...');

	const languages = ['de', 'en'];

	const data = await inquirer.prompt([
		{
			type: 'input',
			name: 'translations',
			message: 'Enter the translations:'
		}
	]);

	for (const line of data.translations.split('\n')) {
		const translations: Record<string, string> = {};
		const [key, ...values] = line.split(';');
		if (!key) {
			console.error('Key is required');
			process.exit(1);
		}

		translations.key = key;

		for (let i = 0; i < languages.length; i++) {
			const lang = languages[i];
			const translation = values[i] || '';
			translations[lang] = translation;
		}

		saveToTranslationFile(translations, languages);
	}
}

async function main() {
	const data = await inquirer.prompt([
		{
			type: 'select',
			name: 'singleOrMultiple',
			message: 'Do you want to add a single translation or multiple translations?',
			choices: ['Single', 'Multiple'],
			default: 'Single'
		}
	]);

	if (data.singleOrMultiple === 'Multiple') {
		await bulkAdd();
	} else {
		await singleAdd();
	}

	// Ask if the user wants to add another translation
	const answer = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'continue',
			message: 'Do you want to add another translation?',
			default: true
		}
	]);

	return answer.continue;
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
