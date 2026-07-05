import browser from 'webextension-polyfill';
import { RELAY_URL } from '../lib/config';
import type { RunCodeData, RunCodePayload } from '@cf-studio/shared';

const INSTALL_ID_KEY = 'cf_studio_install_id';

async function getInstallId(): Promise<string> {
  const result = await browser.storage.local.get(INSTALL_ID_KEY);
  if (result[INSTALL_ID_KEY]) {
    return result[INSTALL_ID_KEY];
  }
  
  const newId = crypto.randomUUID();
  await browser.storage.local.set({ [INSTALL_ID_KEY]: newId });
  return newId;
}

export async function runCode(payload: RunCodePayload): Promise<RunCodeData> {
  const installId = await getInstallId();
  
  const response = await fetch(`${RELAY_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Install-Id': installId
    },
    body: JSON.stringify({
      code: payload.code,
      stdin: payload.stdin
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as any).error || 'Failed to execute code on relay');
  }

  return data as RunCodeData;
}
