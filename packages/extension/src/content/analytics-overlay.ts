import browser from 'webextension-polyfill';
import type { Message, MessageResult, AnalyticsData } from '@cf-studio/shared';

export async function mountAnalyticsOverlay(handle: string) {
  if (document.getElementById('cf-analytics-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'cf-analytics-overlay';
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999999; display:flex; justify-content:center; align-items:center;';
  
  overlay.innerHTML = `
    <div style="width:700px; height:500px; background:#1e1e2e; border-radius:8px; display:flex; flex-direction:column; color:#cdd6f4; padding:24px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:16px;">
        <h2 style="margin:0; color:#89b4fa;">Analytics for ${handle}</h2>
        <button id="cf-an-close" class="cf-studio-btn">Close</button>
      </div>
      <div id="cf-an-loading" style="flex:1; display:flex; align-items:center; justify-content:center; color:#6c7086;">Computing analytics...</div>
      <div id="cf-an-content" style="flex:1; display:none; overflow-y:auto;"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  document.getElementById('cf-an-close')?.addEventListener('click', () => overlay.remove());
  
  const message: Message = {
    id: crypto.randomUUID(),
    type: 'getAnalytics',
    target: 'background',
    source: 'content',
    payload: { handle }
  };
  
  const res = await browser.runtime.sendMessage(message) as MessageResult<AnalyticsData>;
  const loadingEl = document.getElementById('cf-an-loading');
  const contentEl = document.getElementById('cf-an-content');
  
  if (res.ok && res.data && contentEl && loadingEl) {
    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
    
    const { ratingTrend, topicStrength, totalSolved } = res.data;
    
    let weakTagsHtml = '';
    const weakTags = Object.entries(topicStrength)
      .map(([tag, data]) => ({ tag, ...data, ratio: data.attempted > 0 ? data.solved / data.attempted : 1 }))
      .filter(t => t.attempted >= 3 && t.ratio < 0.6)
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 5);
      
    if (weakTags.length === 0) {
      weakTagsHtml = '<div style="color:#a6e3a1;">No significant weak areas detected. Keep practicing!</div>';
    } else {
      weakTagsHtml = weakTags.map(t => `
        <div style="margin-bottom:8px;">
          <div style="font-weight:bold; color:#fab387; text-transform:capitalize;">${t.tag}</div>
          <div style="font-size:12px; color:#6c7086;">Solved: ${t.solved}/${t.attempted} (${(t.ratio * 100).toFixed(0)}%) | Avg Rating: ${t.avgRating || 'N/A'}</div>
        </div>
      `).join('');
    }
    
    let trendHtml = Object.entries(ratingTrend)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([rating, count]) => `<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;"><span style="width:50px; font-size:12px; color:#6c7086;">${rating}</span><div style="height:8px; background:#89b4fa; width:${count * 4}px; border-radius:4px;"></div><span style="font-size:12px;">${count}</span></div>`)
      .join('');
      
    contentEl.innerHTML = `
      <div style="margin-bottom:24px;">
        <h3 style="margin:0 0 8px 0; color:#cdd6f4; font-size:16px;">Total Solved: <span style="color:#a6e3a1;">${totalSolved}</span></h3>
      </div>
      <div style="margin-bottom:24px;">
        <h3 style="margin:0 0 8px 0; color:#cdd6f4; font-size:16px;">Topic Gaps (Needs Work)</h3>
        ${weakTagsHtml}
      </div>
      <div>
        <h3 style="margin:0 0 8px 0; color:#cdd6f4; font-size:16px;">Rating Distribution</h3>
        ${trendHtml || '<div style="color:#6c7086;">No data.</div>'}
      </div>
    `;
  } else if (loadingEl) {
    loadingEl.textContent = 'Failed to load analytics. Are you logged in?';
  }
}
