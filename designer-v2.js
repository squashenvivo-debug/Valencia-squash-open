/**
 * Segunda implementación independiente del editor visual del hero.
 * Se puede activar cargando este archivo junto con la página y usando ?designer=1.
 */
class HeroVisualEditorV2 {
  static databaseUrl = 'https://texjzaanugmssmolzwgb.supabase.co';

  static publicKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRleGp6YWFudWdtc3Ntb2x6d2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzU5MDYsImV4cCI6MjEwMDA1MTkwNn0.L36iUvzMeZnLfT-3sqXzjPFJ_S_of20ATi1_QKKxWGo';

  constructor() {
    this.hero = document.querySelector('#home.hero');
    this.items = new Map();
    this.database = null;
    this.screen = this.detectScreen();
    this.persisted = {};
    this.draft = {};
    this.original = {};
    this.current = null;
    this.sidebar = null;
  }

  async start() {
    if (!this.hero) return;

    document.querySelectorAll('[data-designer-target]').forEach((node) => {
      this.items.set(node.dataset.designerTarget, node);
    });
    if (!this.items.size) return;

    this.original = this.snapshot();
    this.database = this.connect();
    this.persisted = await this.readRemoteLayout();
    this.draft = this.copy(this.persisted);

    if (this.isEditing()) {
      this.openEditor();
    } else {
      this.renderPublishedLayout();
      window.addEventListener('resize', () => this.onResize());
    }
  }

  isEditing() {
    return new URLSearchParams(window.location.search).get('designer') === '1';
  }

  connect() {
    return window.supabase
      ? window.supabase.createClient(HeroVisualEditorV2.databaseUrl, HeroVisualEditorV2.publicKey)
      : null;
  }

  detectScreen() {
    const shortSide = Math.min(window.innerWidth, window.innerHeight);
    if (window.innerWidth > window.innerHeight && shortSide < 1025) return 'landscape';
    if (window.innerWidth >= 1025) return 'desktop';
    if (window.innerWidth >= 768) return 'tablet';
    return 'mobile';
  }

  copy(source) {
    return JSON.parse(JSON.stringify(source || {}));
  }

  async readRemoteLayout() {
    if (!this.database) return {};

    const response = await this.database
      .from('hero_layouts')
      .select('positions')
      .eq('id', 1)
      .maybeSingle();

    return response.error || !response.data ? {} : (response.data.positions || {});
  }

  snapshot() {
    const frame = this.hero.getBoundingClientRect();
    const values = {};

    this.items.forEach((node, id) => {
      const rectangle = node.getBoundingClientRect();
      values[id] = {
        x: Math.round(rectangle.left - frame.left),
        y: Math.round(rectangle.top - frame.top)
      };
    });
    return values;
  }

  activatePositionedHero(editing) {
    document.body.classList.add('hero-layout-applied');
    document.body.classList.toggle('designer-mode', editing);
  }

  restoreStaticHero() {
    document.body.classList.remove('hero-layout-applied', 'designer-mode');
    this.items.forEach((node) => {
      node.style.removeProperty('left');
      node.style.removeProperty('top');
    });
  }

  layoutForScreen() {
    return this.draft[this.screen] || this.original;
  }

  renderPublishedLayout() {
    if (!this.persisted[this.screen]) {
      this.restoreStaticHero();
      return;
    }
    this.paint(this.persisted[this.screen], false);
  }

  paint(layout, editing) {
    this.activatePositionedHero(editing);
    this.items.forEach((node, id) => {
      this.place(node, layout[id] || this.original[id]);
    });
  }

  place(node, proposed) {
    const point = this.keepInside(node, proposed);
    node.style.setProperty('left', `${point.x}px`, 'important');
    node.style.setProperty('top', `${point.y}px`, 'important');
    return point;
  }

  keepInside(node, proposed) {
    const frame = this.hero.getBoundingClientRect();
    return {
      x: Math.round(Math.max(0, Math.min(proposed.x, frame.width - node.offsetWidth))),
      y: Math.round(Math.max(0, Math.min(proposed.y, frame.height - node.offsetHeight)))
    };
  }

  openEditor() {
    this.paint(this.layoutForScreen(), true);
    this.createSidebar();
    this.bindCanvas();
    this.choose(this.items.keys().next().value);
    this.message(`Editando ${this.screen}.`);
  }

  createSidebar() {
    const screenButtons = ['desktop', 'tablet', 'mobile', 'landscape']
      .map((name) => `<button type="button" data-screen="${name}">${name}</button>`)
      .join('');
    const itemButtons = [...this.items.entries()]
      .map(([id, node]) => `<button type="button" data-item="${id}">${node.dataset.designerLabel || id}</button>`)
      .join('');

    this.sidebar = document.createElement('aside');
    this.sidebar.className = 'designer-panel';
    this.sidebar.innerHTML = `
      <div class="designer-panel__header"><span>Editor visual V2</span><button type="button" data-command="close" aria-label="Cerrar">×</button></div>
      <div class="designer-panel__body">
        <p class="designer-panel__hint">Arrastra el elemento seleccionado o utiliza las flechas. Mayús suma 10 píxeles.</p>
        <div class="designer-profiles">${screenButtons}</div>
        <div class="designer-elements">${itemButtons}</div>
        <output class="designer-coordinates"></output>
        <p class="designer-status"></p>
        <div class="designer-actions"><button type="button" class="primary" data-command="save">Guardar</button><button type="button" data-command="cancel">Cancelar</button><button type="button" data-command="reset">Restablecer</button></div>
      </div>`;
    this.sidebar.addEventListener('click', (event) => this.onSidebarClick(event));
    document.body.appendChild(this.sidebar);
  }

  onSidebarClick(event) {
    const control = event.target.closest('button');
    if (!control) return;

    if (control.dataset.item) {
      this.choose(control.dataset.item);
      return;
    }
    if (control.dataset.screen) {
      this.screen = control.dataset.screen;
      this.paint(this.layoutForScreen(), true);
      this.refreshSidebar();
      return;
    }
    if (control.dataset.command === 'save') this.saveRemoteLayout();
    if (control.dataset.command === 'cancel') this.cancelChanges();
    if (control.dataset.command === 'reset') this.resetScreen();
    if (control.dataset.command === 'close') this.leaveEditor();
  }

  bindCanvas() {
    this.items.forEach((node, id) => {
      node.tabIndex = -1;
      node.addEventListener('pointerdown', (event) => this.beginDrag(event, id));
    });
    document.addEventListener('keydown', (event) => this.nudge(event));
  }

  choose(id) {
    this.current = id;
    this.items.forEach((node, itemId) => node.classList.toggle('is-selected', itemId === id));
    this.items.get(id).focus({ preventScroll: true });
    this.refreshSidebar();
  }

  beginDrag(event, id) {
    if (event.button !== 0) return;
    event.preventDefault();
    this.choose(id);

    const node = this.items.get(id);
    const rectangle = node.getBoundingClientRect();
    const grab = { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
    node.classList.add('is-dragging');
    node.setPointerCapture(event.pointerId);

    const move = (pointer) => {
      const frame = this.hero.getBoundingClientRect();
      this.change(id, { x: pointer.clientX - frame.left - grab.x, y: pointer.clientY - frame.top - grab.y });
    };
    const finish = () => {
      node.classList.remove('is-dragging');
      node.removeEventListener('pointermove', move);
    };

    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', finish, { once: true });
    node.addEventListener('pointercancel', finish, { once: true });
  }

  nudge(event) {
    if (!this.current || event.target.closest('input, textarea, select')) return;
    const delta = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]
    }[event.key];
    if (!delta) return;

    event.preventDefault();
    const amount = event.shiftKey ? 10 : 1;
    const point = this.layoutForScreen()[this.current] || this.original[this.current];
    this.change(this.current, { x: point.x + delta[0] * amount, y: point.y + delta[1] * amount });
  }

  change(id, nextPoint) {
    if (!this.draft[this.screen]) this.draft[this.screen] = this.copy(this.original);
    const node = this.items.get(id);
    this.draft[this.screen][id] = this.place(node, nextPoint);
    this.refreshSidebar();
  }

  refreshSidebar() {
    if (!this.sidebar) return;

    this.sidebar.querySelectorAll('[data-screen]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.screen === this.screen);
    });
    this.sidebar.querySelectorAll('[data-item]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.item === this.current);
    });

    const point = this.current ? (this.layoutForScreen()[this.current] || this.original[this.current]) : null;
    this.sidebar.querySelector('.designer-coordinates').textContent = point ? `X: ${point.x} px · Y: ${point.y} px` : '';
  }

  message(text) {
    if (this.sidebar) this.sidebar.querySelector('.designer-status').textContent = text;
  }

  async saveRemoteLayout() {
    if (!this.database) {
      this.message('Supabase no está disponible.');
      return;
    }
    this.message('Guardando…');
    const result = await this.database
      .from('hero_layouts')
      .upsert({ id: 1, positions: this.draft, updated_at: new Date().toISOString() }, { onConflict: 'id' });

    if (result.error) {
      this.message(`Error: ${result.error.message}`);
      return;
    }
    this.persisted = this.copy(this.draft);
    this.message('Cambios guardados en Supabase.');
  }

  cancelChanges() {
    this.draft = this.copy(this.persisted);
    this.paint(this.layoutForScreen(), true);
    this.refreshSidebar();
    this.message('Cambios descartados.');
  }

  resetScreen() {
    delete this.draft[this.screen];
    this.paint(this.original, true);
    this.refreshSidebar();
    this.message('Perfil restablecido. Guarda para confirmarlo.');
  }

  leaveEditor() {
    const locationUrl = new URL(window.location.href);
    locationUrl.searchParams.delete('designer');
    window.location.assign(locationUrl);
  }

  onResize() {
    const detected = this.detectScreen();
    if (detected === this.screen) return;
    this.screen = detected;
    this.renderPublishedLayout();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const editor = new HeroVisualEditorV2();
  editor.start();
});
