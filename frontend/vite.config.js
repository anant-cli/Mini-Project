import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        login: resolve(import.meta.dirname, 'login.html'),
        signup: resolve(import.meta.dirname, 'signup.html'),
        search: resolve(import.meta.dirname, 'search.html'),
        listing: resolve(import.meta.dirname, 'listing.html'),
        host: resolve(import.meta.dirname, 'host.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        account: resolve(import.meta.dirname, 'account.html'),
        bookings: resolve(import.meta.dirname, 'bookings.html'),
        saved: resolve(import.meta.dirname, 'saved.html'),
        about: resolve(import.meta.dirname, 'about.html'),
        terms: resolve(import.meta.dirname, 'terms.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        notFound: resolve(import.meta.dirname, '404.html'),
      }
    }
  }
});
