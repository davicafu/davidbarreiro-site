function initPageFade() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  requestAnimationFrame(() => {
    document.body.classList.remove('page-fade-init');
    document.body.classList.add('page-fade-ready');
  });

  const langLinks = [document.getElementById('lang-en-link'), document.getElementById('lang-es-link')].filter(
    Boolean
  );

  langLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = link.getAttribute('href');
      if (!target || target === window.location.pathname || prefersReduced) return;
      event.preventDefault();
      document.body.classList.remove('page-fade-ready');
      document.body.classList.add('page-fade-out');
      window.setTimeout(() => {
        window.location.href = target;
      }, 220);
    });
  });
}

function initPdfMenu() {
  const pdfLink = document.getElementById('hero-pdf-link');
  const pdfMenu = document.getElementById('pdf-style-menu');

  if (!pdfLink || !pdfMenu) return;

  pdfLink.addEventListener('click', (event) => {
    event.stopPropagation();
    const isHidden = pdfMenu.style.display === 'none';
    pdfMenu.style.display = isHidden ? 'block' : 'none';
    pdfMenu.classList.toggle('hidden', !isHidden);
  });

  pdfMenu.addEventListener('click', (event) => {
    const option = event.target.closest('a');
    if (!option) {
      event.stopPropagation();
      return;
    }

    pdfMenu.style.display = 'none';
    pdfMenu.classList.add('hidden');
  });

  document.addEventListener('click', () => {
    pdfMenu.style.display = 'none';
    pdfMenu.classList.add('hidden');
  });
}

initPageFade();
initPdfMenu();
