import { defineConfig } from 'vite';

export default defineConfig({
    base: '/Snout-Apps-Website',
    build: {
        rollupOptions: {
            input: {
                main: 'src/todo/index.html',
                chatbot: 'src/chatbot/index.html',
            }
        }
    }
});