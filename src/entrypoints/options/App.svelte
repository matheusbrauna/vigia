<script lang="ts">
  import { onMount } from 'svelte';
  import { getPrefs, savePrefs, type Preferences } from '../../lib/storage';

  let prefs: Preferences = $state({
    desiredStatus: {},
    checkIntervalMinutes: 360,
    enabledServices: ['chatgpt'],
  });
  let saved = $state(false);

  onMount(async () => {
    prefs = await getPrefs();
  });

  async function save() {
    await savePrefs(prefs);
    saved = true;
    setTimeout(() => (saved = false), 2000);
  }
</script>

<main>
  <h1>Opções do Vigia</h1>

  <label>
    Intervalo de verificação (minutos)
    <input type="number" bind:value={prefs.checkIntervalMinutes} min="30" />
  </label>

  <p><small>Serviços habilitados e estado desejado virão em breve.</small></p>

  <button onclick={save}>Salvar</button>
  {#if saved}<span>Salvo!</span>{/if}
</main>

<style>
  main { max-width: 480px; margin: 40px auto; font-family: system-ui; }
  label { display: block; margin: 16px 0; }
  input { margin-left: 8px; width: 80px; }
  button { background: #3182ce; color: white; border: none; padding: 8px 16px; border-radius: 6px; }
</style>
