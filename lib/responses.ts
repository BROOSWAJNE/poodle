import {
	STATUS_CODES,
	ServerResponse,
} from 'http';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

import { getContentType } from './content-types.js';

const STATUS_CODE_DEFAULT = 200;

/** Standard options to create a response. */
export interface ResponseOptions {
	status?: number;
}
/** A callback which writes the response to the given node `ServerResponse` object. */
export type ResponseWriter = (res: ServerResponse) => Promise<void>;

/** Responds with plain text. */
export const text = (text: string, {
	status = STATUS_CODE_DEFAULT,
}: ResponseOptions = { }): ResponseWriter => async function writeText(res) {
	const size = Buffer.byteLength(text);
	res.statusCode = status;
	res.setHeader('Content-Type', 'text/plain');
	res.setHeader('Content-Length', size);
	res.end(text);
};

/** Responds with the given JSON data. */
export const json = (json: unknown, {
	status = STATUS_CODE_DEFAULT,
}: ResponseOptions = { }): ResponseWriter => async function writeJSON(res) {
	const body = JSON.stringify(json);
	const size = Buffer.byteLength(body);
	res.statusCode = status;
	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Content-Length', size);
	res.end(json);
};

/** Responds with the given html string. */
export const html = (html: string, {
	status = STATUS_CODE_DEFAULT,
}: ResponseOptions = { }): ResponseWriter => async function writeHTML(res) {
	const size = Buffer.byteLength(html);
	res.statusCode = status;
	res.setHeader('Content-Type', 'text/html');
	res.setHeader('Content-Length', size);
	res.end(html);
};

/** Responds with the contents of the file at the given path. */
export const file = (file: string, {
	status = STATUS_CODE_DEFAULT,
}: ResponseOptions = { }): ResponseWriter => async function writeFile(res) {
	const { size } = await stat(file);
	res.statusCode = status;
	res.setHeader('Content-Type', getContentType(file));
	res.setHeader('Content-Length', size);
	createReadStream(file).pipe(res);
};

/** A simple response with the given status code. */
export const status = (
	code: number,
	message: string = STATUS_CODES[ code ] ?? code.toString( ),
): ResponseWriter => async function writeStatus(res) {
	const size = Buffer.byteLength(message);
	res.statusCode = code;
	res.setHeader('Content-Type', 'text/plain');
	res.setHeader('Content-Length', size);
	res.end(message);
};
