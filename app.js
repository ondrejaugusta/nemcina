const lessons = [
  {id: 'intro',       title: 'Úvod do učebnice'},
  {id: '1-alphabet',  title: 'Abeceda'},
  {id: '2-substantive', title: 'Podstatná jména'}
]

const lessons_ids = new Set(lessons.map(l => l.id))

const BASE_URL = "https://nemcina.ondrejaugusta.cz"

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
    if (lessons_ids.has(page)) saveProgress(page);
  } catch (err) {
    contentEl.innerHTML = `<p style='margin-top:2rem;margin-bottom:0;font-weight:bold;'>Chyba při načítání stránky: ${err.message}</p>`;
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
      const res = await fetch(`${BASE_URL}/api/quiz/load/${encodeURIComponent(id)}`);
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

  const heading = document.createElement("h3")
  heading.classList.add("quiz-heading")
  heading.textContent = "Kvíz: Otestuj své znalosti"

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
  submit.textContent = 'Vyhodnotit →';
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
      const res = await fetch(`${BASE_URL}/api/quiz/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });
      if (!res.ok) throw new Error('Chyba při odesílání odpovědí');
      const data = await res.json();

      const questions = form.querySelectorAll(".quiz-question > p")
      questions.forEach(q => {
        if (q.classList.contains("wrong")) q.classList.remove("wrong")
      })

      if (data.wrong.length > 0) {
        data.wrong.forEach(i => {
          questions[i].classList.add("wrong")
        })
      }

      result.textContent = `Výsledek: ${data.score} / ${data.max}`;
      if (data.score == data.max) {
        result.classList.add("correct")
      } else if (result.classList.contains("correct")) {
        result.classList.remove("correct")
      }
    } catch (err) {
      if (result.classList.contains("correct")) result.classList.remove("correct")
      result.textContent = 'Test se nepodařilo vyhodnotit.';
    }
  });

  container.innerHTML = '';
  container.appendChild(heading)
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

function setEventListeners() {
  let availableModes = []
  const modeSelectors = document.querySelectorAll("a[data-appearance]")
  for (const a of modeSelectors) {
    availableModes.push(a.getAttribute("data-appearance"))
    a.addEventListener("click", (e) => {
      document.body.className = ""
      document.body.classList.add(e.currentTarget.getAttribute("data-appearance"))

      document.querySelector("a[data-appearance].active").classList.remove("active")
      e.target.classList.add("active")

      setCookie("appearance", e.currentTarget.getAttribute("data-appearance"), 365)
    })
  }

  checkModeCookie(availableModes)
}

function checkModeCookie(availableModes) {
  let c = getCookie("appearance")
  if (c != "" && availableModes.includes(c)) {
    document.body.className = ""
    document.body.classList.add(c)

    document.querySelector("a[data-appearance].active").classList.remove("active")
    document.querySelector(`a[data-appearance='${c}']`).classList.add("active")
  }
}

function progressSaved() {
  const progress = getCookie("progress")
  if (progress && window.location.hash.length == 0) {
    history.pushState(null, null, `#${progress}`);
  }
  return
}
function saveProgress(page) {
  setCookie("progress", page, 365)
}

window.addEventListener('DOMContentLoaded', () => { progressSaved(); loadPage(); setEventListeners() });
window.addEventListener('hashchange', loadPage);

console.log(`Grüß dich! Když už jsi tady, prozkoumej spíš mou normální stránku.

%cOndřej Aleš Augusta
%chttps://ondrejaugusta.cz | hello@ondrejaugusta.cz`, 'font-weight: bold;font-size:1.25rem', 'font-weight: normal;')

// helper functions stolen from W3S https://www.w3schools.com/js/js_cookies.asp
function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

// helper functions moje :3
function scrollToTop() {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth'
  });
}