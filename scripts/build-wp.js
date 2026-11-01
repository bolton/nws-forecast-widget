/**
 * Build the WordPress plugin: bundle src/ into one ES module inside the plugin
 * folder, then zip the folder into dist/ ready to upload or submit.
 *
 * The bundle is deliberately not minified. WordPress.org requires readable
 * code in submitted plugins, and it is small either way.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const slug = 'nws-forecast-widget';
const pluginDir = join(root, 'wordpress', slug);
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const pluginVersion = readFileSync(join(pluginDir, `${slug}.php`), 'utf8').match(
	/^\s*\*\s*Version:\s*(\S+)/m
)[1];

await build({
	entryPoints: [join(root, 'src', 'index.js')],
	outfile: join(pluginDir, 'assets', 'js', `${slug}.js`),
	bundle: true,
	format: 'esm',
	target: 'es2022',
	minify: false,
	legalComments: 'none',
	banner: {
		js: `/*! nws-forecast-widget ${pkg.version} | MIT | https://github.com/bolton/nws-forecast-widget */`
	},
	logLevel: 'warning'
});

const zip = join(root, 'dist', `${slug}-${pluginVersion}.zip`);
mkdirSync(dirname(zip), { recursive: true });
rmSync(zip, { force: true });
execFileSync('zip', ['-rqX', zip, slug, '-x', '*.DS_Store'], { cwd: join(root, 'wordpress') });

console.log(`Built ${slug} ${pluginVersion} (widget ${pkg.version}) -> ${zip}`);
