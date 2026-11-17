(() => {
  const homePage = document.querySelector('.page-home');
  const casePage = document.querySelector('.page-case');
  const spamCard = document.querySelector('[data-project="spam"]');
  const returnControls = document.querySelectorAll('[data-return]');
  let homeScrollY = 0;
  let transitioning = false;

  async function restoreSplitAssets() {
    const images = [...document.querySelectorAll('img[data-part-prefix]')];
    await Promise.all(images.map(async image => {
      const prefix = image.dataset.partPrefix;
      const count = Number(image.dataset.partCount);
      const parts = await Promise.all(Array.from({ length: count }, (_, index) =>
        fetch(`${prefix}${String(index).padStart(2, '0')}`).then(response => {
          if (!response.ok) throw new Error(`Asset part unavailable: ${response.url}`);
          return response.blob();
        })
      ));
      image.src = URL.createObjectURL(new Blob(parts, { type: 'image/png' }));
    }));
  }

  function activatePage(nextPage) {
    homePage.hidden = nextPage !== 'home';
    casePage.hidden = nextPage !== 'case';
    document.body.classList.toggle('is-case', nextPage === 'case');
    history.replaceState(null, '', nextPage === 'case' ? '#case-summary' : '#home');
    window.scrollTo({ top: nextPage === 'case' ? 0 : homeScrollY, behavior: 'instant' });
    requestAnimationFrame(bindVisibleAnchors);
  }

  function transitionTo(nextPage) {
    if (transitioning) return;
    transitioning = true;
    if (nextPage === 'case') homeScrollY = window.scrollY;

    const swap = () => activatePage(nextPage);
    if (document.startViewTransition) {
      const transition = document.startViewTransition(swap);
      transition.finished.finally(() => { transitioning = false; });
    } else {
      document.documentElement.classList.add('is-transitioning');
      swap();
      window.setTimeout(() => {
        document.documentElement.classList.remove('is-transitioning');
        transitioning = false;
      }, 420);
    }
  }

  function bindVisibleAnchors() {
    const links = [...document.querySelectorAll('.case-nav a[href^="#"]')];
    const targets = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${visible.target.id}`));
    }, { rootMargin: '-22% 0px -62% 0px', threshold: [0, .1, .35] });
    targets.forEach(target => observer.observe(target));
  }

  spamCard.addEventListener('click', () => transitionTo('case'));
  spamCard.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      transitionTo('case');
    }
  });
  returnControls.forEach(control => control.addEventListener('click', event => {
    event.preventDefault();
    transitionTo('home');
  }));

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const id = link.getAttribute('href').slice(1);
      if (id === 'home' && !casePage.hidden) {
        event.preventDefault();
        transitionTo('home');
        return;
      }
      if (id === 'home' && !homePage.hidden) return;
      const target = document.getElementById(id);
      if (!target || target.closest('.page[hidden]')) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${id}`);
    });
  });

  const menu = document.querySelector('#mobile-menu');
  const menuToggle = document.querySelector('.menu-toggle');
  const menuClose = document.querySelector('.menu-close');

  function setMenuOpen(isOpen) {
    menu.hidden = !isOpen;
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Menu is open' : 'Open menu');
    document.body.classList.toggle('menu-open', isOpen);
    if (isOpen) menuClose.focus();
    else menuToggle.focus();
  }

  menuToggle.addEventListener('click', () => setMenuOpen(menu.hidden));
  menuClose.addEventListener('click', () => setMenuOpen(false));
  menu.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => setMenuOpen(false));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) setMenuOpen(false);
  });

  const copyButton = document.querySelector('.email-copy-button');
  const copyStatus = copyButton.querySelector('[data-copy-status]');
  let copyResetTimer;

  function setCopyState(state) {
    copyButton.dataset.state = state;
    const label = state === 'copied' ? 'Email copied' : state === 'failed' ? "Couldn't copy email" : 'Copy email address';
    copyButton.setAttribute('aria-label', label);
    copyStatus.textContent = label;
    if (state !== 'idle') {
      window.clearTimeout(copyResetTimer);
      copyResetTimer = window.setTimeout(() => setCopyState('idle'), 3000);
    }
  }

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copyEmail);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  });

  bindVisibleAnchors();
  restoreSplitAssets();
})();
