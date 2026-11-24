<script lang="ts">
  import { onMount } from 'svelte';
  import { detectors } from '../../detectors';
  import { getPrefs, prefsFromOptions, savePrefs, ENABLED_SERVICES_REVISION, type Preferences } from '../../lib/storage';

  let prefs: Preferences = $state({
    desiredStatus: {},
    checkIntervalMinutes: 360,
    enabledServices: ['chatgpt', 'claude', 'perplexity'],
    servicesRevision: ENABLED_SERVICES_REVISION,
  });
  let saved = $state(false);

  onMount(async () => {
    prefs = await getPrefs();
  });

  function setEnabled(id: string, enabled: boolean) {
    const selected = new Set(prefs.enabledServices);
    if (enabled) selected.add(id);
    else selected.delete(id);
    prefs.enabledServices = detectors
      .map((detector) => detector.id)
      .filter((serviceId) => selected.has(serviceId));
    if (enabled && prefs.desiredStatus[id] !== 'on' && prefs.desiredStatus[id] !== 'off') {
      prefs.desiredStatus = { ...prefs.desiredStatus, [id]: 'off' };
    }
  }

  function setDesired(id: string, status: 'off' | 'on') {
    prefs.desiredStatus = { ...prefs.desiredStatus, [id]: status };
  }

  function onToggle(id: string, event: Event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    setEnabled(id, input.checked);
  }

  function onDesired(id: string, event: Event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLSelectElement)) return;
    setDesired(id, input.value === 'on' ? 'on' : 'off');
  }

  async function save() {
    await savePrefs(
      prefsFromOptions(
        $state.snapshot(prefs),
        detectors.map((detector) => detector.id),
      ),
    );
    prefs = await getPrefs();
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

  <fieldset>
    <legend>Serviços</legend>
    {#each detectors as detector (detector.id)}
      <div class="service">
        <label>
          <input
            type="checkbox"
            checked={prefs.enabledServices.includes(detector.id)}
            onchange={(event) => onToggle(detector.id, event)}
          />
          {detector.name}
        </label>
        {#if prefs.enabledServices.includes(detector.id)}
          <label class="desired">
            Estado desejado
            <select
              value={prefs.desiredStatus[detector.id] === 'on' ? 'on' : 'off'}
              onchange={(event) => onDesired(detector.id, event)}
            >
              <option value="off">Desligado</option>
              <option value="on">Ligado</option>
            </select>
          </label>
        {/if}
      </div>
    {/each}
  </fieldset>

  <p class="hint">
    Com o estado desligado, cada verificação que lê treinamento ligado gera um aviso. Com ligado, esse aviso não aparece.
  </p>
  {#if prefs.enabledServices.length === 0}
    <p class="hint">Nenhum serviço será verificado.</p>
  {/if}

  <button onclick={save}>Salvar</button>
  {#if saved}<span>Salvo!</span>{/if}
</main>

<style>
  main { max-width: 480px; margin: 40px auto; font-family: system-ui; }
  label { display: block; margin: 16px 0; }
  input[type='number'] { margin-left: 8px; width: 80px; }
  fieldset { border: 1px solid #e2e8f0; border-radius: 6px; margin: 16px 0; padding: 12px 16px; }
  legend { font-weight: 600; }
  .service { margin: 12px 0; }
  .service > label { margin: 0; }
  .desired { margin: 8px 0 0 24px; }
  select { margin-left: 8px; }
  .hint { color: #718096; font-size: 0.85rem; }
  button { background: #3182ce; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
</style>
