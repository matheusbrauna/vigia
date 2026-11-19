import { defineConfig } from 'wxt';

const icons = {
  16: '/icon/16.png',
  32: '/icon/32.png',
  48: '/icon/48.png',
  128: '/icon/128.png',
};

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Vigia',
    description: 'Avisa quando uma ferramenta de IA volta a treinar com as suas conversas',
    permissions: ['storage', 'alarms', 'notifications'],
    optional_host_permissions: [
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://www.perplexity.ai/*',
      'https://myactivity.google.com/*',
      'https://x.com/*',
    ],
    icons,
    action: {
      default_title: 'Vigia',
      default_icon: icons,
    },
  },
});
