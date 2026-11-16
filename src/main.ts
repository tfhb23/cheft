import '@fontsource/vt323/latin.css';
import '@fontsource/vt323/latin-ext.css';
import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/pixelify-sans/latin-ext-600.css';
import './ui/styles.css';
import { installTokens } from './ui/tokens';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/app';

// Design-Tokens (Farben, Schriften, Abstände) vor dem ersten Aufbau der Oberfläche als CSS-Variablen bereitstellen
installTokens();
registerSW({ immediate: true });

const root = document.getElementById('app')!;
new App(root);
