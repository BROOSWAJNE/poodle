import { extname } from 'path';

export const DEFAULT_CONTENT_TYPE = 'application/octet-stream';
export const CONTENT_TYPES: Record<string, string | undefined> = {
	'.css': 'text/css',
	'.html': 'text/html',
	'.js': 'application/javascript',
};

/** Given a filename/path, returns its associated content type based on extension. */
export const getContentType = (
	file: string,
): string => CONTENT_TYPES[ extname(file) ] ?? DEFAULT_CONTENT_TYPE;
