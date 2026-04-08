/**
 * DOCUMENT-TO-QUIZ — QUIZ ENGINE
 * Copy this file verbatim into the quiz output directory.
 * Never regenerate it.
 */
(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  const progressBar = $('#progress-bar');
  const navDots = $$('.nav-dot');
  const sections = $$('.quiz-section, .module');
  const quizLevelButtons = $$('[data-quiz-level-btn]');
  const quizLevelLabels = $$('[data-quiz-level-label]');
  const globalCorrectEls = $$('[data-global-correct]');
  const globalIncorrectEls = $$('[data-global-incorrect]');
  const quizStorageKey = 'document-to-quiz-level';
  let quizLevel = 'medium';

  function updateProgress() {
    if (!progressBar) return;
    const scrollTop = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', Math.round(pct));
    updateNavDots();
  }

  function updateNavDots() {
    const scrollMid = window.scrollY + window.innerHeight / 2;
    sections.forEach((section, i) => {
      const dot = navDots[i];
      if (!dot) return;
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      if (scrollMid >= top && scrollMid < bottom) {
        dot.classList.add('active');
        dot.classList.remove('visited');
      } else if (window.scrollY + window.innerHeight > top) {
        dot.classList.remove('active');
        dot.classList.add('visited');
      } else {
        dot.classList.remove('active', 'visited');
      }
    });
  }

  navDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const target = $('#' + dot.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  function currentSectionIndex() {
    const scrollMid = window.scrollY + window.innerHeight / 2;
    for (let i = 0; i < sections.length; i++) {
      const top = sections[i].offsetTop;
      const bottom = top + sections[i].offsetHeight;
      if (scrollMid >= top && scrollMid < bottom) return i;
    }
    return 0;
  }

  document.addEventListener('keydown', event => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      const next = sections[currentSectionIndex() + 1];
      if (next) {
        next.scrollIntoView({ behavior: 'smooth' });
        event.preventDefault();
      }
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      const prev = sections[currentSectionIndex() - 1];
      if (prev) {
        prev.scrollIntoView({ behavior: 'smooth' });
        event.preventDefault();
      }
    }
  });

  window.addEventListener('scroll', () => requestAnimationFrame(updateProgress), { passive: true });
  updateProgress();

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  $$('.animate-in').forEach(el => revealObserver.observe(el));

  let activeTooltip = null;

  function positionTooltip(term, tip) {
    const rect = term.getBoundingClientRect();
    const tipWidth = Math.min(320, Math.max(200, window.innerWidth * 0.8));
    let left = rect.left + rect.width / 2 - tipWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipWidth - 8));
    tip.style.left = left + 'px';
    tip.style.width = tipWidth + 'px';
    document.body.appendChild(tip);
    const tipHeight = tip.offsetHeight;
    if (rect.top - tipHeight - 12 < 0) {
      tip.style.top = rect.bottom + 8 + 'px';
      tip.classList.add('flip');
    } else {
      tip.style.top = rect.top - tipHeight - 8 + 'px';
      tip.classList.remove('flip');
    }
  }

  function showTooltip(term, tip) {
    if (activeTooltip && activeTooltip !== tip) {
      activeTooltip.classList.remove('visible');
      activeTooltip.remove();
    }
    positionTooltip(term, tip);
    requestAnimationFrame(() => tip.classList.add('visible'));
    activeTooltip = tip;
  }

  function hideTooltip(tip) {
    tip.classList.remove('visible');
    setTimeout(() => {
      if (!tip.classList.contains('visible')) tip.remove();
    }, 150);
    if (activeTooltip === tip) activeTooltip = null;
  }

  $$('.term').forEach(term => {
    const tip = document.createElement('span');
    tip.className = 'term-tooltip';
    tip.textContent = term.dataset.definition;

    term.addEventListener('mouseenter', () => showTooltip(term, tip));
    term.addEventListener('mouseleave', () => hideTooltip(tip));
    term.addEventListener('click', event => {
      event.stopPropagation();
      tip.classList.contains('visible') ? hideTooltip(tip) : showTooltip(term, tip);
    });
  });

  document.addEventListener('click', () => {
    if (activeTooltip) {
      activeTooltip.classList.remove('visible');
      activeTooltip.remove();
      activeTooltip = null;
    }
  });

  function activeQuizScope(container) {
    return $(`.quiz-track[data-quiz-level="${quizLevel}"]`, container)
      || $('.quiz-track.active', container)
      || container;
  }

  function trackStats(scope) {
    let correct = 0;
    let incorrect = 0;
    $$('.quiz-question-block', scope).forEach(block => {
      if (block.dataset.result === 'correct') correct += 1;
      if (block.dataset.result === 'incorrect') incorrect += 1;
    });
    return { correct, incorrect };
  }

  function updateScores() {
    let totalCorrect = 0;
    let totalIncorrect = 0;

    $$('.quiz-container').forEach(container => {
      const scope = activeQuizScope(container);
      const stats = trackStats(scope);
      totalCorrect += stats.correct;
      totalIncorrect += stats.incorrect;

      $$('[data-section-correct]', container).forEach(el => {
        el.textContent = String(stats.correct);
      });
      $$('[data-section-incorrect]', container).forEach(el => {
        el.textContent = String(stats.incorrect);
      });
    });

    globalCorrectEls.forEach(el => { el.textContent = String(totalCorrect); });
    globalIncorrectEls.forEach(el => { el.textContent = String(totalIncorrect); });
  }

  function resetScope(scope) {
    if (!scope) return;
    $$('.quiz-question-block', scope).forEach(block => {
      block.removeAttribute('data-result');
      const feedback = $('.quiz-feedback', block);
      if (feedback) {
        feedback.className = 'quiz-feedback';
        feedback.textContent = '';
      }
      $$('.quiz-option', block).forEach(option => {
        option.classList.remove('selected', 'correct', 'incorrect');
        option.disabled = false;
      });
    });
  }

  function syncQuizLevelUI() {
    quizLevelButtons.forEach(button => {
      const active = button.dataset.quizLevelBtn === quizLevel;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    quizLevelLabels.forEach(label => {
      label.textContent = quizLevel.charAt(0).toUpperCase() + quizLevel.slice(1);
    });

    $$('.quiz-container').forEach(container => {
      const tracks = $$('.quiz-track', container);
      if (tracks.length === 0) return;
      tracks.forEach(track => {
        const active = track.dataset.quizLevel === quizLevel;
        track.classList.toggle('active', active);
        track.hidden = !active;
      });
    });

    updateScores();
  }

  function internalResetAll() {
    $$('.quiz-container').forEach(container => {
      const tracks = $$('.quiz-track', container);
      if (tracks.length === 0) {
        resetScope(container);
      } else {
        tracks.forEach(track => resetScope(track));
      }
    });
    updateScores();
  }

  function setQuizLevel(level, persist) {
    if (!['low', 'medium', 'deep'].includes(level)) return;
    const changed = level !== quizLevel;
    quizLevel = level;
    if (persist) {
      try { window.localStorage.setItem(quizStorageKey, level); } catch (err) {}
    }
    syncQuizLevelUI();
    if (changed) internalResetAll();
  }

  try {
    const savedLevel = window.localStorage.getItem(quizStorageKey);
    if (savedLevel && ['low', 'medium', 'deep'].includes(savedLevel)) {
      quizLevel = savedLevel;
    }
  } catch (err) {}

  quizLevelButtons.forEach(button => {
    button.addEventListener('click', () => setQuizLevel(button.dataset.quizLevelBtn, true));
  });

  window.setQuizLevel = function (level) {
    setQuizLevel(level, true);
  };

  window.selectOption = function (btn) {
    if (!btn || btn.disabled) return;
    const block = btn.closest('.quiz-question-block');
    if (!block || block.dataset.result) return;

    const selectedValue = btn.dataset.value;
    const correctValue = block.dataset.correct;
    const feedback = $('.quiz-feedback', block);
    const options = $$('.quiz-option', block);

    options.forEach(option => { option.disabled = true; });
    btn.classList.add('selected');

    if (selectedValue === correctValue) {
      block.dataset.result = 'correct';
      btn.classList.add('correct');
      if (feedback) {
        feedback.innerHTML = '<strong>Correct.</strong> ' + (block.dataset.explanationRight || '');
        feedback.className = 'quiz-feedback show success';
      }
    } else {
      block.dataset.result = 'incorrect';
      btn.classList.add('incorrect');
      const correctBtn = $(`.quiz-option[data-value="${correctValue}"]`, block);
      if (correctBtn) correctBtn.classList.add('correct');
      if (feedback) {
        feedback.innerHTML = '<strong>Incorrect.</strong> ' + (block.dataset.explanationWrong || '');
        feedback.className = 'quiz-feedback show error';
      }
    }

    updateScores();
  };

  window.checkQuiz = function () {
    updateScores();
  };

  window.resetQuiz = function (containerId) {
    const container = $('#' + containerId);
    if (!container) return;
    const tracks = $$('.quiz-track', container);
    if (tracks.length === 0) {
      resetScope(container);
    } else {
      tracks.forEach(track => resetScope(track));
    }
    updateScores();
  };

  window.resetAllQuizzes = function () {
    internalResetAll();
  };

  syncQuizLevelUI();
})();
