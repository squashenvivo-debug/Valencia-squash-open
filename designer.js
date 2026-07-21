(function () {
  'use strict';

  const DESIGNER_PARAM = 'designer';
  const STORAGE_KEY = 'psav.hero.designer.positions.v1';

  if (new URLSearchParams(window.location.search).get(DESIGNER_PARAM) !== '1') return;

  function readPositions() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_) { return {}; }
  }

  function writePositions(positions) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); }
    catch (_) { /* El modo sigue funcionando aunque el navegador bloquee localStorage. */ }
  }

  function init() {
    const hero = document.querySelector('.hero');
    const targets = Array.from(document.querySelectorAll('.hero [data-designer-target]'));
    if (!hero || !targets.length) return;

    document.body.classList.add('designer-mode');
    let positions = readPositions();

    function setPosition(target, left, top) {
      target.style.setProperty('left', left + '%', 'important');
      target.style.setProperty('top', top + '%', 'important');
    }

    // Se mide antes de cambiar el flujo para que activar el modo no desplace el diseño actual.
    const heroRect = hero.getBoundingClientRect();
    const initialRects = new Map(targets.map(target => [target, target.getBoundingClientRect()]));

    targets.forEach(target => {
      const name = target.dataset.designerTarget;
      const saved = positions[name];
      const rect = initialRects.get(target);
      const left = saved && Number.isFinite(saved.left) ? saved.left : ((rect.left - heroRect.left) / heroRect.width) * 100;
      const top = saved && Number.isFinite(saved.top) ? saved.top : ((rect.top - heroRect.top) / heroRect.height) * 100;
      setPosition(target, left, top);
    });

    targets.forEach(target => {
      target.addEventListener('pointerdown', event => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();

        const startRect = target.getBoundingClientRect();
        const offsetX = event.clientX - startRect.left;
        const offsetY = event.clientY - startRect.top;
        target.classList.add('is-dragging');
        target.setPointerCapture(event.pointerId);

        const move = moveEvent => {
          const bounds = hero.getBoundingClientRect();
          const maxLeft = Math.max(0, bounds.width - target.offsetWidth);
          const maxTop = Math.max(0, bounds.height - target.offsetHeight);
          const left = Math.min(maxLeft, Math.max(0, moveEvent.clientX - bounds.left - offsetX));
          const top = Math.min(maxTop, Math.max(0, moveEvent.clientY - bounds.top - offsetY));
          setPosition(target, left / bounds.width * 100, top / bounds.height * 100);
        };

        const finish = () => {
          target.classList.remove('is-dragging');
          target.removeEventListener('pointermove', move);
          const bounds = hero.getBoundingClientRect();
          positions[target.dataset.designerTarget] = {
            left: parseFloat(target.style.left),
            top: parseFloat(target.style.top)
          };
          writePositions(positions);
        };

        target.addEventListener('pointermove', move);
        target.addEventListener('pointerup', finish, { once: true });
        target.addEventListener('pointercancel', finish, { once: true });
      });
    });

    const toolbar = document.createElement('aside');
    toolbar.className = 'designer-toolbar';
    toolbar.innerHTML = '<span>Arrastra los elementos del hero</span><button type="button" data-action="reset">Restablecer</button><button type="button" data-action="exit">Salir</button>';
    toolbar.addEventListener('click', event => {
      const action = event.target.dataset.action;
      if (action === 'reset') {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        window.location.reload();
      }
      if (action === 'exit') {
        const url = new URL(window.location.href);
        url.searchParams.delete(DESIGNER_PARAM);
        window.location.href = url.toString();
      }
    });
    document.body.appendChild(toolbar);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
