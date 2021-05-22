import { join } from 'path';

import {
	RequestContextDefault,
	ServerRequest,
} from './request.js';
import {
	ResponseWriter,
	status,
} from './responses.js';

export type RequestHandler<TRequestContext = RequestContextDefault>
	= (context: TRequestContext) => Promise<ResponseWriter>;
export type MethodHandlers<TRequestContext = RequestContextDefault>
	= Map<string, RequestHandler<TRequestContext>>;
export type RouteHandlers<TRequestContext = RequestContextDefault>
	= Map<string, MethodHandlers<TRequestContext>>;

export const DEFAULT_STATUS_CODE_NOT_FOUND = 404;
export const DEFAULT_STATUS_CODE_UNCAUGHT = 500;

export const defaultHandlerNotFound: RequestHandler<unknown>
	= async ( ) => status(DEFAULT_STATUS_CODE_NOT_FOUND);
export const defaultHandlerUncaught: RequestHandler<unknown>
	= async ( ) => status(DEFAULT_STATUS_CODE_UNCAUGHT);

/** Gets the closest defined 404 handler for the given request. */
export function getHandlerFor404<TRequestContext = RequestContextDefault>(
	handlers: RouteHandlers<TRequestContext>,
	request: ServerRequest,
): RequestHandler<TRequestContext> {
	let root = request.url;
	while (root !== '/') {
		// look for a 404 route handler
		const path = join(root, '404');
		const methods = handlers.get(path);
		const handler = methods?.get(request.method) ?? methods?.get('ALL');
		// if we found a handler then just return it now
		if (handler != null) return handler;
		// otherwise try looking in parent route
		root = join(root, '../');
	}
	// one last try for a root-level handler
	const path = join(root, '404');
	const methods = handlers.get(path);
	const handler = methods?.get(request.method) ?? methods?.get('ALL');
	if (handler != null) return handler;
	// return the default handler if we couldn't find anything
	return defaultHandlerNotFound;
}

/** Gets the closest defined error handler for the given request. */
export function getHandlerForErr<TRequestContext = RequestContextDefault>(
	handlers: RouteHandlers<TRequestContext>,
	request: ServerRequest,
): RequestHandler<TRequestContext> {
	let root = request.url;
	while (root !== '/') {
		// look for an error route handler
		const path = join(root, '500');
		const methods = handlers.get(path);
		const handler = methods?.get(request.method) ?? methods?.get('ALL');
		// if we found a handler then just return it now
		if (handler != null) return handler;
		// otherwise try looking in parent route
		root = join(root, '../');
	}
	// one last try for a root-level handler
	const path = join(root, '500');
	const methods = handlers.get(path);
	const handler = methods?.get(request.method) ?? methods?.get('ALL');
	if (handler != null) return handler;
	// return the default handler if we couldn't find anything
	return defaultHandlerUncaught;
}

/** Gets the appropriate request handler for the given request. */
export function getHandlerForReq<TRequestContext = RequestContextDefault>(
	handlers: RouteHandlers<TRequestContext>,
	request: ServerRequest,
): RequestHandler<TRequestContext> {
	if (!request.url) return defaultHandlerNotFound;
	if (!request.method) return getHandlerFor404(handlers, request);

	const methods = handlers.get(request.url)
		// fallback to directory's index if no exact file match
		?? handlers.get(join(request.url, 'index'));
	if (methods == null) return getHandlerFor404(handlers, request);

	const handler = methods.get(request.method);
	return handler ?? getHandlerFor404(handlers, request);
}

