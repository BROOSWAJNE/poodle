import { join } from 'path';
import { readdir } from 'fs/promises';

/**
 * Recursively traverses all files in the given directory, calling the provided `visit` callback for
 * each file.
 */
export async function traverse(
	directory: string,
	visit: (path: string) => Promise<void>,
): Promise<void> {
	const entries = await readdir(directory, { withFileTypes: true });
	await Promise.all(entries.map(async function handleEntry(entry) {
		const file = entry.name;
		const path = join(directory, file);
		if (entry.isDirectory( )) await traverse(path, visit);
		else await visit(path);
	}));
}
