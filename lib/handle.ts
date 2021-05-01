import { join } from 'path';

import {
	RequestContext,
	ServerRequest,
} from './request.js';
import {
	ResponseWriter,
	status,
} from './responses.js';

export type RequestHandler = (context: RequestContext) => Promise<ResponseWriter>;
export type MethodHandlers = Map<string, RequestHandler>;
export type RouteHandlers = Map<string, MethodHandlers>;

export const DEFAULT_STATUS_CODE_NOT_FOUND = 404;
export const DEFAULT_STATUS_CODE_UNCAUGHT = 500;

export const defaultHandlerNotFound: RequestHandler = async (
) => status(DEFAULT_STATUS_CODE_NOT_FOUND);
export const defaultHandlerUncaught: RequestHandler = async (
) => status(DEFAULT_STATUS_CODE_UNCAUGHT);

/** Gets the closest defined 404 handler for the given request. */
export function getHandlerFor404(handlers: RouteHandlers, req: ServerRequest): RequestHandler {
	let root = req.url;
	while (root !== '/') {
		// look for a 404 route handler
		const path = join(root, '404');
		const methods = handlers.get(path);
		const handler = methods?.get(req.method) ?? methods?.get('ALL');
		// if we found a handler then just return it now
		if (handler != null) return handler;
		// otherwise try looking in parent route
		root = join(root, '../');
	}
	// one last try for a root-level handler
	const path = join(root, '404');
	const methods = handlers.get(path);
	const handler = methods?.get(req.method) ?? methods?.get('ALL');
	if (handler != null) return handler;
	// return the default handler if we couldn't find anything
	return defaultHandlerNotFound;
}

/** Gets the closest defined error handler for the given request. */
export function getHandlerForErr(handlers: RouteHandlers, req: ServerRequest): RequestHandler {
	let root = req.url;
	while (root !== '/') {
		// look for an error route handler
		const path = join(root, '500');
		const methods = handlers.get(path);
		const handler = methods?.get(req.method) ?? methods?.get('ALL');
		// if we found a handler then just return it now
		if (handler != null) return handler;
		// otherwise try looking in parent route
		root = join(root, '../');
	}
	// one last try for a root-level handler
	const path = join(root, '500');
	const methods = handlers.get(path);
	const handler = methods?.get(req.method) ?? methods?.get('ALL');
	if (handler != null) return handler;
	// return the default handler if we couldn't find anything
	return defaultHandlerUncaught;
}

/** Gets the appropriate request handler for the given request. */
export function getHandlerForReq(handlers: RouteHandlers, req: ServerRequest): RequestHandler {
	if (!req.url) return defaultHandlerNotFound;
	if (!req.method) return getHandlerFor404(handlers, req);

	const methods = handlers.get(req.url)
		// fallback to directory's index if no exact file match
		?? handlers.get(join(req.url, 'index'));
	if (methods == null) return getHandlerFor404(handlers, req);

	const handler = methods.get(req.method);
	return handler ?? getHandlerFor404(handlers, req);
}

