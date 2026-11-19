<script lang="ts">
  import { onMount } from 'svelte';
  import { CHATGPT_HOST_PERMISSION } from '../../detectors/chatgpt-parse';
  import type { Status } from '../../detectors/types';

  interface CheckResult {
    id: string;
    status: Status;
    changed?: boolean;
    message?: string;
  }

  let results: CheckResult[] = $state([]);
  let loading = $state(false);
  let lastCheck = $state<number | null>(null);
  let hostGranted = $state(false);

  const chatgptOrigin = { origins: [CHATGPT_HOST_PERMISSION] };

  async function refreshPermission() {
    hostGranted = await chrome.permissions.contains(chatgptOrigin);
  }

  async function grantChatGpt() {
    hostGranted = await chrome.permissions.request(chatgptOrigin);
    if (hostGranted) await checkNow();
  }

  async function checkNow() {
    loading = true;
    try {
      const res = await chrome.runtime.sendMessage({ type: 'CHECK_NOW' });
      results = res || [];
      lastCheck = Date.now();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function statusLabel(status: Status) {
    switch (status) {
      case 'on': return 'Treinando';
      case 'off': return 'Opt-out ativo';
      case 'not-logged-in': return 'Não logado';
      default: return 'Desconhecido';
    }
  }

  function statusColor(status: Status) {
    if (status === 'on') return '#e53e3e';
    if (status === 'off') return '#38a169';
    return '#718096';
  }

  onMount(() => {
    void refreshPermission();
    void checkNow();

    const onPermissionChange = () => {
      void refreshPermission();
    };
    chrome.permissions.onAdded.addListener(onPermissionChange);
    chrome.permissions.onRemoved.addListener(onPermissionChange);
    return () => {
      chrome.permissions.onAdded.removeListener(onPermissionChange);
      chrome.permissions.onRemoved.removeListener(onPermissionChange);
    };
  });
</script>

<main>
  <h1>Vigia</h1>
  <p class="subtitle">Monitora se as IAs voltaram a treinar com suas conversas</p>

  {#if !hostGranted}
    <button class="secondary" onclick={grantChatGpt}>Permitir leitura do ChatGPT</button>
    <p class="hint">O acesso a chatgpt.com é opcional e serve só para ler se o treinamento está ligado.</p>
  {/if}

  <button onclick={checkNow} disabled={loading}>
    {loading ? 'Verificando...' : 'Verificar agora'}
  </button>

  {#if lastCheck}
    <small>Última verificação: {new Date(lastCheck).toLocaleTimeString()}</small>
  {/if}

  <ul>
    {#each results as r}
      <li>
        <strong>{r.id === 'chatgpt' ? 'ChatGPT' : r.id}</strong>
        <span style="color: {statusColor(r.status)}">{statusLabel(r.status)}</span>
        {#if r.changed}
          <span class="alert">mudou!</span>
        {/if}
        {#if r.message}
          <small>{r.message}</small>
        {/if}
      </li>
    {/each}
  </ul>

  {#if results.length === 0 && !loading}
    <p>Nenhum serviço habilitado ou ainda sem dados.</p>
  {/if}
</main>

<style>
  main {
    width: 320px;
    padding: 16px;
    font-family: system-ui, sans-serif;
  }
  h1 { margin: 0 0 4px; font-size: 1.4rem; }
  .subtitle { margin: 0 0 12px; color: #666; font-size: 0.85rem; }
  button {
    background: #3182ce;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
  }
  button:disabled { opacity: 0.6; }
  button.secondary {
    display: block;
    width: 100%;
    margin-bottom: 8px;
    background: white;
    color: #3182ce;
    border: 1px solid #3182ce;
  }
  .hint { margin: 0 0 12px; color: #718096; font-size: 0.75rem; }
  ul { list-style: none; padding: 0; margin: 12px 0 0; }
  li { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 2px; }
  .alert { color: #e53e3e; font-weight: bold; font-size: 0.8rem; }
  small { color: #888; font-size: 0.75rem; }
</style>
