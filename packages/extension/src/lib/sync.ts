import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Note, Template } from '@cf-studio/shared';
import { getDB } from './db';

const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

let supabase: SupabaseClient | null = null;
let deviceId = '';

export async function initSync() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    
    deviceId = data.user?.id || '';
    if (!deviceId) throw new Error('No device ID returned');
    
    await pullNotes();
    await pullTemplates();
    
    console.log('[CF Studio] Supabase sync initialized.');
  } catch (err) {
    console.warn('[CF Studio] Supabase sync failed, running local-only.', err);
    supabase = null;
  }
}

export async function pullNotes() {
  if (!supabase) return;
  const { data, error } = await supabase.from('notes').select('*').eq('device_id', deviceId);
  if (error) return;
  
  const db = await getDB();
  for (const n of data as Note[]) {
    await db.put('notes', n);
  }
}

export async function pushNote(note: Note) {
  if (!supabase) return;
  await supabase.from('notes').upsert({ ...note, device_id: deviceId });
}

export async function removeNote(id: string) {
  if (!supabase) return;
  await supabase.from('notes').delete().eq('id', id).eq('device_id', deviceId);
}

export async function pullTemplates() {
  if (!supabase) return;
  const { data, error } = await supabase.from('templates').select('*').eq('device_id', deviceId);
  if (error) return;
  
  const db = await getDB();
  for (const t of data as Template[]) {
    await db.put('templates', t);
  }
}

export async function pushTemplate(template: Template) {
  if (!supabase) return;
  await supabase.from('templates').upsert({ ...template, device_id: deviceId });
}

export async function removeTemplate(id: string) {
  if (!supabase) return;
  await supabase.from('templates').delete().eq('id', id).eq('device_id', deviceId);
}
