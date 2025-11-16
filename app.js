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

    enhanceShortcodes(contentEl);
    enhanceCallouts(contentEl);
    enhanceQuizzes(contentEl);
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

function enhanceShortcodes(root) {
  // najdi <p>[quiz id="..."]</p>
  const paragraphs = root.querySelectorAll('p');
  paragraphs.forEach(p => {
    const m = p.textContent.trim().match(/^\[quiz\s+id="(.+?)"\]$/);
    if (!m) return;

    const div = document.createElement('div');
    div.setAttribute('data-quiz-id', m[1]);
    div.classList.add('quiz-placeholder');
    p.replaceWith(div);
  });
}

async function enhanceQuizzes(root) {
  const quizPlaceholders = root.querySelectorAll('[data-quiz-id]');

  for (const el of quizPlaceholders) {
    const id = el.dataset.quizId;
    try {
      const res = await fetch(`http://localhost:3003/api/quiz.php?action=load&id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('Quiz not found');
      const quiz = await res.json();
      renderQuiz(el, quiz);
    } catch (err) {
      el.textContent = 'Test se nepodařilo načíst.';
    }
  }
}

function renderQuiz(container, quiz) {
  const form = document.createElement('form');
  form.classList.add('quiz-form');

  quiz.questions.forEach((q, qi) => {
    const block = document.createElement('div');
    block.classList.add('quiz-question');

    const title = document.createElement('p');
    title.textContent = `${qi + 1}. ${q.text}`;
    block.appendChild(title);

    q.options.forEach((opt, oi) => {
      const label = document.createElement('label');
      label.classList.add('quiz-option');

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `q${qi}`;
      input.value = oi;

      label.appendChild(input);
      label.append(` ${opt}`);
      block.appendChild(label);
    });

    form.appendChild(block);
  });

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Vyhodnotit';
  form.appendChild(submit);

  const result = document.createElement('div');
  result.classList.add('quiz-result');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const answers = quiz.questions.map((_, qi) => {
      const selected = form.querySelector(`input[name="q${qi}"]:checked`);
      return selected ? Number(selected.value) : null;
    });

    try {
      const body = JSON.stringify({ id: quiz.id, answers: answers })
      console.log(body)
      const res = await fetch('http://localhost:3003/api/quiz.php?action=grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });
      if (!res.ok) throw new Error('Chyba při odesílání odpovědí');
      const data = await res.json();

      result.textContent = `Výsledek: ${data.score} / ${data.max}`;
    } catch (err) {
      result.textContent = 'Test se nepodařilo vyhodnotit.';
    }
  });

  container.innerHTML = '';
  container.appendChild(form);
  container.appendChild(result);
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