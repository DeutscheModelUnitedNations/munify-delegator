import { app } from '../../../api/api';

type RequestHandler = (v: { request: Request }) => Response | Promise<Response>;
export const fallback: RequestHandler = ({ request }) => {
	return app.handle(request);
};
