/**
 * ROOH Cosmetics - Official Public Website & Souq ROOH E-Commerce Platform
 * Enhanced Production Version
 */

class RoohCart {
  constructor() {
    this.storageKey = 'rooh_shopping_cart';
    this.items = this.load();
    this.couponDiscount = 0;
    this.couponCode = '';
    this.selectedGovernorate = 'القاهرة';
    this.shippingFee = 45;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    this.updateCounters();
  }

  addItem(item) {
    const existing = this.items.find(i => 
      i.product_id === item.product_id && 
      JSON.stringify(i.customization) === JSON.stringify(item.customization)
    );

    if (existing) {
      existing.qty += (item.qty || 1);
      existing.total_price = existing.qty * existing.unit_price;
    } else {
      this.items.push({
        product_id: item.product_id,
        name: item.name,
        sku: item.sku,
        qty: item.qty || 1,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost || (item.unit_price * 0.3),
        total_price: (item.qty || 1) * item.unit_price,
        customization: item.customization || null,
        image: item.image || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80'
      });
    }
    this.save();
    this.renderDrawer();
  }

  removeItem(index) {
    this.items.splice(index, 1);
    this.save();
    this.renderDrawer();
  }

  updateQty(index, delta) {
    if (!this.items[index]) return;
    this.items[index].qty += delta;
    if (this.items[index].qty <= 0) {
      this.removeItem(index);
      return;
    }
    this.items[index].total_price = this.items[index].qty * this.items[index].unit_price;
    this.save();
    this.renderDrawer();
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + item.total_price, 0);
  }

  getTotal() {
    const sub = this.getSubtotal();
    // Free shipping if over 750 EGP
    const actualShipping = sub >= 750 || sub === 0 ? 0 : this.shippingFee;
    return Math.max(0, sub - this.couponDiscount + actualShipping);
  }

  updateCounters() {
    const totalCount = this.items.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('.cart-badge-count').forEach(el => {
      el.textContent = totalCount;
      el.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    });
  }

  openDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer && overlay) {
      this.renderDrawer();
      drawer.classList.add('open');
      overlay.classList.add('open');
    }
  }

  closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    if (drawer && overlay) {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
    }
  }

  renderDrawer() {
    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');
    if (!body || !footer) return;

    if (this.items.length === 0) {
      body.innerHTML = `
        <div style="text-align:center; padding:50px 20px;">
          <div style="font-size:3.5rem; margin-bottom:12px; opacity:0.6;">🛍️</div>
          <h4 style="font-size:1.1rem; color:var(--rooh-dark); margin-bottom:6px;">حقيبة التسوق فارغة</h4>
          <p style="font-size:0.85rem; color:var(--rooh-muted);">تصفحي تشكيلة مستحضرات روح الفاخرة وأضيفي ما يناسب جمالكِ</p>
          <button class="btn-rooh btn-rooh-primary btn-rooh-sm" style="margin-top:16px;" onclick="window.roohCart.closeDrawer(); window.location.hash='#store'">
            تسوقي الآن في سوق روح
          </button>
        </div>
      `;
      footer.style.display = 'none';
      return;
    }

    footer.style.display = 'block';
    body.innerHTML = this.items.map((item, idx) => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
        <div class="cart-item-info">
          <div>
            <div class="cart-item-title">${item.name}</div>
            ${item.customization ? `
              <div class="cart-item-custom-notes">
                ✨ مخصص: ${item.customization.type} | "${item.customization.custom_label || 'تركيبة خاصة'}"
              </div>
            ` : ''}
          </div>
          <div class="cart-qty-row">
            <div class="qty-control">
              <button class="qty-btn" onclick="window.roohCart.updateQty(${idx}, -1)">-</button>
              <span class="qty-display">${item.qty}</span>
              <button class="qty-btn" onclick="window.roohCart.updateQty(${idx}, 1)">+</button>
            </div>
            <div style="font-weight:700; color:var(--rooh-dark);">
              ${window.RoohUtil.formatCurrency(item.total_price)}
            </div>
          </div>
        </div>
        <button onclick="window.roohCart.removeItem(${idx})" style="color:var(--rooh-muted); font-size:1.1rem; padding:4px;" title="حذف">&times;</button>
      </div>
    `).join('');

    const sub = this.getSubtotal();
    const isFreeShip = sub >= 750;
    const ship = isFreeShip ? 0 : this.shippingFee;
    const tot = this.getTotal();

    footer.innerHTML = `
      <div class="cart-summary-line">
        <span>المجموع الفرعي:</span>
        <span>${window.RoohUtil.formatCurrency(sub)}</span>
      </div>
      ${this.couponDiscount > 0 ? `
        <div class="cart-summary-line" style="color:var(--rooh-success);">
          <span>خصم الكوبون (${this.couponCode}):</span>
          <span>-${window.RoohUtil.formatCurrency(this.couponDiscount)}</span>
        </div>
      ` : ''}
      <div class="cart-summary-line">
        <span>الشحن المقدر:</span>
        <span>${isFreeShip ? '<strong style="color:var(--rooh-success);">مجاني (عرض خاص)</strong>' : window.RoohUtil.formatCurrency(ship)}</span>
      </div>
      ${!isFreeShip ? `
        <div style="font-size:0.75rem; color:var(--rooh-gold-hover); margin-bottom:8px; text-align:center;">
          أضيفي منتجات بقيمة ${750 - sub} ج.م إضافية لتحصلي على <strong>شحن مجاني</strong>!
        </div>
      ` : ''}
      <div class="cart-total-line">
        <span>الإجمالي النهائي:</span>
        <span style="color:var(--rooh-gold);">${window.RoohUtil.formatCurrency(tot)}</span>
      </div>
      <button class="btn-rooh btn-rooh-primary" style="width:100%; margin-top:16px;" onclick="window.roohApp.openCheckoutModal()">
        <span>إتمام الطلب والدفع</span>
        <span>💳</span>
      </button>
    `;
  }
}

class RoohApp {
  constructor() {
    this.currentCategory = 'all';
    this.currentSearch = '';
    this.lang = 'ar';
    this.governorates = [];
    this.currentCustomer = this.loadCustomer();
  }

  loadCustomer() {
    try {
      const raw = localStorage.getItem('rooh_customer');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  saveCustomer(cust) {
    this.currentCustomer = cust;
    if (cust) {
      localStorage.setItem('rooh_customer', JSON.stringify(cust));
    } else {
      localStorage.removeItem('rooh_customer');
    }
    this.renderCustomerHeader();
  }

  async init() {
    window.roohCart = new RoohCart();
    window.roohCart.updateCounters();

    // Inject Dynamic Theme Colors if saved by Admin
    await this.applyThemeColors();
    await this.applyCustomSettings();

    // Load Shipping Governorates (All 27 in exact order)
    this.governorates = await window.roohDB.getGovernorates();

    // Render Components
    this.renderCustomerHeader();
    await this.renderWebsiteSections();
    await this.renderCategoriesBar();
    await this.renderProducts();
    await this.renderReviewsSection();

    // Initialize customizer & AI assistant
    if (window.roohCustomizer) await window.roohCustomizer.init();
    if (window.roohChatbot) window.roohChatbot.init();

    this.bindEvents();
    this.handleRouting();
    window.addEventListener('hashchange', () => this.handleRouting());

    // Listen to real-time Admin Saves across tabs / windows
    window.addEventListener('storage', async (e) => {
      if (e.key === 'rooh_local_database_v2' || e.key === 'rooh_db_updated') {
        await this.applyThemeColors();
        await this.applyCustomSettings();
        await this.renderWebsiteSections();
        await this.renderCategoriesBar();
        await this.renderProducts();
      }
    });
  }

  async applyThemeColors() {
    try {
      const themes = await window.roohDB.getThemeColors();
      if (themes) {
        const root = document.documentElement;
        if (themes.site?.primary) root.style.setProperty('--rooh-gold', themes.site.primary);
        if (themes.site?.primary_dark) root.style.setProperty('--rooh-gold-hover', themes.site.primary_dark);
        if (themes.site?.bg_dark) root.style.setProperty('--rooh-dark', themes.site.bg_dark);
        if (themes.site?.bg_light) root.style.setProperty('--rooh-cream', themes.site.bg_light);

        // Unified background color across site & store
        const unifiedBg = themes.unified_bg || themes.site?.background;
        if (unifiedBg) {
          root.style.setProperty('--rooh-cream', unifiedBg);
          document.body.style.backgroundColor = unifiedBg;
        }

        // Botanical Nature Motif Overlays
        let overlayEl = document.getElementById('siteNatureOverlay');
        if (!overlayEl) {
          overlayEl = document.createElement('div');
          overlayEl.id = 'siteNatureOverlay';
          overlayEl.className = 'site-nature-overlay';
          document.body.appendChild(overlayEl);
        }

        const motif = themes.motif || 'none';
        overlayEl.className = `site-nature-overlay ${motif !== 'none' ? 'motif-' + motif : ''}`;
        overlayEl.style.opacity = themes.motif_opacity || 0.12;
      }
    } catch (e) {
      console.warn('Could not apply theme colors:', e);
    }
  }

  async applyCustomSettings() {
    try {
      const settings = await window.roohDB.getSettings();
      if (!settings) return;

      // Announcement Bar
      if (settings.top_announcement) {
        const annEl = document.querySelector('.top-announcement');
        if (annEl) annEl.textContent = settings.top_announcement;
      }

      // Brand Logo
      if (settings.brand_logo) {
        const logoMark = document.querySelector('.brand-logo-mark');
        if (logoMark) {
          logoMark.innerHTML = `<img src="${settings.brand_logo}" alt="Logo" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`;
        }
      }

      // Brand Name & Subtext
      if (settings.brand_name_ar) {
        const nameEl = document.querySelector('.brand-name');
        if (nameEl) nameEl.textContent = settings.brand_name_ar;
      }
      if (settings.brand_subtext) {
        const subEl = document.querySelector('.brand-subtext');
        if (subEl) subEl.textContent = settings.brand_subtext;
      }

      // Hero Titles
      if (settings.hero_title) {
        const titleEl = document.getElementById('heroDynamicTitle');
        if (titleEl) titleEl.innerHTML = settings.hero_title;
      }
      if (settings.hero_desc) {
        const subEl = document.getElementById('heroDynamicSubtitle');
        if (subEl) subEl.textContent = settings.hero_desc;
      }

      // Hero Button Texts
      if (settings.btn_store_text) {
        const btnStore = document.querySelector('.hero-cta .btn-rooh-primary');
        if (btnStore && btnStore.childNodes[0]) {
          btnStore.childNodes[0].textContent = settings.btn_store_text + ' ';
        }
      }
      if (settings.btn_lab_text) {
        const btnLab = document.querySelector('.hero-cta .btn-rooh-outline');
        if (btnLab && btnLab.childNodes[0]) {
          btnLab.childNodes[0].textContent = settings.btn_lab_text + ' ';
        }
      }

      // Story Mission
      if (settings.story_mission) {
        const missionEl = document.getElementById('storyDynamicMission');
        if (missionEl) missionEl.textContent = settings.story_mission;
      }
    } catch (e) {
      console.warn('Could not apply custom settings:', e);
    }
  }

  renderCustomerHeader() {
    const navBtn = document.getElementById('customerAccountBtn');
    const nameEl = document.getElementById('customerNavName');
    if (!nameEl) return;

    if (this.currentCustomer) {
      const firstName = this.currentCustomer.name.split(' ')[0] || 'حسابي';
      nameEl.textContent = `أهلاً، ${firstName}`;
      if (navBtn) {
        navBtn.style.background = 'rgba(191,161,95,0.2)';
        navBtn.style.borderColor = 'var(--rooh-gold)';
      }
    } else {
      nameEl.textContent = 'حسابي';
      if (navBtn) {
        navBtn.style.background = 'rgba(191,161,95,0.1)';
      }
    }
  }

  bindEvents() {
    // Customer Account Trigger
    document.getElementById('customerAccountBtn')?.addEventListener('click', () => {
      this.openCustomerModal();
    });

    // Search input debounce
    const searchInput = document.getElementById('storeSearchInput');
    if (searchInput) {
      let debounceTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          this.currentSearch = e.target.value.trim();
          this.renderProducts();
        }, 300);
      });
    }

    // Cart Drawer Toggle
    document.getElementById('cartOpenBtn')?.addEventListener('click', () => window.roohCart.openDrawer());
    document.getElementById('cartCloseBtn')?.addEventListener('click', () => window.roohCart.closeDrawer());
    document.getElementById('cartOverlay')?.addEventListener('click', () => window.roohCart.closeDrawer());

    // Complaints form submit
    const complaintForm = document.getElementById('complaintForm');
    if (complaintForm) {
      complaintForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          customer_name: document.getElementById('cmpName').value,
          phone: document.getElementById('cmpPhone').value,
          order_number: document.getElementById('cmpOrderNum').value,
          category: document.getElementById('cmpCategory').value,
          details: document.getElementById('cmpDetails').value
        };
        const created = await window.roohDB.submitComplaint(data);
        window.RoohUtil.showToast(`تم تسجيل الشكوى بنجاح برقم (${created.id}). سيتواصل معكِ الأستاذ عبدالرحمن أو فريق الدعم الفني خلال ساعات!`, 'success');
        complaintForm.reset();
      });
    }

    // Review form submit
    const reviewForm = document.getElementById('submitReviewForm');
    if (reviewForm) {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          customer_name: document.getElementById('revCustomerName').value,
          rating: Number(document.getElementById('revRatingSelect').value) || 5,
          title: document.getElementById('revTitle').value,
          comment: document.getElementById('revComment').value,
          verified_purchase: true
        };
        await window.roohDB.submitReview(data);
        window.RoohUtil.showToast('شكراً لمشاركتكِ رأيكِ القيّم! تم نشر تقييمكِ في مجتمع عملاء روح.', 'success');
        reviewForm.reset();
        document.getElementById('reviewModal')?.classList.remove('open');
        this.renderReviewsSection();
      });
    }
  }

  handleRouting() {
    const hash = window.location.hash || '#home';

    // Update active navbar links
    document.querySelectorAll('.nav-item').forEach(item => {
      const link = item.querySelector('a');
      if (link && link.getAttribute('href') === hash) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (hash === '#store') {
      const storeEl = document.getElementById('store');
      if (storeEl) storeEl.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#customizer') {
      const customEl = document.getElementById('customizer');
      if (customEl) customEl.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#about') {
      const aboutEl = document.getElementById('about');
      if (aboutEl) aboutEl.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#reviews') {
      const revEl = document.getElementById('reviews');
      if (revEl) revEl.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#support') {
      const supEl = document.getElementById('support');
      if (supEl) supEl.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async renderWebsiteSections() {
    const sections = await window.roohDB.getBuilderSections();
    const heroSec = sections.find(s => s.type === 'hero');
    if (heroSec) {
      const titleEl = document.getElementById('heroDynamicTitle');
      const subEl = document.getElementById('heroDynamicSubtitle');
      if (titleEl && heroSec.title_ar) titleEl.innerHTML = heroSec.title_ar;
      if (subEl && heroSec.subtitle_ar) subEl.textContent = heroSec.subtitle_ar;
    }

    const storySec = sections.find(s => s.type === 'story');
    if (storySec) {
      const storyDesc = document.getElementById('storyDynamicDesc');
      const storyMission = document.getElementById('storyDynamicMission');
      const storyVision = document.getElementById('storyDynamicVision');
      if (storyDesc && storySec.desc_ar) storyDesc.textContent = storySec.desc_ar;
      if (storyMission && storySec.mission_ar) storyMission.textContent = storySec.mission_ar;
      if (storyVision && storySec.vision_ar) storyVision.textContent = storySec.vision_ar;
    }
  }

  async renderCategoriesBar() {
    const cats = await window.roohDB.getCategories();
    const container = document.getElementById('categorySubnav');
    if (!container) return;

    container.innerHTML = `
      <li class="subnav-item">
        <button class="subnav-link ${this.currentCategory === 'all' ? 'active' : ''}" onclick="window.roohApp.filterCategory('all')">
          <span>✨</span>
          <span>جميع المنتجات</span>
        </button>
      </li>
      ${cats.map(c => `
        <li class="subnav-item">
          <button class="subnav-link ${c.id === 'customizer' ? 'special-lab' : ''} ${this.currentCategory === c.id ? 'active' : ''}" onclick="window.roohApp.filterCategory('${c.id}')">
            <span>${c.icon}</span>
            <span>${c.name_ar}</span>
          </button>
        </li>
      `).join('')}
    `;
  }

  filterCategory(catId) {
    if (catId === 'customizer') {
      window.location.hash = '#customizer';
      return;
    }
    this.currentCategory = catId;
    this.renderCategoriesBar();
    this.renderProducts();

    // Smooth scroll to store section
    const storeEl = document.getElementById('store');
    if (storeEl) {
      storeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--rooh-muted);">جاري تحميل تشكيلة مستحضرات روح الفاخرة...</div>`;

    let products = await window.roohDB.getProducts(this.currentCategory, this.currentSearch);
    const allCategories = await window.roohDB.getCategories();
    const currentCatObj = allCategories.find(c => c.id === this.currentCategory);

    // Filter specials
    if (this.currentCategory === 'special_offers') {
      products = products.filter(p => p.original_price > p.price);
    } else if (this.currentCategory === 'best_sellers') {
      products = products.filter(p => p.is_bestseller);
    } else if (this.currentCategory === 'new_arrivals') {
      products = products.filter(p => p.is_new);
    }

    let categoryHeaderHtml = '';
    if (this.currentCategory && this.currentCategory !== 'all') {
      const catTitle = currentCatObj ? currentCatObj.name_ar : (this.currentCategory === 'special_offers' ? 'العروض الخاصة' : (this.currentCategory === 'best_sellers' ? 'الأكثر طلباً' : 'وصل حديثاً'));
      const catIcon = currentCatObj ? currentCatObj.icon : '✨';
      categoryHeaderHtml = `
        <div style="grid-column:1/-1; background:#FFF; border:1px solid rgba(191,161,95,0.4); border-radius:14px; padding:16px 22px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; box-shadow:var(--rooh-shadow-sm); margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.6rem;">${catIcon}</span>
            <div>
              <h3 style="font-family:var(--rooh-font-serif); font-size:1.25rem; color:var(--rooh-dark); margin:0;">
                قسم: ${catTitle}
              </h3>
              <span style="font-size:0.8rem; color:var(--rooh-muted);">متوفر ${products.length} مستحضر ملكي في هذا القسم</span>
            </div>
          </div>
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohApp.filterCategory('all')" style="font-size:0.82rem; padding:6px 14px;">
            <span>عرض كافة الأقسام (الكل) ✕</span>
          </button>
        </div>
      `;
    }

    if (products.length === 0) {
      grid.innerHTML = `
        ${categoryHeaderHtml}
        <div style="grid-column:1/-1; text-align:center; padding:50px 20px;">
          <div style="font-size:3rem; margin-bottom:12px;">🔍</div>
          <h4 style="font-size:1.2rem; color:var(--rooh-dark);">لم نجد مستحضرات في هذا القسم حالياً</h4>
          <p style="font-size:0.9rem; color:var(--rooh-muted);">يمكنك تصفح باقي أقسام المتجر الملكية</p>
          <button class="btn-rooh btn-rooh-primary btn-rooh-sm" style="margin-top:14px;" onclick="window.roohApp.filterCategory('all')">عرض جميع المنتجات</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = categoryHeaderHtml + products.map(p => {
      const hasDiscount = p.original_price > p.price;
      const discountPct = hasDiscount ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;

      return `
        <div class="product-card">
          <div class="product-thumb-wrap">
            <img src="${p.image}" alt="${p.name_ar}" loading="lazy" />
            <div class="product-badges">
              ${p.is_bestseller ? '<span class="badge-tag tag-bestseller">الأكثر طلباً 👑</span>' : ''}
              ${p.is_new ? '<span class="badge-tag tag-new">وصل حديثاً 🌟</span>' : ''}
              ${hasDiscount ? `<span class="badge-tag tag-discount">خصم ${discountPct}%</span>` : ''}
            </div>
            <div class="product-quick-actions">
              <button class="btn-rooh btn-rooh-primary btn-rooh-sm" onclick="window.roohApp.quickAddToCart('${p.id}')">
                <span>أضف للسلة</span>
                <span>🛒</span>
              </button>
              <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="background:#FFF;" onclick="window.roohApp.openProductModal('${p.id}')">
                <span>التفاصيل</span>
                <span>👁️</span>
              </button>
            </div>
          </div>
          <div class="product-content">
            <span class="product-category" style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:700; color:var(--rooh-gold);" onclick="event.stopPropagation(); window.roohApp.filterCategory('${p.category_id}')" title="انقر لتصفح قسم ${p.category_name_ar || ''}">
              <span>🏷️</span>
              <span>${p.category_name_ar || 'مستحضرات تجميل'}</span>
            </span>
            <h3 class="product-name" title="${p.name_ar}">${p.name_ar}</h3>
            <div class="product-rating">
              <span>★ ${p.rating}</span>
              <span class="review-count">(${p.review_count} تقييم)</span>
            </div>
            <div class="product-price-row">
              <div class="price-box">
                <span class="price-current">${window.RoohUtil.formatCurrency(p.price)}</span>
                ${hasDiscount ? `<span class="price-old">${window.RoohUtil.formatCurrency(p.original_price)}</span>` : ''}
              </div>
              <button class="icon-btn" onclick="window.roohApp.quickAddToCart('${p.id}')" title="شراء سريع">
                <span>+</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async quickAddToCart(productId) {
    const product = await window.roohDB.getProductById(productId);
    if (!product) return;

    window.roohCart.addItem({
      product_id: product.id,
      name: product.name_ar,
      sku: product.sku,
      qty: 1,
      unit_price: product.price,
      unit_cost: product.cost_price,
      image: product.image
    });

    window.RoohUtil.showToast(`تمت إضافة "${product.name_ar}" إلى حقيبة التسوق!`, 'success');
    window.roohCart.openDrawer();
  }

  async openProductModal(productId) {
    const product = await window.roohDB.getProductById(productId);
    if (!product) return;

    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('productModalContent');
    if (!modal || !content) return;

    const hasDiscount = product.original_price > product.price;

    content.innerHTML = `
      <div class="product-detail-grid" style="display:grid; grid-template-columns:1fr 1.2fr; gap:30px; align-items:start;">
        <div>
          <img src="${product.image}" alt="${product.name_ar}" style="width:100%; border-radius:14px; border:1px solid var(--rooh-border); box-shadow:var(--rooh-shadow-md);" />
        </div>
        <div>
          <span class="badge-tag tag-new" style="margin-bottom:8px; display:inline-block; cursor:pointer;" onclick="document.getElementById('productDetailModal').classList.remove('open'); window.roohApp.filterCategory('${product.category_id}')" title="انقر لتصفح جميع منتجات قسم ${product.category_name_ar}">🏷️ ${product.category_name_ar} (عرض القسم)</span>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.6rem; color:var(--rooh-dark); margin-bottom:8px;">${product.name_ar}</h2>
          <div style="font-size:0.8rem; color:var(--rooh-muted); margin-bottom:12px;">كود المنتج (SKU): ${product.sku} | باركود: ${product.barcode}</div>
          
          <div class="product-rating" style="margin-bottom:16px;">
            <span>★ ${product.rating}</span>
            <span class="review-count">(${product.review_count} تقييم معتمد)</span>
            <span style="color:var(--rooh-success); font-weight:700; margin-right:12px;">● متوفر بالمستودع (${product.stock} عبوة)</span>
          </div>

          <div style="font-size:1.6rem; font-weight:800; color:var(--rooh-gold); margin-bottom:16px; display:flex; align-items:center; gap:12px;">
            <span>${window.RoohUtil.formatCurrency(product.price)}</span>
            ${hasDiscount ? `<span style="font-size:1.1rem; color:var(--rooh-muted); text-decoration:line-through;">${window.RoohUtil.formatCurrency(product.original_price)}</span>` : ''}
          </div>

          <p style="font-size:0.95rem; color:var(--rooh-muted); line-height:1.7; margin-bottom:20px;">
            ${product.description_ar}
          </p>

          <div style="background:var(--rooh-sand-light); padding:14px; border-radius:10px; margin-bottom:16px; font-size:0.85rem;">
            <strong style="color:var(--rooh-dark); display:block; margin-bottom:4px;">🌿 المكونات الطبيعية الفعالة:</strong>
            <p style="color:var(--rooh-muted); margin:0;">${product.ingredients_ar || 'مستخلصات نباتية نقية 100% معتمدة معملياً'}</p>
          </div>

          <div style="background:var(--rooh-sand-light); padding:14px; border-radius:10px; margin-bottom:24px; font-size:0.85rem;">
            <strong style="color:var(--rooh-dark); display:block; margin-bottom:4px;">✨ طريقة الاستخدام المثلى:</strong>
            <p style="color:var(--rooh-muted); margin:0;">${product.usage_ar || 'يدلك بلطف على بشرة نظيفة وجافة صباحاً ومساءً'}</p>
          </div>

          <button class="btn-rooh btn-rooh-primary" style="width:100%; font-size:1.05rem;" onclick="window.roohApp.quickAddToCart('${product.id}'); document.getElementById('productDetailModal').classList.remove('open');">
            <span>إضافة إلى حقيبة التسوق</span>
            <span>🛍️</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  async renderReviewsSection() {
    const list = await window.roohDB.getReviews('Approved');
    const container = document.getElementById('reviewsContainer');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--rooh-muted);">
          كن أول من يشاركنا تقييمه الملكي لمنتجات روح!
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(r => `
      <div style="background:var(--rooh-white); border:1px solid var(--rooh-border); border-radius:16px; padding:24px; box-shadow:var(--rooh-shadow-sm); display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="color:var(--rooh-gold); font-size:1.1rem;">${'★'.repeat(r.rating)}</div>
            ${r.verified_purchase ? '<span class="badge-tag" style="background:#E8F5E9; color:#2E7D32;">مشترٍ مؤكد ✓</span>' : ''}
          </div>
          <h4 style="font-weight:700; font-size:1.05rem; color:var(--rooh-dark); margin-bottom:8px;">${r.title}</h4>
          <p style="font-size:0.9rem; color:var(--rooh-muted); line-height:1.6;">${r.comment}</p>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; padding-top:12px; border-top:1px solid var(--rooh-sand); font-size:0.8rem; color:var(--rooh-muted);">
          <strong>${r.customer_name}</strong>
          <span>${r.date}</span>
        </div>
      </div>
    `).join('');
  }

  // ================= CUSTOMER PORTAL =================
  openCustomerModal(tab = 'login') {
    const modal = document.getElementById('customerModal');
    const body = document.getElementById('customerModalBody');
    if (!modal || !body) return;

    if (this.currentCustomer) {
      this.renderCustomerProfileView(body);
    } else {
      this.renderCustomerAuthView(body, tab);
    }

    modal.classList.add('open');
  }

  renderCustomerAuthView(container, activeTab = 'login') {
    container.innerHTML = `
      <div style="text-align:center; margin-bottom:20px;">
        <span style="font-size:2rem;">👑</span>
        <h2 style="font-family:var(--rooh-font-serif); font-size:1.5rem; color:var(--rooh-dark); margin-bottom:4px;">
          بوابة عملاء روح الملكية
        </h2>
        <p style="font-size:0.85rem; color:var(--rooh-muted);">
          سجلي دخولكِ لمتابعة طلباتكِ وحفظ تركيباتكِ الخاصة
        </p>
      </div>

      <!-- Auth Tabs -->
      <div style="display:flex; border-bottom:1px solid var(--rooh-border); margin-bottom:20px;">
        <button type="button" class="tab-btn ${activeTab === 'login' ? 'active' : ''}" style="flex:1; padding:12px; font-weight:700; border-bottom:2px solid ${activeTab === 'login' ? 'var(--rooh-gold)' : 'transparent'}; color:${activeTab === 'login' ? 'var(--rooh-dark)' : 'var(--rooh-muted)'};" onclick="window.roohApp.renderCustomerAuthView(document.getElementById('customerModalBody'), 'login')">
          تسجيل الدخول
        </button>
        <button type="button" class="tab-btn ${activeTab === 'register' ? 'active' : ''}" style="flex:1; padding:12px; font-weight:700; border-bottom:2px solid ${activeTab === 'register' ? 'var(--rooh-gold)' : 'transparent'}; color:${activeTab === 'register' ? 'var(--rooh-dark)' : 'var(--rooh-muted)'};" onclick="window.roohApp.renderCustomerAuthView(document.getElementById('customerModalBody'), 'register')">
          حساب جديد
        </button>
      </div>

      ${activeTab === 'login' ? `
        <form onsubmit="window.roohApp.handleCustomerLoginSubmit(event)" style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">رقم الهاتف أو البريد الإلكتروني *</label>
            <input type="text" id="custLoginIdentifier" required class="ai-chat-input" style="width:100%; border-radius:8px;" placeholder="01xxxxxxxxx أو yourname@gmail.com" />
          </div>
          <div>
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">كلمة المرور *</label>
            <input type="password" id="custLoginPassword" required class="ai-chat-input" style="width:100%; border-radius:8px;" placeholder="••••••••" />
          </div>
          <button type="submit" class="btn-rooh btn-rooh-primary" style="padding:12px; font-size:1rem; margin-top:8px;">
            <span>تسجيل الدخول</span>
          </button>

          <div style="text-align:center; margin:12px 0; position:relative;">
            <hr style="border:0; border-top:1px solid var(--rooh-border);" />
            <span style="position:absolute; top:-10px; background:#FFF; padding:0 12px; font-size:0.8rem; color:var(--rooh-muted); left:50%; transform:translateX(-50%);">أو</span>
          </div>

          <button type="button" class="btn-rooh btn-rooh-outline" style="width:100%; justify-content:center;" onclick="window.roohApp.handleGoogleLoginSim()">
            <span>الدخول السريع بحساب Google</span>
            <span>🌐</span>
          </button>
        </form>
      ` : `
        <form onsubmit="window.roohApp.handleCustomerRegisterSubmit(event)" style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">الاسم الكريم بالكامل *</label>
            <input type="text" id="custRegName" required class="ai-chat-input" style="width:100%; border-radius:8px;" placeholder="اكتبي اسمكِ ثلاثياً" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">رقم الهاتف (واتساب) *</label>
              <input type="tel" id="custRegPhone" required class="ai-chat-input" style="width:100%; border-radius:8px;" placeholder="01xxxxxxxxx" />
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">البريد الإلكتروني</label>
              <input type="email" id="custRegEmail" class="ai-chat-input" style="width:100%; border-radius:8px;" placeholder="example@gmail.com" />
            </div>
          </div>
          <div>
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">المحافظة *</label>
            <select id="custRegGov" class="select-filter" style="width:100%; border-radius:8px; padding:10px;">
              ${this.governorates.map(g => `<option value="${g.name_ar}">${g.name_ar}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">العنوان التفصيلي</label>
            <input type="text" id="custRegAddress" class="ai-chat-input" style="width:100%; border-radius:8px;" placeholder="الشارع، رقم العمارة، رقم الشقة" />
          </div>
          <div>
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">كلمة المرور *</label>
            <input type="password" id="custRegPassword" required class="ai-chat-input" style="width:100%; border-radius:8px;" placeholder="••••••••" />
          </div>
          <button type="submit" class="btn-rooh btn-rooh-primary" style="padding:12px; font-size:1rem; margin-top:8px;">
            <span>إنشاء الحساب الملكي</span>
          </button>
        </form>
      `}
    `;
  }

  async handleCustomerLoginSubmit(e) {
    e.preventDefault();
    const identifier = document.getElementById('custLoginIdentifier').value;
    const password = document.getElementById('custLoginPassword').value;

    const res = await window.roohDB.customerLogin(identifier, password);
    if (res.error) {
      window.RoohUtil.showToast(res.error, 'error');
      return;
    }

    this.saveCustomer(res.customer);
    window.RoohUtil.showToast(`أهلاً بكِ مجدداً، ${res.customer.name}! ✨`, 'success');
    this.openCustomerModal();
  }

  async handleCustomerRegisterSubmit(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById('custRegName').value,
      phone: document.getElementById('custRegPhone').value,
      email: document.getElementById('custRegEmail').value,
      governorate: document.getElementById('custRegGov').value,
      address: document.getElementById('custRegAddress').value,
      password: document.getElementById('custRegPassword').value
    };

    const res = await window.roohDB.customerRegister(data);
    if (res.error) {
      window.RoohUtil.showToast(res.error, 'error');
      return;
    }

    this.saveCustomer(res.customer);
    window.RoohUtil.showToast(`تم إنشاء حسابكِ بنجاح! أهلاً بكِ في عائلة روح.`, 'success');
    this.openCustomerModal();
  }

  async handleGoogleLoginSim() {
    const demoGoogle = {
      name: 'سارة أحمد',
      email: 'sarah.ahmed@gmail.com',
      phone: '01099887766',
      google_id: `G-${Date.now()}`
    };

    const res = await window.roohDB.customerGoogleLogin(demoGoogle);
    if (res.customer) {
      this.saveCustomer(res.customer);
      window.RoohUtil.showToast(`تم تسجيل الدخول بواسطة Google بنجاح: أهلاً، ${res.customer.name}!`, 'success');
      this.openCustomerModal();
    }
  }

  async renderCustomerProfileView(container) {
    const cust = this.currentCustomer;
    const orders = await window.roohDB.getCustomerOrders(cust.phone, cust.email);

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:14px; border-bottom:1px solid var(--rooh-border);">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:48px; height:48px; border-radius:50%; background:var(--rooh-gold); color:#FFF; display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
            👑
          </div>
          <div>
            <h3 style="font-family:var(--rooh-font-serif); font-size:1.3rem; margin:0; color:var(--rooh-dark);">${cust.name}</h3>
            <span class="badge-tag tag-new" style="font-size:0.75rem;">${cust.tier === 'VIP' ? 'عميل VIP ملكي 💎' : 'عميل مميز 🌿'}</span>
          </div>
        </div>
        <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohApp.handleCustomerLogout()">
          <span>تسجيل خروج</span>
        </button>
      </div>

      <!-- Quick Info Cards -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
        <div style="background:var(--rooh-sand-light); padding:12px; border-radius:10px;">
          <div style="font-size:0.75rem; color:var(--rooh-muted);">الهاتف والمحافظة</div>
          <strong style="font-size:0.9rem; color:var(--rooh-dark);">${cust.phone || '-'} | ${cust.governorate || '-'}</strong>
        </div>
        <div style="background:var(--rooh-sand-light); padding:12px; border-radius:10px;">
          <div style="font-size:0.75rem; color:var(--rooh-muted);">عدد الطلبات السابقة</div>
          <strong style="font-size:0.9rem; color:var(--rooh-gold);">${orders.length} طلبات</strong>
        </div>
      </div>

      <!-- Orders History List -->
      <h4 style="font-size:1rem; color:var(--rooh-dark); margin-bottom:12px;">سجل طلباتكِ في روح</h4>
      <div style="max-height:280px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
        ${orders.length === 0 ? `
          <div style="text-align:center; padding:30px 10px; color:var(--rooh-muted); font-size:0.85rem;">
            لا توجد طلبات سابقة مسجلة حتى الآن.
          </div>
        ` : orders.map(o => `
          <div style="background:#FFF; border:1px solid var(--rooh-border); border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; font-size:0.9rem; color:var(--rooh-dark);">
                طلب #${o.order_number}
                <span class="badge-tag" style="margin-right:6px; font-size:0.75rem;">${o.status}</span>
              </div>
              <div style="font-size:0.75rem; color:var(--rooh-muted); margin-top:2px;">
                ${o.created_at ? o.created_at.split('T')[0] : ''} | الإجمالي: <strong>${window.RoohUtil.formatCurrency(o.total_amount)}</strong>
              </div>
            </div>
            <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.RoohDocumentManager.printInvoice(${JSON.stringify(o).replace(/"/g, '&quot;')})">
              <span>الفاتورة</span>
              <span>🖨️</span>
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  handleCustomerLogout() {
    this.saveCustomer(null);
    window.RoohUtil.showToast('تم تسجيل الخروج بنجاح.', 'info');
    document.getElementById('customerModal')?.classList.remove('open');
  }

  // ================= CHECKOUT & ORDER SUBMISSION =================
  openCheckoutModal() {
    window.roohCart.closeDrawer();
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;

    const sub = window.roohCart.getSubtotal();
    const isFree = sub >= 750;
    const ship = isFree ? 0 : window.roohCart.shippingFee;
    const tot = window.roohCart.getTotal();
    const cust = this.currentCustomer;

    // Use All 27 Governorates in exact required order
    const defaultGov = cust?.governorate || 'القاهرة';
    const zonesSelect = this.governorates.map(g => `
      <option value="${g.name_ar}" data-price="${g.delivery_fee}" ${g.name_ar === defaultGov ? 'selected' : ''}>
        ${g.name_ar} (${g.delivery_fee} ج.م - ${g.delivery_time})
      </option>
    `).join('');

    // Pre-calculate initial shipping fee based on selected governorate
    const currentGovObj = this.governorates.find(g => g.name_ar === defaultGov);
    if (currentGovObj) {
      window.roohCart.shippingFee = currentGovObj.delivery_fee;
    }

    modal.querySelector('.modal-content').innerHTML = `
      <button class="modal-close-btn" onclick="document.getElementById('checkoutModal').classList.remove('open')">&times;</button>
      <h2 style="font-family:var(--rooh-font-serif); font-size:1.6rem; color:var(--rooh-dark); margin-bottom:6px; text-align:center;">
        إتمام الطلب والشحن الفاخر
      </h2>
      <p style="text-align:center; font-size:0.85rem; color:var(--rooh-muted); margin-bottom:24px;">
        شحن لجميع محافظات جمهورية مصر العربية الـ 27 | شحن مجاني للطلبات فوق 750 ج.م
      </p>

      <div class="checkout-grid" style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:30px;">
        <!-- Left: Form -->
        <form id="checkoutSubmitForm" onsubmit="window.roohApp.handleOrderSubmit(event)">
          <h4 style="font-size:1rem; color:var(--rooh-gold); margin-bottom:12px;">1. بيانات التوصيل والاستلام</h4>
          <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
            <div>
              <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">الاسم بالكامل *</label>
              <input type="text" id="chkName" required class="ai-chat-input" style="width:100%; border-radius:8px;" value="${cust?.name || ''}" placeholder="اكتبي اسمكِ ثلاثياً" />
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">رقم الهاتف (واتساب) *</label>
                <input type="tel" id="chkPhone" required class="ai-chat-input" style="width:100%; border-radius:8px;" value="${cust?.phone || ''}" placeholder="01xxxxxxxxx" />
              </div>
              <div>
                <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">البريد الإلكتروني</label>
                <input type="email" id="chkEmail" class="ai-chat-input" style="width:100%; border-radius:8px;" value="${cust?.email || ''}" placeholder="example@gmail.com" />
              </div>
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">المحافظة (الـ 27 محافظة المصرية) *</label>
              <select id="chkGov" class="select-filter" style="width:100%; border-radius:8px; padding:10px;" onchange="window.roohApp.onGovChange(this)">
                ${zonesSelect}
              </select>
            </div>
            <div>
              <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">العنوان التفصيلي واسم الشارع *</label>
              <textarea id="chkAddress" required class="ai-chat-input" style="width:100%; height:65px; border-radius:8px;" placeholder="المدينة، الحي، رقم العمارة، رقم الشقة">${cust?.address || ''}</textarea>
            </div>
          </div>

          <!-- Coupon Code Section -->
          <div style="background:#FFF; border:1px solid var(--rooh-border); border-radius:10px; padding:14px; margin-bottom:24px;">
            <label style="font-size:0.85rem; font-weight:700; color:var(--rooh-dark); display:block; margin-bottom:6px;">هل لديكِ كود خصم؟ 🎟️</label>
            <div style="display:flex; gap:8px;">
              <input type="text" id="chkCouponInput" class="ai-chat-input" placeholder="أدخلي كود الخصم (مثال: ROOH10)" style="flex:1; text-transform:uppercase; border-radius:8px;" />
              <button type="button" class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohApp.applyCheckoutCoupon()">
                تطبيق الكود
              </button>
            </div>
            <div id="couponStatusMsg" style="margin-top:6px; font-size:0.8rem;"></div>
          </div>

          <h4 style="font-size:1rem; color:var(--rooh-gold); margin-bottom:12px;">2. طريقة السداد المعتمدة في مصر</h4>
          <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
            <label style="display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--rooh-border); border-radius:8px; cursor:pointer;">
              <input type="radio" name="chkPayMethod" value="InstaPay" checked onchange="window.roohApp.onPayMethodChange('InstaPay')" />
              <div>
                <strong>InstaPay (الدفع اللحظي إنستاباي)</strong>
                <div style="font-size:0.75rem; color:var(--rooh-muted);">عنوان إنستاباي: <strong>rooh@instapay</strong> | رقم: <strong>01227208589</strong> (عبدالرحمن)</div>
              </div>
            </label>

            <label style="display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--rooh-border); border-radius:8px; cursor:pointer;">
              <input type="radio" name="chkPayMethod" value="Vodafone Cash" onchange="window.roohApp.onPayMethodChange('Vodafone Cash')" />
              <div>
                <strong>فودافون كاش ومحافظ الهاتف (01227208589)</strong>
                <div style="font-size:0.75rem; color:var(--rooh-muted);">تحويل المحفظة إلى رقم الإدارة الرسمي: <strong>01227208589</strong></div>
              </div>
            </label>

            <label style="display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--rooh-border); border-radius:8px; cursor:pointer;">
              <input type="radio" name="chkPayMethod" value="Cash on Delivery" onchange="window.roohApp.onPayMethodChange('Cash on Delivery')" />
              <div>
                <strong>الدفع عند الاستلام (COD)</strong>
                <div style="font-size:0.75rem; color:var(--rooh-muted);">السداد نقداً للمندوب فور فحص ومعاينة الطرد عند باب منزلك</div>
              </div>
            </label>

            <label style="display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--rooh-border); border-radius:8px; cursor:pointer;">
              <input type="radio" name="chkPayMethod" value="Credit Card" onchange="window.roohApp.onPayMethodChange('Credit Card')" />
              <div>
                <strong>بطاقة بنكية (فيزا / ماستركارد - بوابة Paymob)</strong>
                <div style="font-size:0.75rem; color:var(--rooh-muted);">دفع إلكتروني آمن ومشفر 100%</div>
              </div>
            </label>
          </div>

          <div id="paymentProofBox" style="background:#FBF9F5; padding:14px; border:1px dashed var(--rooh-gold); border-radius:8px; margin-bottom:20px;">
            <label style="font-size:0.85rem; font-weight:600; display:block; margin-bottom:4px;">الرقم المرجعي للتحويل أو رقم المحفظة المحول منها *</label>
            <input type="text" id="chkRefCode" required class="ai-chat-input" style="width:100%; border-radius:8px;" placeholder="اكتبي الرقم المرجعي أو رقم هاتفك المحول منه" />
          </div>

          <button type="submit" class="btn-rooh btn-rooh-primary" style="width:100%; font-size:1.1rem; padding:14px;">
            <span>تأكيد الطلب الآن</span>
            <span>👑</span>
          </button>
        </form>

        <!-- Right: Summary -->
        <div style="background:var(--rooh-sand-light); padding:20px; border-radius:12px; height:fit-content; border:1px solid var(--rooh-border);">
          <h4 style="font-size:1.1rem; color:var(--rooh-dark); margin-bottom:14px;">ملخص حقيبة التسوق</h4>
          <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
            ${window.roohCart.items.map(i => `
              <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                <span>${i.name} × ${i.qty}</span>
                <strong>${window.RoohUtil.formatCurrency(i.total_price)}</strong>
              </div>
            `).join('')}
          </div>
          <div style="border-top:1px solid var(--rooh-border); padding-top:12px; display:flex; flex-direction:column; gap:8px; font-size:0.9rem;">
            <div style="display:flex; justify-content:space-between;">
              <span>المجموع الفرعي:</span>
              <span>${window.RoohUtil.formatCurrency(sub)}</span>
            </div>
            <div id="chkDiscountRow" style="display:${window.roohCart.couponDiscount > 0 ? 'flex' : 'none'}; justify-content:space-between; color:var(--rooh-success);">
              <span>خصم الكوبون (${window.roohCart.couponCode}):</span>
              <span id="chkDiscountVal">-${window.RoohUtil.formatCurrency(window.roohCart.couponDiscount)}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span>مصاريف الشحن:</span>
              <span id="chkShippingFeeText">${isFree ? '<strong style="color:var(--rooh-success);">شحن مجاني</strong>' : window.RoohUtil.formatCurrency(ship)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:1.25rem; font-weight:800; color:var(--rooh-gold); border-top:1px solid var(--rooh-border); padding-top:10px; margin-top:4px;">
              <span>المبلغ المستحق:</span>
              <span id="chkTotalText">${window.RoohUtil.formatCurrency(tot)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  onGovChange(selectEl) {
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const price = Number(selectedOption.getAttribute('data-price')) || 45;
    window.roohCart.shippingFee = price;
    const sub = window.roohCart.getSubtotal();
    const isFree = sub >= 750;
    const feeEl = document.getElementById('chkShippingFeeText');
    const totEl = document.getElementById('chkTotalText');
    if (feeEl) feeEl.innerHTML = isFree ? '<strong style="color:var(--rooh-success);">شحن مجاني</strong>' : window.RoohUtil.formatCurrency(price);
    if (totEl) totEl.textContent = window.RoohUtil.formatCurrency(window.roohCart.getTotal());
  }

  onPayMethodChange(method) {
    const proofBox = document.getElementById('paymentProofBox');
    const refInput = document.getElementById('chkRefCode');
    if (!proofBox || !refInput) return;

    if (method === 'Cash on Delivery') {
      proofBox.style.display = 'none';
      refInput.removeAttribute('required');
      refInput.value = 'COD-UPON-DELIVERY';
    } else {
      proofBox.style.display = 'block';
      refInput.setAttribute('required', 'required');
      refInput.value = '';
    }
  }

  async applyCheckoutCoupon() {
    const input = document.getElementById('chkCouponInput');
    const statusMsg = document.getElementById('couponStatusMsg');
    const code = input?.value.trim().toUpperCase();
    if (!code) return;

    const sub = window.roohCart.getSubtotal();
    const res = await window.roohDB.validateCoupon(code, sub);

    if (res.valid) {
      window.roohCart.couponDiscount = res.discount;
      window.roohCart.couponCode = code;

      if (statusMsg) {
        statusMsg.innerHTML = `<span style="color:var(--rooh-success); font-weight:700;">✓ ${res.message}</span>`;
      }

      const discRow = document.getElementById('chkDiscountRow');
      const discVal = document.getElementById('chkDiscountVal');
      const totText = document.getElementById('chkTotalText');

      if (discRow && discVal) {
        discRow.style.display = 'flex';
        discVal.textContent = `-${window.RoohUtil.formatCurrency(res.discount)}`;
      }
      if (totText) {
        totText.textContent = window.RoohUtil.formatCurrency(window.roohCart.getTotal());
      }
      window.RoohUtil.showToast(`تم تطبيق خصم بقيمة ${res.discount} ج.م بنجاح!`, 'success');
    } else {
      if (statusMsg) {
        statusMsg.innerHTML = `<span style="color:var(--rooh-danger); font-weight:700;">✗ ${res.message}</span>`;
      }
      window.RoohUtil.showToast(res.message, 'error');
    }
  }

  async handleOrderSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('chkName').value;
    const phone = document.getElementById('chkPhone').value;
    const email = document.getElementById('chkEmail').value;
    const govSelect = document.getElementById('chkGov');
    const gov = govSelect.options[govSelect.selectedIndex].text.split('(')[0].trim();
    const address = document.getElementById('chkAddress').value;
    const payMethod = document.querySelector('input[name="chkPayMethod"]:checked')?.value || 'InstaPay';
    const refCode = document.getElementById('chkRefCode')?.value || '';

    const sub = window.roohCart.getSubtotal();
    const ship = sub >= 750 ? 0 : window.roohCart.shippingFee;
    const disc = window.roohCart.couponDiscount;
    const tot = window.roohCart.getTotal();

    const orderPayload = {
      customer: { name, phone, email, governorate: gov, address },
      items: window.roohCart.items,
      subtotal: sub,
      discount: disc,
      coupon_code: window.roohCart.couponCode || null,
      shipping_fee: ship,
      total_amount: tot,
      cogs_total: window.roohCart.items.reduce((s, i) => s + (i.unit_cost * i.qty), 0),
      payment_method: payMethod,
      payment_reference: refCode,
      notes: `طلب تم إرساله من متجر سوق روح`
    };

    const newOrder = await window.roohDB.createOrder(orderPayload);

    // Empty cart and reset discount
    window.roohCart.items = [];
    window.roohCart.couponDiscount = 0;
    window.roohCart.couponCode = '';
    window.roohCart.save();

    // Show luxury confirmation modal
    const modal = document.getElementById('checkoutModal');
    modal.querySelector('.modal-content').innerHTML = `
      <div style="text-align:center; padding:30px 10px;">
        <div style="width:70px; height:70px; border-radius:50%; background:linear-gradient(135deg, var(--rooh-gold) 0%, #9C7F3B 100%); color:#FFF; display:flex; align-items:center; justify-content:center; font-size:2rem; margin:0 auto 16px;">
          ✓
        </div>
        <h2 style="font-family:var(--rooh-font-serif); font-size:1.8rem; color:var(--rooh-dark); margin-bottom:8px;">
          تم تسجيل طلبكِ بنجاح!
        </h2>
        <div style="font-size:1.1rem; color:var(--rooh-gold); font-weight:700; margin-bottom:16px;">
          رقم الطلب: #${newOrder.order_number}
        </div>
        <p style="font-size:0.95rem; color:var(--rooh-muted); max-width:500px; margin:0 auto 24px; line-height:1.7;">
          شكراً لاختياركِ روح (ROOH). تم إرسال تفاصيل طلبكِ إلى فريق التجهيز وسيتواصل معكِ مسؤول الشحن لتأكيد موعد التسليم في محافظة <strong>${gov}</strong>.
        </p>

        <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <button class="btn-rooh btn-rooh-primary" onclick="window.RoohDocumentManager.printInvoice(${JSON.stringify(newOrder).replace(/"/g, '&quot;')})">
            <span>طباعة أو تحميل الفاتورة (PDF)</span>
            <span>🖨️</span>
          </button>
          <button class="btn-rooh btn-rooh-outline" onclick="document.getElementById('checkoutModal').classList.remove('open')">
            <span>متابعة التسوق</span>
          </button>
        </div>
      </div>
    `;
  }
}

// Global bootstrap
window.roohApp = new RoohApp();
document.addEventListener('DOMContentLoaded', () => window.roohApp.init());
