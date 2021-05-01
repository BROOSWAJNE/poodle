import { IncomingMessage } from 'http';

// see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/15808
export interface ServerRequest {
	aborted: IncomingMessage['aborted'];
	headers: IncomingMessage['headers'];
	trailers: IncomingMessage['trailers'];
	url: string;
	method: string;
}
export interface RequestContext {
	request: ServerRequest;
	logger: void;
}
