import { defineConfig } from 'vite'

export default defineConfig({
    // 'base' is key for GitHub Pages. 
    // './' ensures assets are loaded relatively, so it works on:
    // - https://username.github.io/repo-name/
    // - https://username.github.io/
    base: './',
})
