import { config } from '../../config';
import createClient from 'openapi-fetch';
import type { paths } from './listmonk-paths';

const basicAuth = Buffer.from(`${config.LISTMONK_API_USER}:${config.LISTMONK_API_KEY}`).toString(
	'base64'
);

export const listmonkClient = createClient<paths>({
	baseUrl: config.LISTMONK_API_URL,
	headers: {
		Authorization: `Basic ${basicAuth}`
	}
});
