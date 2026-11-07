import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import type { Plugin } from 'vite';

// A storefront (src/brand) can bring its own page head: title, description,
// fonts, favicon and theme colour, in src/brands/<id>/head.mjs. Aries is
// index.html as written.
function brandHead(): Plugin {
	const file = process.env.VITE_BRAND && path.resolve(__dirname, `src/brands/${process.env.VITE_BRAND}/head.mjs`);
	const transform = file && fs.existsSync(file) ? import(pathToFileURL(file).href).then((m) => m.default as (html: string) => string) : null;
	return {
		name: 'brand-head',
		async transformIndexHtml(html) {
			return transform ? (await transform)(html) : html;
		},
	};
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	server: {
		host: '::',
		port: 8080,
		hmr: {
			overlay: false,
		},
	},
	plugins: [react(), brandHead()].filter(Boolean),
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
}));
