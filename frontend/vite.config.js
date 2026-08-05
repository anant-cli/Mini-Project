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
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        search: resolve(__dirname, 'search.html'),
        listing: resolve(__dirname, 'listing.html'),
        host: resolve(__dirname, 'host.html'),
        admin: resolve(__dirname, 'admin.html'),
        bookings: resolve(__dirname, 'bookings.html'),
        saved: resolve(__dirname, 'saved.html'),
      }
    }
  }
});
