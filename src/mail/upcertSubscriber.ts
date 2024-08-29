import Listmonk from './listmonk-sdk/Listmonk';

const write2File = (data: any, filename: string = 'test.json') => {
	const fs = require('fs');
	const path = require('path');
	const filePath = path.join(__dirname, filename);
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
	console.log(`Subscribers written to ${filePath}`);
};

const listmonk = new Listmonk(
	'https://listmonk.tolga.casa',
	'TadeSF',
	'eefotipahng7laideiph3JiushooSh'
);
