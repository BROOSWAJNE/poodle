import {
	Server,
	ServerResponse,
} from 'http';

import {
	DEFAULT_STATUS_CODE_UNCAUGHT,
	RouteHandlers,
	getHandlerForErr,
	getHandlerForReq,
} from './lib/handle.js';
import { ServerRequest } from './lib/request.js';

export {
	RequestHandler,
	RouteHandlers,
} from './lib/handle.js';
export {
	RequestContext,
	ServerRequest,
} from './lib/request.js';
export {
	RouteType,
	initializeRoutes,
} from './lib/route.js';

/**
 * Given some route handlers and a http(s) server instance, adds a `request` event handler to
 * the server which handles requests according to the defined route handlers.
 */
export function serve(routes: RouteHandlers, server: Server): void {
	server.on('request', function handleRequest(req: ServerRequest, res: ServerResponse) {
		const handler = getHandlerForReq(routes, req);
		const context = {
			request: req,
			logger: undefined,
		};
		Promise.resolve( ).then(( ) => handler(context)).catch(function handleHandlerError(err) {
			console.error('Error handling request', err);
			const errorHandler = getHandlerForErr(routes, req);
			return errorHandler(context);
		}).then(function writeResponse(writer) {
			if (typeof writer !== 'function') throw new TypeError('Invalid response');
			return writer(res);
		}).catch(function handleWriteError(err) {
			console.error('Error writing response', err);
			// attempt to 500 if possible, will fail if headers have been written
			// already but at that point nothing left to do but die
			res.writeHead(DEFAULT_STATUS_CODE_UNCAUGHT, {
				'Content-Type': 'text/plain',
				'Content-Length': Buffer.byteLength('Internal Server Error'),
			});
			res.end('Internal Server Error');
		});
	});
}
