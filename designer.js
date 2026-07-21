/** Renderizador de las posiciones publicadas del hero. */
class PublishedHeroLayout {
  constructor() {
    this.url = 'https://texjzaanugmssmolzwgb.supabase.co';
    this.key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRleGp6YWFudWdtc3Ntb2x6d2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzU5MDYsImV4cCI6MjEwMDA1MTkwNn0.L36iUvzMeZnLfT-3sqXzjPFJ_S_of20ATi1_QKKxWGo';
    this.hero = document.querySelector('#home.hero');
    this.targets = Array.from(document.querySelectorAll('#home [data-designer-target]'));
    this.profile = this.getProfile();
    this.layouts = {};
    this.defaults = {};
  }

  async init() {
    if (!this.hero || !this.targets.length || !window.supabase) return;

    this.defaults = this.getDefaultPositions();
    this.layouts = await this.loadLayouts();
    this.apply();
    window.addEventListener('resize', () => this.handleResize());
  }

  getProfile() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width <= 1024 && width > height) return 'landscape';
    if (width >= 1025) return 'desktop';
    return width >= 768 ? 'tablet' : 'mobile';
  }

  async loadLayouts() {
    const client = window.supabase.createClient(this.url, this.key);
    const { data, error } = await client
      .from('hero_layouts')
      .select('positions')
      .eq('id', 1)
      .maybeSingle();

    return error || !data ? {} : (data.positions || {});
  }

  getDefaultPositions() {
    const heroBounds = this.hero.getBoundingClientRect();
    return Object.fromEntries(this.targets.map((target) => {
      const bounds = target.getBoundingClientRect();
      return [target.dataset.designerTarget, {
        x: Math.round(bounds.left - heroBounds.left),
        y: Math.round(bounds.top - heroBounds.top)
      }];
    }));
  }

  apply() {
    const layout = this.layouts[this.profile];
    if (!layout) {
      this.resetStyles();
      return;
    }

    document.body.classList.add('hero-layout-applied');
    this.targets.forEach((target) => {
      const point = layout[target.dataset.designerTarget] || this.defaults[target.dataset.designerTarget];
      if (!point) return;
      target.style.setProperty('left', `${point.x}px`, 'important');
      target.style.setProperty('top', `${point.y}px`, 'important');
    });
  }

  resetStyles() {
    document.body.classList.remove('hero-layout-applied');
    this.targets.forEach((target) => {
      target.style.removeProperty('left');
      target.style.removeProperty('top');
    });
  }

  handleResize() {
    const nextProfile = this.getProfile();
    if (nextProfile === this.profile) return;
    this.profile = nextProfile;
    this.apply();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new PublishedHeroLayout().init();
});
