import { detectors } from '../detectors';
import { CHECK_ALARM_NAME, didStatusChange, normalizeCheckInterval } from '../lib/checks';
import { addLog, getPrefs, PREFS_KEY } from '../lib/storage';

export default defineBackground(() => {
  void syncAlarm();

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CHECK_ALARM_NAME) {
      void runChecks();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && PREFS_KEY in changes) {
      void syncAlarm();
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isCheckNowMessage(message)) return;

    void runChecks().then((results) => {
      sendResponse(results);
    });
    return true;
  });
});

function isCheckNowMessage(message: unknown): message is { type: 'CHECK_NOW' } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    (message as { type?: unknown }).type === 'CHECK_NOW'
  );
}

async function syncAlarm(): Promise<void> {
  const prefs = await getPrefs();
  const periodInMinutes = normalizeCheckInterval(prefs.checkIntervalMinutes);
  const existing = await chrome.alarms.get(CHECK_ALARM_NAME);

  if (existing?.periodInMinutes === periodInMinutes) return;

  await chrome.alarms.clear(CHECK_ALARM_NAME);
  await chrome.alarms.create(CHECK_ALARM_NAME, { periodInMinutes });
}

async function runChecks() {
  const prefs = await getPrefs();
  const results = [];

  for (const detector of detectors) {
    if (!prefs.enabledServices.includes(detector.id)) continue;

    try {
      const result = await detector.check();
      const desired = prefs.desiredStatus[detector.id] ?? 'off';
      const changed = didStatusChange(result.status, desired);

      await addLog({
        service: detector.id,
        status: result.status,
        changed,
        detectorVersion: '0.1.0',
      });

      if (changed && result.status === 'on') {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon/128.png',
          title: 'Vigia',
          message: `${detector.name} voltou a treinar com suas conversas. Clique para abrir as configurações.`,
        });
      }

      results.push({ id: detector.id, ...result, changed });
    } catch (err) {
      console.error(`Erro no detector ${detector.id}:`, err);
      results.push({ id: detector.id, status: 'unknown' as const, error: String(err) });
    }
  }

  return results;
}
