import type { UserSettings } from '@cf-studio/shared';

export function injectLayoutImprovements(settings: UserSettings) {
  if (document.getElementById('cf-studio-layout-styles')) return;

  const style = document.createElement('style');
  style.id = 'cf-studio-layout-styles';
  
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const darkCss = `
    body { background-color: #1e1e2e !important; color: #cdd6f4 !important; }
    #page { background: transparent !important; border: none !important; box-shadow: none !important; }
    .roundbox, .ttypography, .problem-statement, .sample-tests, .top-pagination, .second-level-menu, .userlist-frame, .datatable { 
      background-color: #181825 !important; 
      border-color: #313244 !important; 
      color: #cdd6f4 !important; 
    }
    .ttypography, .problem-statement { color: #cdd6f4 !important; }
    .problem-statement .header { background: #181825 !important; }
    .problem-statement .input, .problem-statement .output { background: #11111b !important; border-color: #313244 !important; }
    .problem-statement pre { background: #11111b !important; color: #cdd6f4 !important; border: 1px solid #313244 !important; }
    .second-level-menu { background: #181825 !important; border-bottom: 1px solid #313244 !important; }
    .second-level-menu-list li a { color: #a6adc8 !important; }
    .second-level-menu-list li.current a { color: #89b4fa !important; }
    .contest-state-phase { color: #a6e3a1 !important; }
    a { color: #89b4fa !important; }
    a:hover { color: #b4befe !important; }
    input, textarea, select { background-color: #313244 !important; color: #cdd6f4 !important; border-color: #45475a !important; }
    .btn, button { background: #313244 !important; color: #cdd6f4 !important; border: 1px solid #45475a !important; }
    .btn:hover, button:hover { background: #45475a !important; }
    .nav-pills > li > a { color: #a6adc8 !important; }
    .nav-pills > li.active > a { background-color: #313244 !important; color: #89b4fa !important; }
  `;

  const layoutCss = `
    body.cf-studio-active .second-level-menu {
      position: sticky;
      top: 0;
      z-index: 1000;
      transform: translateY(-60%);
      transition: transform 0.2s ease-in-out;
      opacity: 0.9;
    }
    body.cf-studio-active .second-level-menu:hover,
    body.cf-studio-active .second-level-menu.expanded {
      transform: translateY(0);
      opacity: 1;
    }
    body.cf-studio-active .problem-statement {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    body.cf-studio-active .problem-statement .sample-tests {
      max-width: 100%;
    }
    body.cf-studio-active .problem-statement pre {
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 13px;
      padding: 8px;
      border-radius: 4px;
    }
    .cf-studio-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 10px;
      color: white !important;
      vertical-align: middle;
    }
    .cf-studio-tag-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      margin: 2px;
      background: #313244;
      color: #cdd6f4 !important;
      text-decoration: none !important;
    }
    .cf-studio-tag-chip:hover { background: #45475a; }
    .cf-copy-btn {
      cursor: pointer;
      background: #313244;
      color: #cdd6f4;
      border: 1px solid #45475a;
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 11px;
      margin-bottom: 4px;
      display: inline-block;
    }
    .cf-copy-btn:hover { background: #45475a; }
    .cf-solved-check {
      color: #a6e3a1 !important;
      font-weight: bold;
    }
  `;

  style.textContent = isDark ? darkCss + layoutCss : layoutCss;
  document.head.appendChild(style);

  injectCopyButtons();
}

export function injectProblemMeta(contestId: number, index: string, rating: number | null, tags: string[]) {
  const titleEl = document.querySelector('.problem-statement .title') as HTMLElement | null;
  if (!titleEl) return;

  const existingBadge = document.getElementById('cf-studio-rating-badge');
  if (existingBadge) existingBadge.remove();

  if (rating) {
    const badge = document.createElement('span');
    badge.id = 'cf-studio-rating-badge';
    badge.className = 'cf-studio-badge';
    badge.innerText = `${rating}`;
    
    let color = '#6c7086';
    if (rating < 1200) color = '#6c7086';
    else if (rating < 1400) color = '#a6e3a1';
    else if (rating < 1600) color = '#94e2d5';
    else if (rating < 1900) color = '#89b4fa';
    else if (rating < 2100) color = '#cba6f7';
    else if (rating < 2400) color = '#fab387';
    else color = '#f38ba8';
    
    badge.style.backgroundColor = color;
    if (rating < 1200) badge.style.color = '#1e1e2e';
    
    titleEl.appendChild(badge);
  }

  const tagsContainer = document.querySelector('.problem-statement .header') as HTMLElement | null;
  if (tagsContainer) {
    const existingTags = document.getElementById('cf-studio-tags-container');
    if (existingTags) existingTags.remove();
    
    const tagsDiv = document.createElement('div');
    tagsDiv.id = 'cf-studio-tags-container';
    tagsDiv.style.marginTop = '10px';
    
    tags.forEach(tag => {
      const chip = document.createElement('a');
      chip.className = 'cf-studio-tag-chip';
      chip.innerText = tag;
      chip.href = `https://codeforces.com/problemset/tags/${tag}`;
      chip.target = '_blank';
      tagsDiv.appendChild(chip);
    });
    
    tagsContainer.appendChild(tagsDiv);
  }
}

function injectCopyButtons() {
  const blocks = document.querySelectorAll('.sample-test .input, .sample-test .output');
  blocks.forEach((block, i) => {
    if (block.querySelector('.cf-copy-btn')) return;
    const pre = block.querySelector('pre');
    if (!pre) return;

    const btn = document.createElement('div');
    btn.className = 'cf-copy-btn';
    btn.innerText = 'Copy';
    
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(pre.innerText.trim());
      btn.innerText = 'Copied!';
      setTimeout(() => { btn.innerText = 'Copy'; }, 1500);
    });

    block.insertBefore(btn, pre);
  });
}
