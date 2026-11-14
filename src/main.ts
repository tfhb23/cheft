import '@fontsource/vt323/latin.css';
import '@fontsource/vt323/latin-ext.css';
import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/pixelify-sans/latin-ext-600.css';
import './ui/styles.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/app';

registerSW({ immediate: true });

const root = document.getElementById('app')!;
new App(root);
