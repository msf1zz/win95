import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

function faviconIcoType(): Plugin {
	return {
		name: 'favicon-ico-type',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url?.split('?')[0] === '/favicon.ico') {
					res.setHeader('Content-Type', 'image/x-icon');
				}
				next();
			});
		}
	};
}

export default defineConfig({
	plugins: [faviconIcoType(), sveltekit()]
});
