import {
	Server,
	ServerResponse,
	createServer,
} from 'http';

import {
	DEFAULT_STATUS_CODE_UNCAUGHT,
	RouteHandlers,
	getHandlerForErr,
	getHandlerForReq,
} from './lib/handle.js';
import {
	RequestContextDefault,
	RequestContextGetter,
	ServerRequest,
} from './lib/request.js';

export {
	RequestHandler,
	RouteHandlers,
} from './lib/handle.js';
export {
	RequestContextDefault,
	RequestContextGetter,
	ServerRequest,
} from './lib/request.js';
export {
	RouteType,
	initializeRoutes,
} from './lib/route.js';
export {
	ResponseOptions,
	ResponseWriter,
	file,
	html,
	json,
	status,
	text,
} from './lib/responses.js';

export interface ServeOptions<TRequestContext = RequestContextDefault> {
	/** Gets the request context object which will be passed to request handlers. */
	getRequestContext?: RequestContextGetter<TRequestContext>;
	/** A hook which will be called whenever a request handler throws an error. */
	onErrorHandling?: (context: TRequestContext, error: Error) => void;
	/** A hook which will be called whenever a response writer throws an error. */
	onErrorWriting?: (context: TRequestContext, error: Error) => void;
	/** A hook which will be called whenever a response is fully sent to the user. */
	onResponded?: (context: TRequestContext, response: ServerResponse) => void;
	/** The http server instance to add request-handling to. */
	server?: Server;
}

const getDefaultRequestContext: RequestContextGetter<RequestContextDefault>
	= (request) => ({ request });

/** Adds request handling to an http server for the given poodle route-handlers. */
export function serve(
	routes: RouteHandlers<RequestContextDefault>,
	options?: Omit<ServeOptions<RequestContextDefault>, 'getRequestContext'>,
): Server;
/**
 * Adds request handling to an http server for the given poodle route-handlers with a
 * non-default request context type.
 * The `getRequestContext` argument is therefore required so that the correct request
 * context type can be known.
 */
export function serve<TRequestContext>(
	routes: RouteHandlers<TRequestContext>,
	options: ServeOptions<TRequestContext> & {
		// make this non-optional when TRequestContext is non-default
		getRequestContext: RequestContextGetter<TRequestContext>;
	},
): Server;

export function serve<
	TRequestContext = RequestContextDefault
>(routes: RouteHandlers<TRequestContext>, {
	// @ts-expect-error -- due to type signature of overloads, we will only use this default
	//                     if TRequestContext _is_ the default request context type
	getRequestContext = getDefaultRequestContext,
	onErrorHandling = ( ) => null,
	onErrorWriting = ( ) => null,
	onResponded = ( ) => null,
	server = createServer( ),
}: ServeOptions<TRequestContext> = { }): Server {
	server.on('request', function handleRequest(req: ServerRequest, res: ServerResponse) {

		const context = getRequestContext(req);

		Promise.resolve( ).then(function handleRequest( ) {

			// get the appropriate request handler
			const handler = getHandlerForReq<TRequestContext>(routes, req);
			// and call it to get a response writer
			return handler(context);

		}).catch(function handleHandlerError(err) {

			// if the request handler fails for some reason, first notify
			onErrorHandling(context, err);
			// then get an error handler and call it to get a new reponse writer
			const errorHandler = getHandlerForErr(routes, req);
			return errorHandler(context);

		}).then(function writeResponse(writer) {

			// once we have a response writer, validate it
			if (typeof writer !== 'function') throw new TypeError('Invalid response');
			// then write the response
			return writer(res);

		}).catch(function handleWriteError(err) {

			// if the response writer fails for some reason, first notify
			onErrorWriting(context, err);
			// then attempt to respond with a plain 500 if possible
			// this will fail if the headers have already been written by the original response
			// writer, but at that point there is nothing left to do but die
			res.writeHead(DEFAULT_STATUS_CODE_UNCAUGHT, {
				'Content-Type': 'text/plain',
				'Content-Length': Buffer.byteLength('Internal Server Error'),
			});
			res.end('Internal Server Error');

		}).finally(function handleCompletion( ) {

			// once we've finished dealing with a request, notify
			onResponded(context, res);

		});

	});

	return server;
}
