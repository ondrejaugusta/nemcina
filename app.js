const lessons = [
  {id: 'intro',       title: 'Úvod do učebnice'},
  {id: '1-alphabet',  title: 'Abeceda'}
]

function getCurrentPage() {
  const hash = window.location.hash.slice(1);
  return hash || 'intro';
}

async function loadPage() {
  const page = getCurrentPage();
  const contentEl = document.getElementById('content');

  try {
    const res = await fetch(`contents/${page}.md`);
    if (!res.ok) throw new Error(`Stránka ${page}.md nebyla nalezena!`);
    const md = await res.text();

    const html = marked.parse(md);
    contentEl.innerHTML = html;

    enhanceCallouts(contentEl);
    renderLessonNav(page);
  } catch (err) {
    contentEl.innerHTML = `<p>Chyba při načítání stránky: ${err.message}</p>`;
    renderLessonNav(null);
  }
}

function enhanceCallouts(root) {
  const blocks = root.querySelectorAll('blockquote');

  blocks.forEach(block => {
    const firstP = block.querySelector('p');
    if (!firstP) return;

    const text = firstP.textContent.trim();
    const match = text.match(/^\[(!NOTE|!INFO|!WARNING)\]\s*(.*)$/m);

    if (!match) return;

    const type = match[1].slice(1).toLowerCase(); // note | info | warning
    const titleText = match[2] || {
      note: 'Poznámka',
      info: 'Informace',
      warning: 'Pozor!'
    }[type];

    firstP.textContent = titleText;

    block.classList.add('callout', `callout-${type}`);
    firstP.classList.add('callout-title');
  });
}

function renderLessonNav(currentId) {
  const navEl = document.getElementById('lesson-nav');
  if (!navEl) return;

  navEl.innerHTML = '';

  if (!currentId) return;

  const index = lessons.findIndex(lesson => lesson.id === currentId);
  if (index === -1) return;

  const prev = lessons[index - 1] || null;
  const next = lessons[index + 1] || null;

  let html = '<div class="lesson-nav-inner">';

  if (prev) {
    html += `
      <a class="lesson-nav-link prev" href="#${prev.id}">
        ← Předchozí: ${prev.title}
      </a>
    `;
  }

  if (next) {
    html += `
      <a class="lesson-nav-link next" href="#${next.id}">
        Další: ${next.title} →
      </a>
    `;
  }

  html += '</div>';
  navEl.innerHTML = html;
}


window.addEventListener('DOMContentLoaded', loadPage);
window.addEventListener('hashchange', loadPage);

console.log(`Grüß dich! Když už jsi tady, prozkoumej spíš mou normální stránku.

%cOndřej Aleš Augusta
%chttps://ondrejaugusta.cz | hello@ondrejaugusta.cz`, 'font-weight: bold;font-size:1.25rem', 'font-weight: normal;')