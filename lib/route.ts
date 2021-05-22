import {
	basename,
	dirname,
	extname,
	join,
	relative,
} from 'path';
import { METHODS } from 'http';

import {
	MethodHandlers,
	RouteHandlers,
} from './handle.js';
import { file } from './responses.js';
import { traverse } from './files.js';

/** Different ways a file can be routed by poodle. */
export enum RouteType {
	/** Signifies that the file's contents should be served statically to the client. */
	Static,
	/**
	 * Signifies that the file should be loaded as a JavaScript module, and any exported http method
	 * handlers it provides should be used for dynamic routing.
	 */
	Dynamic,
	/** Signifies that the file should be ignored when routing. */
	Ignored,
}

interface RouteContext {
	directory: string;
	filepath: string;
	routes: RouteHandlers;
	onRouteAdded?: (route: {
		method: string;
		path: string;
	}) => void;
}

const IMPORTABLE_EXTENSIONS = [
	'.cjs',
	'.js',
	'.mjs',
];

function getDefaultRouteType(file: string): RouteType {
	const isHidden = basename(file).startsWith('.');
	if (isHidden) return RouteType.Ignored;

	const isImportable = IMPORTABLE_EXTENSIONS.includes(extname(file));
	return isImportable ? RouteType.Dynamic : RouteType.Static;
}

async function addStaticRoute({
	directory,
	filepath,
	routes,
	onRouteAdded,
}: RouteContext) {
	const path = relative(directory, filepath);

	const route = `/${path}`;
	if (!routes.has(route)) routes.set(route, new Map( ));

	// assertion as guaranteed by previous if statement
	const methods = routes.get(route) as MethodHandlers;
	methods.set('GET', async ( ) => file(filepath));

	if (onRouteAdded) onRouteAdded({ method: 'GET', path: route });
}
async function addDynamicRoute({
	directory,
	filepath,
	routes,
	onRouteAdded,
}: RouteContext) {
	// remove extension from route url
	const name = basename(filepath, extname(filepath));
	const path = relative(directory, dirname(filepath));

	const route = `/${join(path, name)}`;
	if (!routes.has(route)) routes.set(route, new Map( ));

	// assertion as guaranteed by previous if statement
	const methods = routes.get(route) as MethodHandlers;

	const handlers = await import(filepath);
	for (const method in handlers) {
		const isKnown = method === 'ALL' || METHODS.includes(method);
		if (!isKnown) continue;

		const handler = handlers[ method ];
		const isValid = typeof handler === 'function';
		if (!isValid) continue;

		methods.set(method, handler);

		if (onRouteAdded) onRouteAdded({ method: method, path: route });
	}
}

/** Traverses the given directory, and adds routing handlers for all files found. */
export async function initializeRoutes(directory: string, {
	routes = new Map( ),
	getRouteType = getDefaultRouteType,
	onRouteAdded = ( ) => null,
}: {
	/** Route handlers to be appended to. */
	routes?: RouteHandlers;
	/** A callback which identifies the type of routing which a file defines. */
	getRouteType?: (file: string) => RouteType;
	onRouteAdded?: RouteContext['onRouteAdded'];
} = { }): Promise<RouteHandlers> {
	await traverse(directory, async function initializeRoute(filepath) {
		const type = getRouteType(filepath);
		switch (type) {
		case RouteType.Static: return addStaticRoute({
			routes,
			directory,
			filepath,
			onRouteAdded,
		});
		case RouteType.Dynamic: return addDynamicRoute({
			routes,
			directory,
			filepath,
			onRouteAdded,
		});
		case RouteType.Ignored: return Promise.resolve( );
		default: throw new TypeError(`Invalid route type: "${type}"`);
		}
	});
	return routes;
}
