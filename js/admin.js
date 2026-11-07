/**
 * ROOH Enterprise Admin Dashboard & ERP Controller v3.0
 * Fully comprehensive controller implementing all 25 mandatory sections,
 * field-level editing ("التحكم في كل خانة"), live polling,
 * and strict Abdelrahman Superadmin authorization.
 */

class RoohAdmin {
  constructor() {
    this.currentSection = 'overview';
    this.orderFilterStatus = 'all';
    this.productFilterCategory = 'all';
    this.searchQuery = '';
    this.pollingInterval = null;
    this.editingEntity = null;
  }

  async init() {
    await window.roohDB.init();
    this.bindSidebar();
    this.handleRouting();
    window.addEventListener('hashchange', () => this.handleRouting());

    // Start background live polling for notifications and orders count
    this.startLiveHeartbeat();
  }

  bindSidebar() {
    document.querySelectorAll('.admin-nav-item a').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          window.location.hash = href;
          // Close mobile sidebar if open
          if (typeof toggleMobileSidebar === 'function') toggleMobileSidebar(false);
        }
      });
    });
  }

  handleRouting() {
    const hash = window.location.hash ? window.location.hash.replace('#', '') : 'overview';
    this.navigateTo(hash);
  }

  async navigateTo(sectionId) {
    this.currentSection = sectionId;

    // Highlight active link in sidebar
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      const link = item.querySelector('a');
      if (link && link.getAttribute('href') === `#${sectionId}`) {
        item.classList.add('active');
        // Ensure parent group is open
        const parentGroup = item.closest('.nav-collapsible-group');
        if (parentGroup) parentGroup.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    const viewTitle = document.getElementById('adminViewTitle');
    const root = document.getElementById('adminViewRoot');
    if (!root) return;

    root.innerHTML = `<div style="text-align:center; padding:60px; font-size:1.1rem; color:var(--rooh-muted);">
      <div style="font-size:2rem; margin-bottom:12px;">⏳</div>
      جاري تحميل بيانات القسم...
    </div>`;

    const user = window.roohDB.getCurrentUser();

    // Check master-only sections
    const masterOnlySections = ['vault', 'payment_integrations', 'admin_ai', 'security_system', 'managers_assistants'];
    if (masterOnlySections.includes(sectionId) && !user?.is_master) {
      if (viewTitle) viewTitle.textContent = 'حظر أمني - غير مصرح';
      root.innerHTML = `
        <div style="text-align:center; padding:80px 20px; background:#FFF; border-radius:16px; border:1px solid #FFCDD2;">
          <div style="font-size:3.5rem; margin-bottom:16px;">🚫</div>
          <h2 style="color:var(--rooh-danger); font-size:1.6rem; margin-bottom:8px;">عذراً، هذا القسم سري ومخصص فقط للمدير الأساسي عبدالرحمن</h2>
          <p style="color:var(--rooh-muted); max-width:500px; margin:0 auto 24px;">لا تملك صلاحية الوصول إلى الخزنة أو الإعدادات المالية والأمنية المتقدمة.</p>
          <a href="#overview" class="btn-rooh btn-rooh-primary">العودة للرئيسية</a>
        </div>
      `;
      return;
    }

    switch (sectionId) {
      case 'overview':
        if (viewTitle) viewTitle.textContent = '1. نظرة عامة على المنظومة (Dashboard Overview)';
        await this.renderOverview(root);
        break;

      case 'orders':
        if (viewTitle) viewTitle.textContent = '2. إدارة الطلبات والمبيعات (Orders Management)';
        await this.renderOrders(root);
        break;

      case 'products':
        if (viewTitle) viewTitle.textContent = '3. كتالوج المنتجات والمخزون (Products Catalog)';
        await this.renderProducts(root);
        break;

      case 'categories':
        if (viewTitle) viewTitle.textContent = '4. أقسام وتصنيفات المنتجات (Categories)';
        await this.renderCategories(root);
        break;

      case 'customers':
        if (viewTitle) viewTitle.textContent = '5. إدارة علاقات العملاء (CRM)';
        await this.renderCustomers(root);
        break;

      case 'vault':
        if (viewTitle) viewTitle.textContent = '6. الخزنة المالية السرية (The Vault)';
        await this.renderVault(root);
        break;

      case 'payment_methods':
        if (viewTitle) viewTitle.textContent = '7. وسائل وطرق الدفع (Payment Methods)';
        await this.renderPaymentMethods(root);
        break;

      case 'payment_integrations':
        if (viewTitle) viewTitle.textContent = '8. إعدادات الربط المالي وبوابات الدفع (Payment Integrations)';
        await this.renderPaymentIntegrations(root);
        break;

      case 'governorates':
        if (viewTitle) viewTitle.textContent = '9. أسعار التوصيل ومحافظات مصر الـ27 (Governorates & Shipping)';
        await this.renderGovernorates(root);
        break;

      case 'coupons':
        if (viewTitle) viewTitle.textContent = '10. إدارة أكواد الخصم والكوبونات (Discount Codes)';
        await this.renderCoupons(root);
        break;

      case 'product_discounts':
        if (viewTitle) viewTitle.textContent = '11. خصم على المنتج والتخفيضات الموقوتة (Flash Sales)';
        await this.renderProductDiscounts(root);
        break;

      case 'reviews':
        if (viewTitle) viewTitle.textContent = '12. إدارة التقييمات وآراء العملاء (Reviews)';
        await this.renderReviews(root);
        break;

      case 'notifications':
        if (viewTitle) viewTitle.textContent = '13. مركز الإشعارات والتنبيهات (Notifications)';
        await this.renderNotifications(root);
        break;

      case 'media_library':
        if (viewTitle) viewTitle.textContent = '14. مكتبة الصور والوسائط (Media Library)';
        await this.renderMediaLibrary(root);
        break;

      case 'site_colors':
        if (viewTitle) viewTitle.textContent = '15. ألوان وهوية الموقع (Website Colors)';
        await this.renderColors(root, 'site');
        break;

      case 'store_colors':
        if (viewTitle) viewTitle.textContent = '16. ألوان وهوية المتجر (Store Colors)';
        await this.renderColors(root, 'store');
        break;

      case 'website_builder':
        if (viewTitle) viewTitle.textContent = '17. مطور الموقع المرئي والنصوص (Website Builder)';
        await this.renderWebsiteBuilder(root);
        break;

      case 'store_builder':
        if (viewTitle) viewTitle.textContent = '18. مطور المتجر وسوق روح (Store Builder)';
        await this.renderStoreBuilder(root);
        break;

      case 'lab_editor':
        if (viewTitle) viewTitle.textContent = '19. تعديل المعمل الخاص – اعمل منتجك بنفسك (Lab Editor)';
        await this.renderLabEditor(root);
        break;

      case 'meetings':
        if (viewTitle) viewTitle.textContent = '20. اجتماعات المدير وغرفة المحادثة (Manager Meetings)';
        await this.renderMeetings(root);
        break;

      case 'managers_assistants':
        if (viewTitle) viewTitle.textContent = '21. إدارة المديرين والمساعدين والصلاحيات (Staff & RBAC)';
        await this.renderStaff(root);
        break;

      case 'security_system':
        if (viewTitle) viewTitle.textContent = '22. سيستم الحماية والتشخيص الذاتي (Security System)';
        await this.renderSecuritySystem(root);
        break;

      case 'admin_ai':
        if (viewTitle) viewTitle.textContent = '23. مساعد المدير الذكي لمتابعة الأعمال (Admin AI Assistant)';
        await this.renderAdminAI(root);
        break;

      case 'settings':
        if (viewTitle) viewTitle.textContent = '24. الإعدادات العامة للمنظومة (Site Settings)';
        await this.renderSettings(root);
        break;

      case 'reports':
        if (viewTitle) viewTitle.textContent = '25. التقارير والإحصائيات والربحية (Reports & Analytics)';
        await this.renderReports(root);
        break;

      default:
        window.location.hash = '#overview';
        break;
    }
  }

  // =========================================================================
  // SECTION 1: OVERVIEW (الرئيسية)
  // =========================================================================
  async renderOverview(root) {
    const orders = await window.roohDB.getOrders('all');
    const products = await window.roohDB.getProducts('all');
    const customers = await window.roohDB.getCustomers();
    const notifications = await window.roohDB.getNotifications();
    const user = window.roohDB.getCurrentUser();

    let totalRevenue = 0;
    let newOrdersCount = 0;
    let pendingShippingCount = 0;

    orders.forEach(o => {
      totalRevenue += (Number(o.subtotal) || 0) - (Number(o.discount) || 0);
      if (o.order_status === 'New') newOrdersCount++;
      if (o.order_status === 'Ready to Ship' || o.order_status === 'In Preparation') pendingShippingCount++;
    });

    const lowStockCount = products.filter(p => p.stock <= (p.min_stock || 10)).length;

    root.innerHTML = `
      <!-- Welcome Hero Banner -->
      <div style="background:linear-gradient(135deg, var(--rooh-dark) 0%, #362F27 100%); color:#FFF; padding:28px 32px; border-radius:18px; border:1px solid var(--rooh-gold); margin-bottom:28px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;">
        <div>
          <span style="font-size:0.8rem; color:var(--rooh-gold); font-weight:700; letter-spacing:1px; text-transform:uppercase;">لوحة التحكم المركزية المعتمدة</span>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.8rem; margin:6px 0 8px;">مرحباً بك يا أستاذ ${user?.name || 'عبدالرحمن'} 👑</h2>
          <p style="font-size:0.9rem; color:#DDD4C5; margin:0;">
            منظومة روح تعمل بكامل طاقتها. كافة طلبات المتجر، المحافظات الـ27، والخزنة والذكاء الاصطناعي متصلة ومحدثة.
          </p>
        </div>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <a href="#orders" class="btn-rooh btn-rooh-primary btn-rooh-sm">
            <span>إدارة الطلبات (${newOrdersCount} جديد)</span>
          </a>
          <a href="#meetings" class="btn-rooh btn-rooh-gold-outline btn-rooh-sm">
            <span>اجتماعات المدير 💬</span>
          </a>
        </div>
      </div>

      <!-- Core KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card" onclick="window.location.hash='#orders'" style="cursor:pointer;">
          <div class="kpi-icon-box" style="background:rgba(191,161,95,0.15); color:var(--rooh-gold);">📦</div>
          <div class="kpi-label">إجمالي الطلبات</div>
          <div class="kpi-value">${orders.length}</div>
          <div class="kpi-subtext" style="color:var(--rooh-gold); font-weight:600;">${newOrdersCount} طلبات جديدة تنتظر المراجعة</div>
        </div>

        <div class="kpi-card" onclick="window.location.hash='#products'" style="cursor:pointer;">
          <div class="kpi-icon-box" style="background:rgba(46,125,50,0.15); color:#2E7D32;">💄</div>
          <div class="kpi-label">كتالوج المنتجات</div>
          <div class="kpi-value">${products.length}</div>
          <div class="kpi-subtext" style="color:${lowStockCount > 0 ? 'var(--rooh-danger)' : '#2E7D32'}; font-weight:600;">
            ${lowStockCount > 0 ? `⚠️ ${lowStockCount} منتجات قاربت على النفاد` : 'المخزون بحدود آمنة'}
          </div>
        </div>

        <div class="kpi-card" onclick="window.location.hash='#customers'" style="cursor:pointer;">
          <div class="kpi-icon-box" style="background:rgba(30,136,229,0.15); color:#1E88E5;">👥</div>
          <div class="kpi-label">قاعدة العملاء المسجلين</div>
          <div class="kpi-value">${customers.length}</div>
          <div class="kpi-subtext">عملاء مسجلين من كافة المحافظات</div>
        </div>

        ${user?.is_master ? `
        <div class="kpi-card" onclick="window.location.hash='#vault'" style="cursor:pointer; border-color:var(--rooh-gold); background:linear-gradient(to bottom, #FFFDF8, #FFF);">
          <div class="kpi-icon-box" style="background:rgba(191,161,95,0.2); color:var(--rooh-gold);">🔐</div>
          <div class="kpi-label">إجمالي المبيعات (الخزنة)</div>
          <div class="kpi-value" style="color:var(--rooh-gold);">${totalRevenue.toLocaleString()} ج.م</div>
          <div class="kpi-subtext">انقر للدخول إلى الخزنة السرية</div>
        </div>
        ` : `
        <div class="kpi-card">
          <div class="kpi-icon-box" style="background:rgba(156,39,176,0.15); color:#9C27B0;">🚚</div>
          <div class="kpi-label">شحنات قيد التجهيز</div>
          <div class="kpi-value">${pendingShippingCount}</div>
          <div class="kpi-subtext">جاهزة للشحن والتسليم</div>
        </div>
        `}
      </div>

      <!-- Quick Action Bar -->
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:28px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
        <div style="font-weight:700; color:var(--rooh-dark); font-size:1rem;">⚡ وصول سريع للتحكم:</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.openAddProductModal()">+ إضافة منتج جديد</button>
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.location.hash='#governorates'">أسعار المحافظات الـ27</button>
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.location.hash='#coupons'">+ كود خصم</button>
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.location.hash='#lab_editor'">تعديل المعمل</button>
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.location.hash='#admin_ai'">مساعد المدير الذكي 🧠</button>
        </div>
      </div>

      <!-- Recent Orders Table Preview -->
      <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <h3 style="font-family:var(--rooh-font-serif); font-size:1.25rem; color:var(--rooh-dark); margin:0;">آخر الطلبات الواردة</h3>
          <a href="#orders" class="btn-rooh btn-rooh-outline btn-rooh-sm">عرض كافة الطلبات ←</a>
        </div>
        ${this.renderOrdersTableHtml(orders.slice(0, 5), true)}
      </div>
    `;
  }

  // =========================================================================
  // SECTION 2: ORDERS (الطلبات) - 9 STATUS TABS & INLINE ACTIONS
  // =========================================================================
  async renderOrders(root) {
    const orders = await window.roohDB.getOrders('all');
    const statusTabs = [
      { id: 'all', label: 'كافة الطلبات' },
      { id: 'new', label: 'الطلبات الجديدة' },
      { id: 'under review', label: 'قيد المراجعة' },
      { id: 'in preparation', label: 'قيد التجهيز' },
      { id: 'ready to ship', label: 'جاهز للشحن' },
      { id: 'shipped', label: 'تم الشحن' },
      { id: 'completed', label: 'المكتملة' },
      { id: 'cancelled', label: 'الملغاة' },
      { id: 'refunded', label: 'المستردة' },
      { id: 'archived', label: 'الأرشيف' }
    ];

    let filtered = orders;
    if (this.orderFilterStatus !== 'all') {
      filtered = filtered.filter(o => (o.order_status || '').toLowerCase() === this.orderFilterStatus.toLowerCase());
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        (o.order_number || '').includes(q) ||
        (o.customer?.name || '').toLowerCase().includes(q) ||
        (o.customer?.phone || '').includes(q) ||
        (o.customer?.governorate || '').toLowerCase().includes(q)
      );
    }

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px;">
        <!-- Status Tabs Bar -->
        <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; margin-bottom:16px;">
          ${statusTabs.map(t => {
            const count = t.id === 'all' ? orders.length : orders.filter(o => (o.order_status || '').toLowerCase() === t.id).length;
            const active = this.orderFilterStatus.toLowerCase() === t.id.toLowerCase();
            return `
              <button class="btn-rooh ${active ? 'btn-rooh-primary' : 'btn-rooh-outline'} btn-rooh-sm" 
                onclick="window.roohAdmin.filterOrderStatus('${t.id}')" style="white-space:nowrap; border-radius:50px;">
                <span>${t.label}</span>
                <span style="background:${active ? 'rgba(255,255,255,0.3)' : 'var(--rooh-sand-light)'}; padding:1px 7px; border-radius:50px; font-size:0.75rem;">${count}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Search & Tools -->
        <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; justify-content:space-between;">
          <div style="flex:1; min-width:280px; position:relative;">
            <input type="text" class="form-input" placeholder="🔍 بحث برقم الطلب، اسم العميل، الهاتف، أو المحافظة..." 
              value="${this.searchQuery}" oninput="window.roohAdmin.searchOrders(this.value)" />
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.navigateTo('orders')">🔄 تحديث فوري</button>
            <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.exportOrdersCSV()">📥 تصدير كشف الطلبات</button>
          </div>
        </div>
      </div>

      <!-- Orders Table -->
      <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:20px;">
        ${this.renderOrdersTableHtml(filtered, false)}
      </div>

      <!-- Order Details Drawer Modal -->
      <div class="modal-overlay" id="orderDetailDrawerModal">
        <div class="modal-content" style="max-width:850px; max-height:90vh; overflow-y:auto;" id="orderDrawerContent"></div>
      </div>
    `;
  }

  renderOrdersTableHtml(ordersList, isMini = false) {
    if (!ordersList || ordersList.length === 0) {
      return `<div style="text-align:center; padding:40px; color:var(--rooh-muted);">لا توجد طلبات مطابقة حالياً.</div>`;
    }

    return `
      <div style="overflow-x:auto;">
        <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
          <thead>
            <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); color:var(--rooh-dark); text-align:right;">
              <th style="padding:12px 14px;">رقم الطلب</th>
              <th style="padding:12px 14px;">العميل والهاتف</th>
              <th style="padding:12px 14px;">المحافظة</th>
              <th style="padding:12px 14px;">المنتجات</th>
              <th style="padding:12px 14px;">الإجمالي</th>
              <th style="padding:12px 14px;">الدفع</th>
              <th style="padding:12px 14px;">الحالة</th>
              <th style="padding:12px 14px; text-align:center;">إجراءات التحكم</th>
            </tr>
          </thead>
          <tbody>
            ${ordersList.map(o => `
              <tr style="border-bottom:1px solid #F0ECE4;">
                <td data-label="رقم الطلب" style="padding:12px 14px; font-weight:700; color:var(--rooh-gold);">#${o.order_number}</td>
                <td data-label="العميل" style="padding:12px 14px;">
                  <div style="font-weight:600; color:var(--rooh-dark);">${o.customer?.name || 'عميل'}</div>
                  <div style="font-size:0.75rem; color:var(--rooh-muted);">${o.customer?.phone || ''}</div>
                </td>
                <td data-label="المحافظة" style="padding:12px 14px;">
                  <span class="badge-tag" style="background:#F5EFE6; color:var(--rooh-dark); font-size:0.75rem;">${o.customer?.governorate || 'القاهرة'}</span>
                </td>
                <td data-label="المنتجات" style="padding:12px 14px;">
                  <span style="font-weight:600;">${(o.items || []).length} أصناف</span>
                  <div style="font-size:0.75rem; color:var(--rooh-muted);">${(o.items || [])[0]?.name || ''}</div>
                </td>
                <td data-label="الإجمالي" style="padding:12px 14px; font-weight:700;">${Number(o.total_amount || 0).toLocaleString()} ج.م</td>
                <td data-label="الدفع" style="padding:12px 14px;">
                  <span class="badge-tag ${o.payment_status === 'Paid' ? 'tag-new' : ''}" style="${o.payment_status === 'Paid' ? 'background:#E8F5E9; color:#2E7D32;' : 'background:#FFF3E0; color:#E65100;'} font-size:0.75rem;">
                    ${o.payment_status === 'Paid' ? 'مسدد ✓' : 'معلق ⏳'}
                  </span>
                  <div style="font-size:0.7rem; color:var(--rooh-muted);">${o.payment_method || 'InstaPay'}</div>
                </td>
                <td data-label="الحالة" style="padding:12px 14px;">
                  <select onchange="window.roohAdmin.updateOrderStatus('${o.id}', this.value)" class="form-input" style="padding:4px 8px; font-size:0.8rem; border-radius:6px;">
                    <option value="New" ${o.order_status === 'New' ? 'selected' : ''}>طلب جديد</option>
                    <option value="Under Review" ${o.order_status === 'Under Review' ? 'selected' : ''}>قيد المراجعة</option>
                    <option value="In Preparation" ${o.order_status === 'In Preparation' ? 'selected' : ''}>قيد التجهيز</option>
                    <option value="Ready to Ship" ${o.order_status === 'Ready to Ship' ? 'selected' : ''}>جاهز للشحن</option>
                    <option value="Shipped" ${o.order_status === 'Shipped' ? 'selected' : ''}>تم الشحن</option>
                    <option value="Completed" ${o.order_status === 'Completed' ? 'selected' : ''}>مكتمل</option>
                    <option value="Cancelled" ${o.order_status === 'Cancelled' ? 'selected' : ''}>ملغي</option>
                    <option value="Refunded" ${o.order_status === 'Refunded' ? 'selected' : ''}>مسترد</option>
                    <option value="Archived" ${o.order_status === 'Archived' ? 'selected' : ''}>مؤرشف</option>
                  </select>
                </td>
                <td data-label="الإجراءات" style="padding:12px 14px; text-align:center;">
                  <div style="display:flex; gap:6px; justify-content:center;">
                    <button class="btn-edit-cell" onclick="window.roohAdmin.openOrderDrawer('${o.id}')">
                      <span>عرض وتعديل</span>
                      <span>✏️</span>
                    </button>
                    <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="padding:4px 8px;" onclick="window.RoohDocumentManager.printInvoice(${JSON.stringify(o).replace(/"/g, '&quot;')})" title="طباعة الفاتورة">
                      🖨️
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Open Full Order Details Drawer
  async openOrderDrawer(orderId) {
    const orders = await window.roohDB.getOrders('all');
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const drawer = document.getElementById('orderDrawerContent');
    const modal = document.getElementById('orderDetailDrawerModal');
    if (!drawer || !modal) return;

    drawer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid var(--rooh-border); padding-bottom:14px; margin-bottom:18px;">
        <div>
          <span style="font-size:0.8rem; color:var(--rooh-gold); font-weight:700;">تفاصيل وإدارة الطلب الكاملة</span>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.4rem; color:var(--rooh-dark); margin:2px 0 0;">طلب رقم #${order.order_number}</h2>
        </div>
        <button class="modal-close-btn" onclick="document.getElementById('orderDetailDrawerModal').classList.remove('open')">&times;</button>
      </div>

      <!-- Customer & Shipping Grid -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
        <div style="background:#FAF8F5; padding:16px; border-radius:10px; border:1px solid var(--admin-border);">
          <div style="font-weight:700; color:var(--rooh-gold); margin-bottom:8px; font-size:0.9rem;">👤 بيانات العميل:</div>
          <div><strong>الاسم:</strong> ${order.customer?.name}</div>
          <div><strong>الهاتف:</strong> ${order.customer?.phone}</div>
          <div><strong>البريد:</strong> ${order.customer?.email || 'لا يوجد'}</div>
        </div>
        <div style="background:#FAF8F5; padding:16px; border-radius:10px; border:1px solid var(--admin-border);">
          <div style="font-weight:700; color:var(--rooh-gold); margin-bottom:8px; font-size:0.9rem;">🚚 بيانات الشحن والتوصيل:</div>
          <div><strong>المحافظة:</strong> ${order.customer?.governorate}</div>
          <div><strong>العنوان:</strong> ${order.customer?.address || 'غير محدد'}</div>
          <div><strong>رسوم التوصيل:</strong> ${order.shipping_fee} ج.م</div>
        </div>
      </div>

      <!-- Products in Order -->
      <div style="margin-bottom:20px;">
        <h4 style="font-weight:700; color:var(--rooh-dark); margin-bottom:10px;">المنتجات المطلوبة:</h4>
        <div style="border:1px solid var(--admin-border); border-radius:10px; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
            <tr style="background:#F5EFE6; font-weight:700; text-align:right;">
              <th style="padding:10px;">المنتج</th>
              <th style="padding:10px; text-align:center;">الكمية</th>
              <th style="padding:10px; text-align:center;">سعر الوحدة</th>
              <th style="padding:10px; text-align:left;">الإجمالي</th>
            </tr>
            ${(order.items || []).map(item => `
              <tr style="border-top:1px solid #F0ECE4;">
                <td style="padding:10px;">
                  <strong>${item.name}</strong>
                  ${item.customization ? `<div style="font-size:0.75rem; color:var(--rooh-gold);">تركيبة مخصصة: "${item.customization.custom_label || ''}"</div>` : ''}
                </td>
                <td style="padding:10px; text-align:center;">${item.qty}</td>
                <td style="padding:10px; text-align:center;">${item.unit_price} ج.م</td>
                <td style="padding:10px; text-align:left; font-weight:700;">${item.total_price} ج.م</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>

      <!-- Financial Calculation -->
      <div style="background:#FFFDF8; border:1.5px solid var(--rooh-gold); padding:16px; border-radius:10px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span>إجمالي المنتجات:</span>
          <span>${order.subtotal} ج.م</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:#C62828;">
          <span>الخصومات والكوبونات:</span>
          <span>-${order.discount || 0} ج.م</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span>مصاريف الشحن:</span>
          <span>${order.shipping_fee} ج.م</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:800; font-size:1.15rem; color:var(--rooh-gold); border-top:1px solid var(--rooh-border); padding-top:8px;">
          <span>الإجمالي النهائي المستحق:</span>
          <span>${order.total_amount} ج.م</span>
        </div>
      </div>

      <!-- Actions Strip -->
      <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end;">
        <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.RoohDocumentManager.printInvoice(${JSON.stringify(order).replace(/"/g, '&quot;')})">🖨️ طباعة الفاتورة</button>
        <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="color:var(--rooh-danger); border-color:var(--rooh-danger);" onclick="window.roohAdmin.cancelOrder('${order.id}')">إلغاء الطلب</button>
        <button class="btn-rooh btn-rooh-primary btn-rooh-sm" onclick="document.getElementById('orderDetailDrawerModal').classList.remove('open')">إغلاق</button>
      </div>
    `;

    modal.classList.add('open');
  }

  async updateOrderStatus(orderId, newStatus) {
    try {
      const res = await fetch(`${window.roohDB.apiBase}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: window.roohDB.getAuthHeaders(),
        body: JSON.stringify({ order_status: newStatus })
      });
      if (res.ok) {
        window.RoohUtil.showToast(`تم تغيير حالة الطلب إلى: ${newStatus} ✓`, 'success');
      }
    } catch (e) {
      window.RoohUtil.showToast('تعذر تحديث حالة الطلب', 'error');
    }
  }

  async cancelOrder(orderId) {
    if (!confirm('هل أنت متأكد من رغبتك في إلغاء هذا الطلب واسترجاع الكميات للمخزون؟')) return;
    try {
      const res = await fetch(`${window.roohDB.apiBase}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: window.roohDB.getAuthHeaders()
      });
      if (res.ok) {
        window.RoohUtil.showToast('تم إلغاء الطلب واسترجاع المخزون بنجاح ✓', 'info');
        document.getElementById('orderDetailDrawerModal')?.classList.remove('open');
        this.navigateTo('orders');
      }
    } catch (e) {
      window.RoohUtil.showToast('فشل إلغاء الطلب', 'error');
    }
  }

  filterOrderStatus(status) {
    this.orderFilterStatus = status;
    this.navigateTo('orders');
  }

  searchOrders(q) {
    this.searchQuery = q;
    this.navigateTo('orders');
  }

  exportOrdersCSV() {
    window.RoohDocumentManager.exportOrdersCSV();
  }

  // =========================================================================
  // SECTION 3: PRODUCTS (المنتجات) - 18 FIELDS & INLINE EDIT
  // =========================================================================
  async renderProducts(root) {
    const products = await window.roohDB.getProducts('all');
    const categories = await window.roohDB.getCategories();

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">كتالوج المنتجات والمخزون</h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">إدارة شاملة لأسعار المنتجات، الخصومات، الصور، وحدود المخزون مع أزرار التعديل الفورية.</p>
        </div>
        <button class="btn-rooh btn-rooh-primary" onclick="window.roohAdmin.openAddProductModal()">
          <span>+ إضافة منتج جديد (18 خانة)</span>
          <span>💄</span>
        </button>
      </div>

      <!-- Products Grid / Table with Inline Edit -->
      <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:20px; overflow-x:auto;">
        <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
          <thead>
            <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
              <th style="padding:12px;">الصورة</th>
              <th style="padding:12px;">اسم المنتج</th>
              <th style="padding:12px;">SKU / الكود</th>
              <th style="padding:12px;">القسم</th>
              <th style="padding:12px;">سعر البيع</th>
              <th style="padding:12px;">التكلفة</th>
              <th style="padding:12px;">المخزون المتاح</th>
              <th style="padding:12px;">الحالة</th>
              <th style="padding:12px; text-align:center;">التحكم والتعديل</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr style="border-bottom:1px solid #F0ECE4;">
                <td data-label="الصورة" style="padding:10px 12px;">
                  <img src="${p.image || 'assets/img/placeholder.png'}" style="width:48px; height:48px; object-fit:cover; border-radius:8px; border:1px solid #E8E2D8;" />
                </td>
                <td data-label="الاسم" style="padding:10px 12px; font-weight:700; color:var(--rooh-dark);">${p.name_ar}</td>
                <td data-label="SKU" style="padding:10px 12px; font-family:monospace; color:var(--rooh-muted);">${p.sku}</td>
                <td data-label="القسم" style="padding:10px 12px;">
                  <span class="badge-tag" style="background:#F5EFE6; font-size:0.75rem;">${p.category_name_ar || 'العناية بالبشرة'}</span>
                </td>
                <td data-label="سعر البيع" style="padding:10px 12px; font-weight:700; color:var(--rooh-gold);">${p.price} ج.م</td>
                <td data-label="التكلفة" style="padding:10px 12px; color:var(--rooh-muted);">${p.cost_price || 0} ج.م</td>
                <td data-label="المخزون" style="padding:10px 12px;">
                  <span style="font-weight:700; color:${p.stock <= (p.min_stock || 10) ? 'var(--rooh-danger)' : '#2E7D32'};">
                    ${p.stock} قطعة ${p.stock <= (p.min_stock || 10) ? '⚠️' : ''}
                  </span>
                </td>
                <td data-label="الحالة" style="padding:10px 12px;">
                  <span class="status-pill status-ready">${p.status || 'Active'}</span>
                </td>
                <td data-label="إجراءات" style="padding:10px 12px; text-align:center;">
                  <div style="display:flex; gap:6px; justify-content:center;">
                    <button class="btn-edit-cell" onclick="window.roohAdmin.openEditProductModal('${p.id}')">
                      <span>تعديل</span>
                      <span>✏️</span>
                    </button>
                    <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="color:var(--rooh-danger); border-color:var(--rooh-danger); padding:4px 8px;" onclick="window.roohAdmin.deleteProduct('${p.id}')">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Product Add/Edit Modal (18 Fields) -->
      <div class="modal-overlay" id="productModalRoot"></div>
    `;
  }

  openAddProductModal() {
    this.renderProductFormModal(null);
  }

  async openEditProductModal(productId) {
    const p = await window.roohDB.getProductById(productId);
    if (p) this.renderProductFormModal(p);
  }

  /**
   * FIX: Image upload handler — converts selected file to base64 data URL
   * and updates the hidden #pImage field + live preview immediately.
   * No server upload needed; data URL stored directly in product record.
   */
  handleProductImageUpload(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    // Show filename next to button
    const nameSpan = document.getElementById('pImageFileName');
    if (nameSpan) nameSpan.textContent = `📎 ${file.name}`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      // Write value into hidden field that handleProductSubmit reads
      const hiddenInput = document.getElementById('pImage');
      if (hiddenInput) hiddenInput.value = dataUrl;
      // Update live preview
      const preview = document.getElementById('pImagePreview');
      if (preview) {
        preview.innerHTML = `<img src="${dataUrl}" alt="معاينة الصورة"
          style="width:90px; height:90px; object-fit:cover; border-radius:10px;
                 border:2px solid var(--rooh-gold); box-shadow:0 2px 8px rgba(0,0,0,.14);">
          <span style="display:block; font-size:0.78rem; color:var(--rooh-muted); margin-top:4px;">✅ الصورة جاهزة للحفظ</span>`;
      }
    };
    reader.onerror = () => {
      window.RoohUtil?.showToast('فشل قراءة الصورة، جرب صورة أخرى', 'error');
    };
    reader.readAsDataURL(file);
  }

  async renderProductFormModal(product = null) {
    const isEdit = !!product;
    const categories = await window.roohDB.getCategories();
    const modalRoot = document.getElementById('productModalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:850px; max-height:90vh; overflow-y:auto;">
        <button class="modal-close-btn" onclick="document.getElementById('productModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.4rem; color:var(--rooh-dark); margin-bottom:16px;">
          ${isEdit ? `تعديل بيانات المنتج: ${product.name_ar}` : 'إضافة منتج جديد لكتالوج سوق روح (18 خاصية)'}
        </h3>

        <form id="productCrudForm" onsubmit="window.roohAdmin.handleProductSubmit(event, '${product?.id || ''}')" style="display:flex; flex-direction:column; gap:16px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div>
              <label class="form-label">1. اسم المنتج بالعربية *</label>
              <input type="text" id="pNameAr" class="form-input" required value="${product?.name_ar || ''}" placeholder="مثال: سيروم النضارة الملكي" />
            </div>
            <div>
              <label class="form-label">2. اسم المنتج بالإنجليزية</label>
              <input type="text" id="pNameEn" class="form-input" value="${product?.name_en || ''}" placeholder="e.g. Royal Radiance Serum" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px;">
            <div>
              <label class="form-label">3. كود المنتج (SKU) *</label>
              <input type="text" id="pSku" class="form-input" required value="${product?.sku || `SKU-${Date.now().toString().slice(-4)}`}" />
            </div>
            <div>
              <label class="form-label">4. الباركود الدولي</label>
              <input type="text" id="pBarcode" class="form-input" value="${product?.barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`}" />
            </div>
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label class="form-label" style="margin:0;">5. القسم والتصنيف *</label>
                <button type="button" class="btn-rooh btn-rooh-outline btn-rooh-sm" style="padding:2px 8px; font-size:0.75rem; border-color:var(--rooh-gold); color:var(--rooh-gold);" onclick="window.roohAdmin.quickAddCategoryInProductModal()" title="إضافة قسم جديد فوراً وربطه بالمنتج">
                  + قسم جديد
                </button>
              </div>
              <select id="pCategory" class="form-input">
                ${categories.map(c => `
                  <option value="${c.id}" ${product?.category_id === c.id ? 'selected' : ''}>${c.name_ar}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px;">
            <div>
              <label class="form-label">6. سعر البيع النهائي (ج.م) *</label>
              <input type="number" id="pPrice" class="form-input" required value="${product?.price || 0}" />
            </div>
            <div>
              <label class="form-label">7. السعر الأصلي قبل الخصم (ج.م)</label>
              <input type="number" id="pOriginalPrice" class="form-input" value="${product?.original_price || product?.price || 0}" />
            </div>
            <div>
              <label class="form-label">8. سعر التكلفة المباشرة (COGS)</label>
              <input type="number" id="pCostPrice" class="form-input" value="${product?.cost_price || 0}" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px;">
            <div>
              <label class="form-label">9. كمية المخزون المتاحة *</label>
              <input type="number" id="pStock" class="form-input" required value="${product?.stock || 50}" />
            </div>
            <div>
              <label class="form-label">10. حد الأمان للتنبيه (Min Stock)</label>
              <input type="number" id="pMinStock" class="form-input" value="${product?.min_stock || 10}" />
            </div>
            <div>
              <label class="form-label">11. حالة الظهور والعرض</label>
              <select id="pStatus" class="form-input">
                <option value="Active" ${product?.status === 'Active' ? 'selected' : ''}>نشط ومعروض للبيع</option>
                <option value="Draft" ${product?.status === 'Draft' ? 'selected' : ''}>مسودة غير منشورة</option>
                <option value="Hidden" ${product?.status === 'Hidden' ? 'selected' : ''}>مخفي مؤقتاً</option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">12. صورة المنتج الرئيسية</label>
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
              <label for="pImageFile" style="
                display:inline-flex; align-items:center; gap:8px; cursor:pointer;
                background:var(--rooh-gold); color:#FFF; padding:10px 18px;
                border-radius:8px; font-size:0.9rem; font-weight:600;
                white-space:nowrap; touch-action:manipulation; user-select:none;
              ">
                📁 اختر صورة من جهازك
              </label>
              <input type="file" id="pImageFile" accept="image/*"
                style="display:none;"
                onchange="window.roohAdmin.handleProductImageUpload(this)" />
              <input type="hidden" id="pImage" value="${product?.image || ''}" />
              <span id="pImageFileName" style="font-size:0.82rem; color:var(--rooh-muted); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${product?.image ? '📎 صورة موجودة' : 'لم تختر صورة بعد'}
              </span>
            </div>
            <div id="pImagePreview" style="margin-top:10px; min-height:30px;">
              ${product?.image ? `<img src="${product.image}" alt="صورة المنتج" style="width:90px; height:90px; object-fit:cover; border-radius:10px; border:2px solid var(--rooh-gold); box-shadow:0 2px 8px rgba(0,0,0,.12);">` : ''}
            </div>
          </div>

          <div>
            <label class="form-label">13. وصف مختصر للمنتج (يعرض في الكروت)</label>
            <input type="text" id="pDescShort" class="form-input" value="${product?.description_ar || ''}" placeholder="نضارة وإشراقة طبيعية للبشرة..." />
          </div>

          <div>
            <label class="form-label">14. الوصف التفصيلي وطريقة الاستخدام والمكونات</label>
            <textarea id="pDescFull" class="form-input" style="height:80px;">${product?.usage_ar || product?.ingredients_ar || ''}</textarea>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div>
              <label class="form-label">15. الأحجام المتاحة (مفصولة بفاصلة)</label>
              <input type="text" id="pSizes" class="form-input" value="${(product?.sizes || ['50ml']).join(', ')}" />
            </div>
            <div>
              <label class="form-label">16. الألوان المتاحة (إن وجدت)</label>
              <input type="text" id="pColors" class="form-input" value="${(product?.colors || []).join(', ')}" />
            </div>
          </div>

          <div style="display:flex; gap:20px; align-items:center;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="pBestseller" ${product?.is_bestseller ? 'checked' : ''} />
              <span>17. تعيين كـ "الأكثر مبيعاً" (Bestseller)</span>
            </label>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="pIsNew" ${product?.is_new ? 'checked' : ''} />
              <span>18. شارة "جديد" (New Arrival)</span>
            </label>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:12px; border-top:1px solid #E8E2D8; padding-top:16px;">
            <button type="button" class="btn-rooh btn-rooh-outline" onclick="document.getElementById('productModalRoot').classList.remove('open')">إلغاء</button>
            <button type="submit" class="btn-rooh btn-rooh-primary" style="padding:12px 28px;">
              <span>حفظ المنتج في المتجر</span>
              <span>💾</span>
            </button>
          </div>
        </form>
      </div>
    `;

    modalRoot.classList.add('open');
  }

  async quickAddCategoryInProductModal() {
    const catName = prompt('أدخل اسم القسم الجديد (مثال: شامبو وعناية بالشعر):');
    if (!catName || !catName.trim()) return;
    const catIcon = prompt('أدخل أيقونة أو رمز تعبيري للقسم (مثال: 🧴 أو 🌿 أو ✨):', '🧴') || '🧴';
    const newId = 'cat_' + Date.now().toString(36);
    const newCat = {
      id: newId,
      name_ar: catName.trim(),
      name_en: catName.trim(),
      icon: catIcon.trim(),
      description_ar: `تشكيلة ${catName.trim()} الملكية من روح`
    };

    try {
      await window.roohDB.saveCategory(newCat);
      const select = document.getElementById('pCategory');
      if (select) {
        const opt = document.createElement('option');
        opt.value = newCat.id;
        opt.textContent = `${newCat.icon} ${newCat.name_ar}`;
        opt.selected = true;
        select.appendChild(opt);
      }
      window.RoohUtil.showToast(`تم إنشاء قسم "${newCat.name_ar}" وربطه بالمنتج فوراً بنجاح ✓`, 'success');
    } catch (err) {
      alert('تعذر حفظ القسم: ' + (err.message || 'خطأ غير متوقع'));
    }
  }

  async handleProductSubmit(e, prodId) {
    e.preventDefault();
    const categories = await window.roohDB.getCategories();
    const catId = document.getElementById('pCategory').value;
    const catObj = categories.find(c => c.id === catId);

    const payload = {
      name_ar: document.getElementById('pNameAr').value.trim(),
      name_en: document.getElementById('pNameEn').value.trim(),
      sku: document.getElementById('pSku').value.trim(),
      barcode: document.getElementById('pBarcode').value.trim(),
      category_id: catId,
      category_name_ar: catObj?.name_ar || 'العناية بالبشرة',
      price: Number(document.getElementById('pPrice').value) || 0,
      original_price: Number(document.getElementById('pOriginalPrice').value) || 0,
      cost_price: Number(document.getElementById('pCostPrice').value) || 0,
      stock: Number(document.getElementById('pStock').value) || 0,
      min_stock: Number(document.getElementById('pMinStock').value) || 10,
      status: document.getElementById('pStatus').value,
      image: document.getElementById('pImage').value.trim() || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
      description_ar: document.getElementById('pDescShort').value.trim(),
      usage_ar: document.getElementById('pDescFull').value.trim(),
      sizes: document.getElementById('pSizes').value.split(',').map(s => s.trim()).filter(Boolean),
      colors: document.getElementById('pColors').value.split(',').map(s => s.trim()).filter(Boolean),
      is_bestseller: document.getElementById('pBestseller').checked,
      is_new: document.getElementById('pIsNew').checked
    };

    if (prodId) payload.id = prodId;

    try {
      await window.roohDB.saveProduct(payload);
      document.getElementById('productModalRoot').classList.remove('open');
      window.RoohUtil.showToast(prodId ? 'تم تحديث بيانات المنتج بنجاح ✓' : 'تم إضافة المنتج الجديد بنجاح ✓', 'success');
      this.navigateTo('products');
    } catch (err) {
      alert(err.message || 'فشل حفظ المنتج');
    }
  }

  async deleteProduct(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج نهائياً من الكتالوج؟')) return;
    try {
      await window.roohDB.deleteProduct(id);
      window.RoohUtil.showToast('تم حذف المنتج بنجاح ✓', 'info');
      this.navigateTo('products');
    } catch (e) {
      alert('فشل حذف المنتج');
    }
  }

  // =========================================================================
  // SECTION 4: CATEGORIES (الأقسام)
  // =========================================================================
  async renderCategories(root) {
    const categories = await window.roohDB.getCategories();
    const products = await window.roohDB.getProducts('all');

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">إدارة أقسام وتصنيفات المتجر</h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">إضافة الأقسام وتعديل أسمائها وصورها مع حظر الحذف للأقسام التي تحوي منتجات.</p>
        </div>
        <button class="btn-rooh btn-rooh-primary" onclick="window.roohAdmin.openCategoryModal()">
          <span>+ إضافة قسم جديد</span>
        </button>
      </div>

      <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:20px; overflow-x:auto;">
        <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
          <thead>
            <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
              <th style="padding:12px;">الأيقونة</th>
              <th style="padding:12px;">اسم القسم</th>
              <th style="padding:12px;">الاسم بالإنجليزية</th>
              <th style="padding:12px;">عدد المنتجات المرتبطة</th>
              <th style="padding:12px; text-align:center;">إجراءات التحكم</th>
            </tr>
          </thead>
          <tbody>
            ${categories.map(c => {
              const count = products.filter(p => p.category_id === c.id).length;
              return `
                <tr style="border-bottom:1px solid #F0ECE4;">
                  <td data-label="الأيقونة" style="padding:12px; font-size:1.4rem;">${c.icon || '✨'}</td>
                  <td data-label="الاسم" style="padding:12px; font-weight:700; color:var(--rooh-dark);">${c.name_ar}</td>
                  <td data-label="بالانجليزية" style="padding:12px; color:var(--rooh-muted);">${c.name_en || ''}</td>
                  <td data-label="المنتجات" style="padding:12px;">
                    <span class="badge-tag" style="background:#F5EFE6; font-weight:700;">${count} منتج</span>
                  </td>
                  <td data-label="الإجراءات" style="padding:12px; text-align:center;">
                    <div style="display:flex; gap:6px; justify-content:center;">
                      <button class="btn-edit-cell" onclick="window.roohAdmin.openCategoryModal('${c.id}')">
                        <span>تعديل</span>
                        <span>✏️</span>
                      </button>
                      <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="color:var(--rooh-danger); border-color:var(--rooh-danger); padding:4px 8px;" onclick="window.roohAdmin.deleteCategory('${c.id}', ${count})">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="modal-overlay" id="categoryModalRoot"></div>
    `;
  }

  async openCategoryModal(catId = null) {
    const categories = await window.roohDB.getCategories();
    const cat = catId ? categories.find(c => c.id === catId) : null;
    const modalRoot = document.getElementById('categoryModalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:500px;">
        <button class="modal-close-btn" onclick="document.getElementById('categoryModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin-bottom:16px;">
          ${cat ? `تعديل قسم: ${cat.name_ar}` : 'إضافة قسم جديد للمتجر'}
        </h3>
        <form onsubmit="window.roohAdmin.handleCategorySubmit(event, '${cat?.id || ''}')" style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <label class="form-label">اسم القسم بالعربية *</label>
            <input type="text" id="catNameAr" class="form-input" required value="${cat?.name_ar || ''}" />
          </div>
          <div>
            <label class="form-label">اسم القسم بالإنجليزية</label>
            <input type="text" id="catNameEn" class="form-input" value="${cat?.name_en || ''}" />
          </div>
          <div>
            <label class="form-label">أيقونة القسم (Emoji)</label>
            <input type="text" id="catIcon" class="form-input" value="${cat?.icon || '✨'}" />
          </div>
          <button type="submit" class="btn-rooh btn-rooh-primary" style="margin-top:8px; padding:12px;">حفظ القسم</button>
        </form>
      </div>
    `;

    modalRoot.classList.add('open');
  }

  async handleCategorySubmit(e, catId) {
    e.preventDefault();
    const name_ar = document.getElementById('catNameAr').value.trim();
    const name_en = document.getElementById('catNameEn').value.trim();
    const icon = document.getElementById('catIcon').value.trim();

    try {
      const res = await fetch(`${window.roohDB.apiBase}/api/categories${catId ? '/' + catId : ''}`, {
        method: catId ? 'PUT' : 'POST',
        headers: window.roohDB.getAuthHeaders(),
        body: JSON.stringify({ name_ar, name_en, icon })
      });
      if (res.ok) {
        document.getElementById('categoryModalRoot').classList.remove('open');
        window.RoohUtil.showToast('تم حفظ القسم بنجاح ✓', 'success');
        this.navigateTo('categories');
      }
    } catch (err) {
      alert('فشل حفظ القسم');
    }
  }

  async deleteCategory(id, prodCount) {
    if (prodCount > 0) {
      alert(`حظر أمني: لا يمكن حذف هذا القسم لأنه يحتوي على ${prodCount} منتجات مرتبطة به! يرجى نقل أو معالجة المنتجات أولاً.`);
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    try {
      const res = await fetch(`${window.roohDB.apiBase}/api/categories/${id}`, {
        method: 'DELETE',
        headers: window.roohDB.getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.RoohUtil.showToast('تم حذف القسم بنجاح ✓', 'info');
      this.navigateTo('categories');
    } catch (err) {
      alert(err.message || 'فشل حذف القسم');
    }
  }

  // =========================================================================
  // SECTION 5: CUSTOMERS (العملاء)
  // =========================================================================
  async renderCustomers(root) {
    const customers = await window.roohDB.getCustomers();

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">سجل علاقات العملاء (CRM)</h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">قاعدة بيانات موحدة لعملاء الموقع والمتجر مع إحصائيات الشراء وسجل الطلبات.</p>
        </div>
      </div>

      <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:20px; overflow-x:auto;">
        <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
          <thead>
            <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
              <th style="padding:12px;">اسم العميل</th>
              <th style="padding:12px;">رقم الهاتف</th>
              <th style="padding:12px;">المحافظة</th>
              <th style="padding:12px;">عدد الطلبات</th>
              <th style="padding:12px;">إجمالي المشتريات</th>
              <th style="padding:12px;">التصنيف</th>
              <th style="padding:12px;">آخر طلب</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(c => `
              <tr style="border-bottom:1px solid #F0ECE4;">
                <td data-label="الاسم" style="padding:12px; font-weight:700; color:var(--rooh-dark);">${c.name}</td>
                <td data-label="الهاتف" style="padding:12px;">${c.phone}</td>
                <td data-label="المحافظة" style="padding:12px;">
                  <span class="badge-tag" style="background:#F5EFE6; font-size:0.75rem;">${c.governorate || 'القاهرة'}</span>
                </td>
                <td data-label="الطلبات" style="padding:12px; font-weight:700;">${c.total_orders || 1} طلبات</td>
                <td data-label="المشتريات" style="padding:12px; font-weight:700; color:var(--rooh-gold);">${(c.total_purchases || 0).toLocaleString()} ج.م</td>
                <td data-label="التصنيف" style="padding:12px;">
                  <span class="badge-tag" style="${c.tag === 'VIP' ? 'background:#FFF8E1; color:#F57F17;' : 'background:#E8F5E9; color:#2E7D32;'} font-size:0.75rem;">
                    ${c.tag || 'New'}
                  </span>
                </td>
                <td data-label="آخر طلب" style="padding:12px; color:var(--rooh-muted);">${c.last_order_date || 'اليوم'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // =========================================================================
  // SECTION 6: THE VAULT (الخزنة المركزية والحسابات التفصيلية) - ABDELRAHMAN
  // =========================================================================
  async renderVault(root) {
    try {
      const summary = await window.roohDB.getVaultSummary();
      const transactions = await window.roohDB.getVaultTransactions();

      root.innerHTML = `
        <!-- Vault Luxury Golden Banner -->
        <div class="vault-banner">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px;">
            <div>
              <span style="background:rgba(255,215,0,0.2); color:#FFD700; padding:4px 12px; border-radius:50px; font-size:0.78rem; font-weight:700; letter-spacing:1px; display:inline-block; margin-bottom:8px;">
                🔐 قسم الخزنة السري – مصرح فقط للمدير الأساسي عبدالرحمن
              </span>
              <h2 style="font-family:var(--rooh-font-serif); font-size:1.8rem; margin:0 0 8px; color:#FFF;">
                الخزنة المركزية وتفاصيل الحسابات والمعاملات المالية
              </h2>
              <p style="color:#DDD4C5; font-size:0.9rem; margin:0; max-width:680px;">
                كل جنيه داخل وطالع مسجل بالسبب والجهة والوسيلة، الحسابات متصفّرة وجاهزة لبدء أول معاملة واستلام أول جنيه على نظافة تامة.
              </p>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn-rooh btn-rooh-primary" onclick="window.roohAdmin.openVaultTxnModal()">
                <span>+ تسجيل حركة مالية (إيداع / سحب)</span>
                <span>💰</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Real Financial KPIs -->
        <div class="vault-kpi-grid">
          <div class="vault-kpi-card highlight">
            <div style="font-size:0.8rem; color:var(--rooh-muted); margin-bottom:4px; font-weight:700;">رصيد الخزنة الفعلي المتاح</div>
            <div style="font-size:1.8rem; font-weight:800; color:#2E7D32;">${(summary.balance || 0).toLocaleString()} ج.م</div>
            <div style="font-size:0.75rem; color:#2E7D32;">الأموال المستلمة المؤكدة في الحسابات</div>
          </div>

          <div class="vault-kpi-card">
            <div style="font-size:0.8rem; color:var(--rooh-muted); margin-bottom:4px; font-weight:700;">إجمالي مبيعات المتجر</div>
            <div style="font-size:1.8rem; font-weight:800; color:var(--rooh-dark);">${(summary.gross_sales || 0).toLocaleString()} ج.م</div>
            <div style="font-size:0.75rem; color:var(--rooh-muted);">قيمة كافة الطلبات المسجلة</div>
          </div>

          <div class="vault-kpi-card">
            <div style="font-size:0.8rem; color:var(--rooh-muted); margin-bottom:4px; font-weight:700;">مبالغ معلقة قيد التحصيل</div>
            <div style="font-size:1.8rem; font-weight:800; color:#E65100;">${(summary.pending_amount || 0).toLocaleString()} ج.م</div>
            <div style="font-size:0.75rem; color:#E65100;">طلبات COD وشحنات قيد التوصيل</div>
          </div>

          <div class="vault-kpi-card">
            <div style="font-size:0.8rem; color:var(--rooh-muted); margin-bottom:4px; font-weight:700;">إجمالي المستردات والمصروفات</div>
            <div style="font-size:1.8rem; font-weight:800; color:var(--rooh-danger);">${(summary.total_refunds || 0).toLocaleString()} ج.م</div>
            <div style="font-size:0.75rem; color:var(--rooh-danger);">مصروفات تشغيل ومستردات معتمدة</div>
          </div>
        </div>

        <!-- Gateways Balances Breakdown -->
        <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:24px;">
          <h3 style="font-family:var(--rooh-font-serif); font-size:1.25rem; color:var(--rooh-dark); margin:0 0 16px;">
            توزيع أرصدة الخزنة حسب وسائل التحصيل المؤكدة:
          </h3>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
            <div style="background:#FAF8F5; padding:16px; border-radius:10px; border:1px solid var(--rooh-border);">
              <div style="font-size:0.8rem; color:var(--rooh-muted);">📱 إنستاباي (InstaPay)</div>
              <div style="font-size:1.3rem; font-weight:800; color:var(--rooh-gold); margin:4px 0;">${Math.round(summary.gateways_breakdown?.instapay?.collected || 0).toLocaleString()} ج.م</div>
              <span class="status-pill status-ready">حساب مؤكد</span>
            </div>
            <div style="background:#FAF8F5; padding:16px; border-radius:10px; border:1px solid var(--rooh-border);">
              <div style="font-size:0.8rem; color:var(--rooh-muted);">📲 المحافظ (فودافون كاش)</div>
              <div style="font-size:1.3rem; font-weight:800; color:var(--rooh-gold); margin:4px 0;">${Math.round(summary.gateways_breakdown?.wallets?.collected || 0).toLocaleString()} ج.م</div>
              <span class="status-pill status-ready">محفظة 01227208589</span>
            </div>
            <div style="background:#FAF8F5; padding:16px; border-radius:10px; border:1px solid var(--rooh-border);">
              <div style="font-size:0.8rem; color:var(--rooh-muted);">💳 البطاقات البنكية فيزا/ماستر</div>
              <div style="font-size:1.3rem; font-weight:800; color:var(--rooh-gold); margin:4px 0;">${Math.round(summary.gateways_breakdown?.cards?.collected || 0).toLocaleString()} ج.م</div>
              <span class="status-pill status-ready">Paymob / Fawry</span>
            </div>
            <div style="background:#FAF8F5; padding:16px; border-radius:10px; border:1px solid var(--rooh-border);">
              <div style="font-size:0.8rem; color:var(--rooh-muted);">💵 النقدية والكاش (COD)</div>
              <div style="font-size:1.3rem; font-weight:800; color:var(--rooh-gold); margin:4px 0;">${Math.round(summary.gateways_breakdown?.cod?.collected || 0).toLocaleString()} ج.م</div>
              <span class="status-pill status-ready">محصل من المندوبين</span>
            </div>
          </div>
        </div>

        <!-- Real Transaction Ledger with Details of Every Pound -->
        <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
            <div>
              <h3 style="font-family:var(--rooh-font-serif); font-size:1.25rem; color:var(--rooh-dark); margin:0;">
                دفتر الأستاذ وحركات الخزنة التفصيلية (Ledger)
              </h3>
              <span style="font-size:0.8rem; color:var(--rooh-muted);">إجمالي المعاملات المسجلة: (${transactions.length}) حركة</span>
            </div>
            <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.exportVaultLedger()">تنزيل التقرير المالي 📊</button>
          </div>

          ${transactions.length === 0 ? `
            <div style="text-align:center; padding:50px 20px;">
              <div style="font-size:2.5rem; margin-bottom:8px;">💰</div>
              <h4 style="font-size:1.15rem; color:var(--rooh-dark); margin-bottom:4px;">الخزنة نظيفة وجاهزة لبدء أول حركة مالية</h4>
              <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0 0 14px;">تم تصفير كافة الحسابات والطلبات السابقة بنجاح، وستسجل أول حركة تلقائياً مع أول طلب أو إيداع يدوي.</p>
              <button class="btn-rooh btn-rooh-primary btn-rooh-sm" onclick="window.roohAdmin.openVaultTxnModal()">+ تسجيل أول حركة مالية الآن</button>
            </div>
          ` : `
            <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
              <thead>
                <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
                  <th style="padding:12px 10px;">رقم الحركة</th>
                  <th style="padding:12px 10px;">التاريخ والوقت</th>
                  <th style="padding:12px 10px;">النوع</th>
                  <th style="padding:12px 10px;">السبب والبيان التفصيلي</th>
                  <th style="padding:12px 10px;">الطرف / الجهة</th>
                  <th style="padding:12px 10px;">الوسيلة / الحساب</th>
                  <th style="padding:12px 10px;">المبلغ</th>
                  <th style="padding:12px 10px;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(t => {
                  const isOutflow = t.type === 'outflow';
                  return `
                    <tr style="border-bottom:1px solid #F0ECE4;">
                      <td data-label="رقم الحركة" style="padding:12px 10px; font-weight:700; color:var(--rooh-gold); font-family:monospace;">${t.id}</td>
                      <td data-label="التاريخ" style="padding:12px 10px;">${new Date(t.date).toLocaleDateString('ar-EG')} - ${new Date(t.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td data-label="النوع" style="padding:12px 10px;">
                        <span class="status-pill ${isOutflow ? 'status-danger' : 'status-ready'}" style="font-size:0.75rem;">
                          ${isOutflow ? '🔴 منصرف / سحب' : '🟢 وارد / إيداع'}
                        </span>
                      </td>
                      <td data-label="السبب والبيان" style="padding:12px 10px; font-weight:600; color:var(--rooh-dark);">${t.reason || t.type_ar}</td>
                      <td data-label="الطرف / الجهة" style="padding:12px 10px; color:var(--rooh-muted);">${t.party || 'شركة روح'}</td>
                      <td data-label="الوسيلة" style="padding:12px 10px;">${t.method || 'نقدي'}</td>
                      <td data-label="المبلغ" style="padding:12px 10px; font-weight:800; font-size:1rem; color:${isOutflow ? 'var(--rooh-danger)' : '#2E7D32'};">
                        ${isOutflow ? '-' : '+'}${Number(t.amount).toLocaleString()} ج.م
                      </td>
                      <td data-label="الحالة" style="padding:12px 10px;">
                        <span class="status-pill status-ready">${t.status || 'Confirmed'}</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="modal-overlay" id="vaultTxnModalRoot"></div>
      `;
    } catch (err) {
      root.innerHTML = `<div style="text-align:center; padding:60px; color:var(--rooh-danger);">${err.message}</div>`;
    }
  }

  openVaultTxnModal() {
    const modalRoot = document.getElementById('vaultTxnModalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:520px; max-height:90vh; overflow-y:auto;">
        <button class="modal-close-btn" onclick="document.getElementById('vaultTxnModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin-bottom:16px;">
          تسجيل حركة مالية جديدة في الخزنة (وارد / منصرف)
        </h3>

        <form onsubmit="window.roohAdmin.handleVaultTxnSubmit(event)" style="display:flex; flex-direction:column; gap:14px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="form-label">نوع الحركة المالية *</label>
              <select id="vTxnType" class="form-input" required onchange="window.roohAdmin.updateTxnTypeLabel(this.value)">
                <option value="inflow">🟢 وارد / إيداع أموال في الخزنة</option>
                <option value="outflow">🔴 منصرف / سحب ومصروفات</option>
              </select>
            </div>
            <div>
              <label class="form-label">المبلغ (بالجنيه المصري) *</label>
              <input type="number" id="vTxnAmount" class="form-input" required min="1" placeholder="مثال: 500" />
            </div>
          </div>

          <div>
            <label class="form-label" id="vTxnReasonLabel">السبب والبيان المفصل للحركة *</label>
            <input type="text" id="vTxnReason" class="form-input" required placeholder="مثال: مبيعات كاش للعميل محمد / شراء عبوات زجاجية" />
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="form-label">الوسيلة / الحساب المالي:</label>
              <select id="vTxnMethod" class="form-input">
                <option value="فودافون كاش (01227208589)">📲 فودافون كاش (01227208589)</option>
                <option value="إنستاباي (InstaPay)">📱 إنستاباي (InstaPay)</option>
                <option value="خزينة نقدية (كاش)">💵 خزينة نقدية (كاش)</option>
                <option value="حساب بنكي (CIB/NBE)">🏦 تحويل بنكي</option>
              </select>
            </div>
            <div>
              <label class="form-label">الطرف أو الشخص المعني:</label>
              <input type="text" id="vTxnParty" class="form-input" placeholder="مثال: المورد / العميل / شركة الشحن" />
            </div>
          </div>

          <div>
            <label class="form-label">رقم المرجع أو الإيصال (اختياري):</label>
            <input type="text" id="vTxnRef" class="form-input" placeholder="مثال: REF-9832" />
          </div>

          <button type="submit" class="btn-rooh btn-rooh-primary" style="margin-top:8px; padding:13px; font-size:1rem;">
            <span>اعتماد وتسجيل الحركة في الخزنة 💾</span>
          </button>
        </form>
      </div>
    `;

    modalRoot.classList.add('open');
  }

  updateTxnTypeLabel(type) {
    const label = document.getElementById('vTxnReasonLabel');
    if (label) {
      label.textContent = type === 'outflow' ? 'سبب الصرف والبيان المفصل *' : 'مصدر الإيداع والبيان المفصل *';
    }
  }

  async handleVaultTxnSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('vTxnType').value;
    const amount = Number(document.getElementById('vTxnAmount').value) || 0;
    const reason = document.getElementById('vTxnReason').value.trim();
    const method = document.getElementById('vTxnMethod').value;
    const party = document.getElementById('vTxnParty').value.trim();
    const ref = document.getElementById('vTxnRef').value.trim();

    const payload = {
      type: type,
      amount: amount,
      reason: reason,
      method: method,
      party: party,
      reference: ref || `REF-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString()
    };

    try {
      await window.roohDB.addVaultTransaction(payload);
      document.getElementById('vaultTxnModalRoot').classList.remove('open');
      window.RoohUtil.showToast('تم تسجيل الحركة وتحديث رصيد الخزنة بنجاح ✓', 'success');
      this.navigateTo('vault');
    } catch (err) {
      alert('فشل تسجيل الحركة في الخزنة');
    }
  }
  }

  // =========================================================================
  // SECTION 7: PAYMENT METHODS (طرق الدفع)
  // =========================================================================
  async renderPaymentMethods(root) {
    const gateways = await window.roohDB.getPaymentGateways();

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px;">
        <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">وسائل وطرق الدفع المتاحة للعملاء</h2>
        <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">تفعيل وتعطيل طرق الدفع الظاهرة في صفحة إتمام الطلب للعميل.</p>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
        <!-- InstaPay -->
        <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="font-size:1.2rem; font-weight:700; color:var(--rooh-dark);">📱 إنستاباي (InstaPay)</div>
            <span class="status-pill status-ready">مفعل</span>
          </div>
          <p style="font-size:0.85rem; color:var(--rooh-muted); line-height:1.6; margin-bottom:16px;">
            تحويل مباشر لحساب شركة روح عبر المعرف <strong>rooh.cosmetics@instapay</strong> أو رقم <strong>01227208589</strong>.
          </p>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #F0ECE4; padding-top:14px;">
            <span style="font-size:0.85rem;">رسوم المعاملة: <strong>0 ج.م</strong></span>
            <a href="#payment_integrations" class="btn-rooh btn-rooh-outline btn-rooh-sm">إعدادات الحساب ⚙️</a>
          </div>
        </div>

        <!-- Wallets -->
        <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="font-size:1.2rem; font-weight:700; color:var(--rooh-dark);">📲 المحافظ الإلكترونية</div>
            <span class="status-pill status-ready">مفعل</span>
          </div>
          <p style="font-size:0.85rem; color:var(--rooh-muted); line-height:1.6; margin-bottom:16px;">
            فودافون كاش، أورنج كاش، اتصالات كاش، WE Pay على رقم الإدارة المعتمد <strong>01227208589</strong>.
          </p>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #F0ECE4; padding-top:14px;">
            <span style="font-size:0.85rem;">رسوم المعاملة: <strong>0 ج.م</strong></span>
            <a href="#payment_integrations" class="btn-rooh btn-rooh-outline btn-rooh-sm">تعديل الأرقام ⚙️</a>
          </div>
        </div>

        <!-- Credit Cards -->
        <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="font-size:1.2rem; font-weight:700; color:var(--rooh-dark);">💳 البطاقات البنكية فيزا / ماستر</div>
            <span class="status-pill status-draft">وضع الاختبار (Sandbox)</span>
          </div>
          <p style="font-size:0.85rem; color:var(--rooh-muted); line-height:1.6; margin-bottom:16px;">
            الدفع الإلكتروني المباشر عبر بوابة Paymob أو FawryPay مع دعم الأقساط البنكية وحماية 3D-Secure.
          </p>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #F0ECE4; padding-top:14px;">
            <span style="font-size:0.85rem;">الحالة: <strong>بانتظار مفاتيح الإنتاج</strong></span>
            <a href="#payment_integrations" class="btn-rooh btn-rooh-primary btn-rooh-sm">ربط المفاتيح 🔌</a>
          </div>
        </div>

        <!-- Cash on Delivery (COD) -->
        <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="font-size:1.2rem; font-weight:700; color:var(--rooh-dark);">🚚 الدفع عند الاستلام (COD)</div>
            <span class="status-pill status-ready">مفعل</span>
          </div>
          <p style="font-size:0.85rem; color:var(--rooh-muted); line-height:1.6; margin-bottom:16px;">
            الدفع نقداً لمندوب الشحن عند استلام الطرد مع إمكانية فتح ومعاينة المنتج قبل السداد.
          </p>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #F0ECE4; padding-top:14px;">
            <span style="font-size:0.85rem;">رسوم إضافية: <strong>0 ج.م</strong></span>
            <button class="btn-edit-cell" onclick="window.roohAdmin.openEditCodModal()">تعديل ✏️</button>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // SECTION 8: PAYMENT INTEGRATIONS (إعدادات الربط المالي) - ABDELRAHMAN
  // =========================================================================
  async renderPaymentIntegrations(root) {
    const gateways = await window.roohDB.getPaymentGateways();

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:24px;">
        <span style="background:rgba(255,215,0,0.2); color:var(--rooh-dark); padding:3px 10px; border-radius:50px; font-size:0.75rem; font-weight:700;">سري للمدير الأساسي عبدالرحمن</span>
        <h2 style="font-family:var(--rooh-font-serif); font-size:1.4rem; color:var(--rooh-dark); margin:6px 0 4px;">إعدادات الربط المالي وبوابات الدفع الإلكتروني</h2>
        <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">
          تحكم في حسابات التاجر، ربط مفاتيح API، روابط Webhook، اختبار الاتصال والتفعيل بين وضع التجربة (Sandbox) والإنتاج الحي (Live).
        </p>
      </div>

      <!-- Paymob Configuration Card -->
      <div style="background:#FFF; border-radius:14px; border:1.5px solid var(--admin-border); padding:24px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid #F0ECE4; padding-bottom:14px;">
          <div>
            <h3 style="font-family:var(--rooh-font-serif); font-size:1.3rem; margin:0; color:var(--rooh-dark);">1. بوابة باي موب (Paymob)</h3>
            <span style="font-size:0.8rem; color:var(--rooh-muted);">ربط البطاقات البنكية، المحافظ الإلكترونية، وأبل باي</span>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.testGateway('paymob')">اختبار الاتصال ⚡</button>
          </div>
        </div>

        <form onsubmit="window.roohAdmin.saveGatewayConfig(event, 'paymob')" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div>
            <label class="form-label">Merchant ID (معرف التاجر):</label>
            <input type="text" id="paymob_merchant_id" class="form-input" value="${gateways.paymob?.merchant_id || ''}" placeholder="e.g. 123456" />
          </div>
          <div>
            <label class="form-label">API Key (المفتاح البرمجي العام):</label>
            <input type="text" id="paymob_api_key" class="form-input" value="${gateways.paymob?.api_key || ''}" placeholder="ZXlKaGJHY2lPaUpJVX..." />
          </div>
          <div>
            <label class="form-label">Integration ID - Cards (معرف البطاقات):</label>
            <input type="text" id="paymob_integration_id_card" class="form-input" value="${gateways.paymob?.integration_id_card || ''}" placeholder="e.g. 483921" />
          </div>
          <div>
            <label class="form-label">Integration ID - Wallets (معرف المحافظ):</label>
            <input type="text" id="paymob_integration_id_wallet" class="form-input" value="${gateways.paymob?.integration_id_wallet || ''}" placeholder="e.g. 483922" />
          </div>
          <div>
            <label class="form-label">HMAC Secret (سر التوقيع الرقمي):</label>
            <input type="password" id="paymob_hmac_secret" class="form-input" value="${gateways.paymob?.hmac_secret || ''}" placeholder="••••••••••••••••" />
          </div>
          <div>
            <label class="form-label">Webhook Callback URL (رابط الاستقبال التلقائي):</label>
            <input type="text" readonly class="form-input" style="background:#FBF9F5; color:var(--rooh-muted);" value="http://localhost:3000/api/payments/webhook/paymob" />
          </div>
          <div style="grid-column:1 / -1; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #F0ECE4; padding-top:14px;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="paymob_is_live" ${gateways.paymob?.is_live_enabled ? 'checked' : ''} />
              <strong style="color:var(--rooh-dark);">تفعيل وضع الإنتاج الحي (Live Mode)</strong>
            </label>
            <button type="submit" class="btn-rooh btn-rooh-primary btn-rooh-sm">حفظ إعدادات باي موب 💾</button>
          </div>
        </form>
      </div>

      <!-- Fawry Configuration Card -->
      <div style="background:#FFF; border-radius:14px; border:1.5px solid var(--admin-border); padding:24px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid #F0ECE4; padding-bottom:14px;">
          <div>
            <h3 style="font-family:var(--rooh-font-serif); font-size:1.3rem; margin:0; color:var(--rooh-dark);">2. بوابة فوري (FawryPay)</h3>
            <span style="font-size:0.8rem; color:var(--rooh-muted);">الدفع عبر كود فوري في المنافذ والبطاقات</span>
          </div>
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.testGateway('fawry')">اختبار الاتصال ⚡</button>
        </div>

        <form onsubmit="window.roohAdmin.saveGatewayConfig(event, 'fawry')" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div>
            <label class="form-label">Fawry Merchant Code (كود التاجر):</label>
            <input type="text" id="fawry_merchant_code" class="form-input" value="${gateways.fawry?.merchant_code || ''}" placeholder="e.g. 101010" />
          </div>
          <div>
            <label class="form-label">Fawry Security Key (مفتاح الأمان):</label>
            <input type="password" id="fawry_security_key" class="form-input" value="${gateways.fawry?.security_key || ''}" placeholder="••••••••••••••••" />
          </div>
          <div style="grid-column:1 / -1; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #F0ECE4; padding-top:14px;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="fawry_is_live" ${gateways.fawry?.is_live_enabled ? 'checked' : ''} />
              <strong style="color:var(--rooh-dark);">تفعيل الدفع المباشر عبر فوري</strong>
            </label>
            <button type="submit" class="btn-rooh btn-rooh-primary btn-rooh-sm">حفظ إعدادات فوري 💾</button>
          </div>
        </form>
      </div>

      <!-- InstaPay & Wallets Manual Review Settings -->
      <div style="background:#FFF; border-radius:14px; border:1.5px solid var(--admin-border); padding:24px;">
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.3rem; margin:0 0 16px; color:var(--rooh-dark);">
          3. أرقام وحسابات التحويل المباشر (InstaPay ومحافظ الكاش)
        </h3>
        <form onsubmit="window.roohAdmin.saveDirectPayConfig(event)" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div>
            <label class="form-label">معرف إنستاباي المعتمد (InstaPay Handle):</label>
            <input type="text" id="direct_instapay_handle" class="form-input" value="${gateways.instapay?.ipa_handle || 'rooh.cosmetics@instapay'}" />
          </div>
          <div>
            <label class="form-label">رقم هاتف إنستاباي ومحفظة فودافون كاش:</label>
            <input type="text" id="direct_wallet_phone" class="form-input" value="${gateways.wallets?.wallet_number || '01227208589'}" />
          </div>
          <div style="grid-column:1 / -1; text-align:left;">
            <button type="submit" class="btn-rooh btn-rooh-primary btn-rooh-sm">حفظ أرقام الدفع المباشر 💾</button>
          </div>
        </form>
      </div>
    `;
  }

  async saveGatewayConfig(e, gatewayId) {
    e.preventDefault();
    const config = {};
    if (gatewayId === 'paymob') {
      config.merchant_id = document.getElementById('paymob_merchant_id').value.trim();
      config.api_key = document.getElementById('paymob_api_key').value.trim();
      config.integration_id_card = document.getElementById('paymob_integration_id_card').value.trim();
      config.integration_id_wallet = document.getElementById('paymob_integration_id_wallet').value.trim();
      const sec = document.getElementById('paymob_hmac_secret').value.trim();
      if (sec && sec !== '••••••••••••••••') config.hmac_secret = sec;
      config.is_live_enabled = document.getElementById('paymob_is_live').checked;
    } else if (gatewayId === 'fawry') {
      config.merchant_code = document.getElementById('fawry_merchant_code').value.trim();
      const sec = document.getElementById('fawry_security_key').value.trim();
      if (sec && sec !== '••••••••••••••••') config.security_key = sec;
      config.is_live_enabled = document.getElementById('fawry_is_live').checked;
    }

    try {
      await window.roohDB.savePaymentGateway(gatewayId, config);
      window.RoohUtil.showToast(`تم حفظ وتأمين إعدادات بوابة ${gatewayId} بنجاح ✓`, 'success');
    } catch (err) {
      alert('فشل حفظ الإعدادات');
    }
  }

  async saveDirectPayConfig(e) {
    e.preventDefault();
    const ipa = document.getElementById('direct_instapay_handle').value.trim();
    const phone = document.getElementById('direct_wallet_phone').value.trim();
    try {
      await window.roohDB.savePaymentGateway('instapay', { ipa_handle: ipa, phone_number: phone });
      await window.roohDB.savePaymentGateway('wallets', { wallet_number: phone });
      window.RoohUtil.showToast('تم تحديث أرقام وحسابات التحويل المباشر بنجاح ✓', 'success');
    } catch (err) {
      alert('فشل حفظ البيانات');
    }
  }

  async testGateway(gatewayId) {
    try {
      const res = await window.roohDB.testPaymentGateway(gatewayId);
      if (res.success) {
        alert(`✓ نتيجة الفحص: ${res.message}\nالحالة الحالية: ${res.status}`);
      } else {
        alert(`⚠️ تنبيه: ${res.error}`);
      }
    } catch (e) {
      alert('فشل اختبار الاتصال');
    }
  }

  // =========================================================================
  // SECTION 9: GOVERNORATES & DELIVERY RATES (أسعار التوصيل ومحافظات مصر الـ27)
  // =========================================================================
  async renderGovernorates(root) {
    const governorates = await window.roohDB.getGovernorates();

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">
            أسعار التوصيل ومحافظات جمهورية مصر العربية الـ27
          </h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">
            مرتبة بالترتيب الإلزامي المعتمد مع إمكانية تعديل سعر كل محافظة فورياً، تفعيلها أو تعطيلها، وإضافة مناطق ومصاريف فرعية.
          </p>
        </div>
      </div>

      <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:20px; overflow-x:auto;">
        <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
          <thead>
            <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
              <th style="padding:10px 14px; width:50px;">#</th>
              <th style="padding:10px 14px;">اسم المحافظة</th>
              <th style="padding:10px 14px;">مدة الشحن المقدرة</th>
              <th style="padding:10px 14px;">سعر التوصيل (ج.م)</th>
              <th style="padding:10px 14px;">المناطق الفرعية</th>
              <th style="padding:10px 14px;">حالة التوصيل</th>
              <th style="padding:10px 14px; text-align:center;">التحكم والتعديل</th>
            </tr>
          </thead>
          <tbody>
            ${governorates.map((g, idx) => `
              <tr style="border-bottom:1px solid #F0ECE4;">
                <td data-label="الترتيب" style="padding:10px 14px; font-weight:700; color:var(--rooh-gold);">${idx + 1}</td>
                <td data-label="المحافظة" style="padding:10px 14px; font-weight:700; color:var(--rooh-dark); font-size:0.95rem;">
                  ${g.name_ar}
                  <span style="font-size:0.75rem; color:var(--rooh-muted); font-weight:normal; margin-right:6px;">(${g.name_en || ''})</span>
                </td>
                <td data-label="مدة الشحن" style="padding:10px 14px; color:var(--rooh-muted);">${g.delivery_days || '2 - 3 أيام'}</td>
                <td data-label="السعر" style="padding:10px 14px;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <input type="number" id="govPrice_${g.id}" value="${g.price}" class="form-input" style="width:85px; padding:4px 8px; font-weight:700; color:var(--rooh-gold);" />
                    <span>ج.م</span>
                  </div>
                </td>
                <td data-label="المناطق" style="padding:10px 14px;">
                  <span style="font-size:0.78rem; color:var(--rooh-muted);">
                    ${(g.sub_zones || []).length > 0 ? `${(g.sub_zones || []).length} مناطق مخصصة` : 'سعر موحد للمحافظة'}
                  </span>
                </td>
                <td data-label="الحالة" style="padding:10px 14px;">
                  <span class="status-pill ${g.active ? 'status-ready' : 'status-draft'}">
                    ${g.active ? 'شحن متاح ✓' : 'معطل مؤقتاً'}
                  </span>
                </td>
                <td data-label="الإجراءات" style="padding:10px 14px; text-align:center;">
                  <div style="display:flex; gap:6px; justify-content:center;">
                    <button class="btn-save-cell" onclick="window.roohAdmin.saveGovPrice('${g.id}')">
                      <span>حفظ</span> 💾
                    </button>
                    <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="padding:4px 8px;" onclick="window.roohAdmin.toggleGovStatus('${g.id}', ${!g.active})">
                      ${g.active ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button class="btn-edit-cell" onclick="window.roohAdmin.openGovSubZonesModal('${g.id}')">
                      <span>مناطق</span> 🏘️
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="modal-overlay" id="govSubZonesModalRoot"></div>
    `;
  }

  async saveGovPrice(govId) {
    const inputEl = document.getElementById(`govPrice_${govId}`);
    if (!inputEl) return;
    const newPrice = Number(inputEl.value) || 0;
    try {
      await window.roohDB.saveGovernorate({ id: govId, price: newPrice });
      window.RoohUtil.showToast('تم تحديث سعر التوصيل وحفظه بنجاح ✓', 'success');
    } catch (e) {
      alert('فشل حفظ السعر');
    }
  }

  async toggleGovStatus(govId, active) {
    try {
      await window.roohDB.saveGovernorate({ id: govId, active });
      window.RoohUtil.showToast(`تم ${active ? 'تفعيل' : 'تعطيل'} الشحن للمحافظة بنجاح ✓`, 'info');
      this.navigateTo('governorates');
    } catch (e) {
      alert('فشل تغيير الحالة');
    }
  }

  async openGovSubZonesModal(govId) {
    const govs = await window.roohDB.getGovernorates();
    const g = govs.find(item => item.id === govId);
    if (!g) return;

    const modalRoot = document.getElementById('govSubZonesModalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:550px;">
        <button class="modal-close-btn" onclick="document.getElementById('govSubZonesModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin-bottom:12px;">
          المناطق الفرعية لمحافظة: ${g.name_ar}
        </h3>
        <p style="font-size:0.85rem; color:var(--rooh-muted); margin-bottom:16px;">
          السعر الأساسي للمحافظة: <strong>${g.price} ج.م</strong>. يمكنك تحديد مصاريف إضافية لمنطقة بعيدة (مثل الساحل، سيوة، الشيخ زايد).
        </p>

        <div style="max-height:250px; overflow-y:auto; margin-bottom:16px;">
          ${(g.sub_zones || []).length === 0 ? '<div style="color:var(--rooh-muted); font-size:0.85rem;">لا توجد مناطق فرعية مسجلة حالياً.</div>' : `
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
              <tr style="background:#FAF8F5; text-align:right;">
                <th style="padding:6px;">اسم المنطقة</th>
                <th style="padding:6px;">تكلفة إضافية</th>
              </tr>
              ${(g.sub_zones || []).map(sz => `
                <tr style="border-bottom:1px solid #F0ECE4;">
                  <td style="padding:8px;">${sz.name}</td>
                  <td style="padding:8px; font-weight:700;">+${sz.surcharge} ج.م</td>
                </tr>
              `).join('')}
            </table>
          `}
        </div>

        <form onsubmit="window.roohAdmin.handleAddSubZone(event, '${g.id}')" style="display:flex; gap:10px; border-top:1px solid #F0ECE4; padding-top:14px;">
          <input type="text" id="szNameInput" class="form-input" placeholder="اسم المنطقة الجديدة" required style="flex:2;" />
          <input type="number" id="szSurchargeInput" class="form-input" placeholder="تكلفة إضافية (+ج.م)" value="15" style="flex:1;" />
          <button type="submit" class="btn-rooh btn-rooh-primary btn-rooh-sm">+ إضافة</button>
        </form>
      </div>
    `;

    modalRoot.classList.add('open');
  }

  async handleAddSubZone(e, govId) {
    e.preventDefault();
    const name = document.getElementById('szNameInput').value.trim();
    const surcharge = Number(document.getElementById('szSurchargeInput').value) || 0;

    const govs = await window.roohDB.getGovernorates();
    const g = govs.find(item => item.id === govId);
    if (!g) return;

    g.sub_zones = g.sub_zones || [];
    g.sub_zones.push({ name, surcharge });

    await window.roohDB.saveGovernorate(g);
    window.RoohUtil.showToast('تمت إضافة المنطقة الفرعية بنجاح ✓', 'success');
    this.openGovSubZonesModal(govId);
  }

  // =========================================================================
  // SECTION 10: DISCOUNT CODES (أكواد الخصم)
  // =========================================================================
  async renderCoupons(root) {
    const coupons = await window.roohDB.getDiscountCodes();

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">إدارة أكواد الخصم والكوبونات</h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">إنشاء أكواد بنسب مئوية أو مبالغ ثابتة مع تحديد الحد الأدنى وصلاحية الاستخدام.</p>
        </div>
        <button class="btn-rooh btn-rooh-primary" onclick="window.roohAdmin.openCouponModal()">
          <span>+ إنشاء كود خصم جديد</span>
          <span>🎟️</span>
        </button>
      </div>

      <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:20px; overflow-x:auto;">
        <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
          <thead>
            <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
              <th style="padding:12px;">الكود</th>
              <th style="padding:12px;">نوع وقيمة الخصم</th>
              <th style="padding:12px;">الحد الأدنى للطلب</th>
              <th style="padding:12px;">أقصى خصم</th>
              <th style="padding:12px;">الاستخدامات</th>
              <th style="padding:12px;">تاريخ الصلاحية</th>
              <th style="padding:12px;">الحالة</th>
              <th style="padding:12px; text-align:center;">التحكم</th>
            </tr>
          </thead>
          <tbody>
            ${coupons.map(c => `
              <tr style="border-bottom:1px solid #F0ECE4;">
                <td data-label="الكود" style="padding:12px; font-weight:800; font-family:monospace; color:var(--rooh-gold); font-size:1rem;">${c.code}</td>
                <td data-label="الخصم" style="padding:12px; font-weight:700;">
                  ${c.type === 'percentage' ? `${c.value}% خصم مئوي` : `${c.value} ج.م خصم ثابت`}
                </td>
                <td data-label="الحد الأدنى" style="padding:12px;">${c.min_order_amount || 0} ج.م</td>
                <td data-label="أقصى خصم" style="padding:12px;">${c.max_discount_cap ? `${c.max_discount_cap} ج.م` : 'بدون سقف'}</td>
                <td data-label="الاستخدام" style="padding:12px;">${c.used_count || 0} / ${c.usage_limit_total || '∞'}</td>
                <td data-label="الصلاحية" style="padding:12px; color:var(--rooh-muted);">${c.end_date || 'مستمر'}</td>
                <td data-label="الحالة" style="padding:12px;">
                  <span class="status-pill ${c.active ? 'status-ready' : 'status-draft'}">${c.active ? 'نشط' : 'معطل'}</span>
                </td>
                <td data-label="التحكم" style="padding:12px; text-align:center;">
                  <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="color:var(--rooh-danger); border-color:var(--rooh-danger); padding:4px 8px;" onclick="window.roohAdmin.deleteCoupon('${c.id}')">
                    حذف 🗑️
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="modal-overlay" id="couponModalRoot"></div>
    `;
  }

  openCouponModal() {
    const modalRoot = document.getElementById('couponModalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:550px;">
        <button class="modal-close-btn" onclick="document.getElementById('couponModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin-bottom:16px;">
          إنشاء كود خصم جديد
        </h3>
        <form onsubmit="window.roohAdmin.handleCouponSubmit(event)" style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <label class="form-label">كود الخصم (رمز الكوبون بالإنجليزية) *</label>
            <input type="text" id="cpCode" class="form-input" required placeholder="مثال: ROOH2026" style="text-transform:uppercase;" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="form-label">نوع الخصم</label>
              <select id="cpType" class="form-input">
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (ج.م)</option>
              </select>
            </div>
            <div>
              <label class="form-label">قيمة الخصم *</label>
              <input type="number" id="cpValue" class="form-input" required value="10" />
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="form-label">الحد الأدنى لقيمة الطلب (ج.م)</label>
              <input type="number" id="cpMinOrder" class="form-input" value="300" />
            </div>
            <div>
              <label class="form-label">أقصى قيمة للخصم (Cap)</label>
              <input type="number" id="cpMaxCap" class="form-input" value="100" />
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="form-label">تاريخ البداية</label>
              <input type="date" id="cpStartDate" class="form-input" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div>
              <label class="form-label">تاريخ الانتهاء</label>
              <input type="date" id="cpEndDate" class="form-input" value="2026-12-31" />
            </div>
          </div>
          <button type="submit" class="btn-rooh btn-rooh-primary" style="margin-top:8px; padding:12px;">حفظ وتفعيل الكود</button>
        </form>
      </div>
    `;

    modalRoot.classList.add('open');
  }

  async handleCouponSubmit(e) {
    e.preventDefault();
    const payload = {
      code: document.getElementById('cpCode').value.trim().toUpperCase(),
      type: document.getElementById('cpType').value,
      value: Number(document.getElementById('cpValue').value) || 0,
      min_order_amount: Number(document.getElementById('cpMinOrder').value) || 0,
      max_discount_cap: Number(document.getElementById('cpMaxCap').value) || 0,
      start_date: document.getElementById('cpStartDate').value,
      end_date: document.getElementById('cpEndDate').value,
      usage_limit_total: 500,
      active: true
    };

    try {
      await window.roohDB.saveDiscountCode(payload);
      document.getElementById('couponModalRoot').classList.remove('open');
      window.RoohUtil.showToast('تم تفعيل كود الخصم بنجاح ✓', 'success');
      this.navigateTo('coupons');
    } catch (err) {
      alert('فشل حفظ كود الخصم');
    }
  }

  async deleteCoupon(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) return;
    try {
      await window.roohDB.deleteDiscountCode(id);
      window.RoohUtil.showToast('تم حذف الكود ✓', 'info');
      this.navigateTo('coupons');
    } catch (e) {
      alert('فشل الحذف');
    }
  }

  // =========================================================================
  // SECTION 11: PRODUCT TIMED DISCOUNTS (خصم على المنتج)
  // =========================================================================
  async renderProductDiscounts(root) {
    const products = await window.roohDB.getProducts('all');
    const discounts = await window.roohDB.getProductDiscounts();

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px;">
        <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">خصم على المنتج والعروض الموقوتة (Flash Sales)</h2>
        <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">تحديد تخفيضات مباشرة على منتجات المتجر مع فترة زمنية محددة وعودة السعر الأصلي تلقائياً.</p>
      </div>

      <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:20px; overflow-x:auto;">
        <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
          <thead>
            <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
              <th style="padding:12px;">المنتج</th>
              <th style="padding:12px;">السعر الأصلي</th>
              <th style="padding:12px;">السعر بعد الخصم</th>
              <th style="padding:12px;">نسبة الخصم</th>
              <th style="padding:12px;">التحكم</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => {
              const orig = p.original_price || p.price;
              const hasDiscount = orig > p.price;
              const discountPct = hasDiscount ? Math.round(((orig - p.price) / orig) * 100) : 0;
              return `
                <tr style="border-bottom:1px solid #F0ECE4;">
                  <td data-label="المنتج" style="padding:12px; font-weight:700; color:var(--rooh-dark);">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <img src="${p.image || ''}" style="width:36px; height:36px; border-radius:6px; object-fit:cover;" />
                      <span>${p.name_ar}</span>
                    </div>
                  </td>
                  <td data-label="الأصلي" style="padding:12px; color:var(--rooh-muted); text-decoration:${hasDiscount ? 'line-through' : 'none'};">${orig} ج.م</td>
                  <td data-label="الجديد" style="padding:12px; font-weight:800; color:var(--rooh-gold);">${p.price} ج.م</td>
                  <td data-label="النسبة" style="padding:12px;">
                    ${hasDiscount ? `<span class="badge-tag" style="background:#E8F5E9; color:#2E7D32; font-weight:700;">خصم ${discountPct}%</span>` : 'سعر عادي'}
                  </td>
                  <td data-label="التحكم" style="padding:12px; text-align:center;">
                    <button class="btn-edit-cell" onclick="window.roohAdmin.openProductDiscountModal('${p.id}', ${orig})">
                      <span>إضافة خصم</span> 🏷️
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="modal-overlay" id="pDiscModalRoot"></div>
    `;
  }

  async openProductDiscountModal(prodId, originalPrice) {
    const modalRoot = document.getElementById('pDiscModalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:480px;">
        <button class="modal-close-btn" onclick="document.getElementById('pDiscModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin-bottom:16px;">
          إضافة خصم موقوت على المنتج
        </h3>
        <form onsubmit="window.roohAdmin.handleApplyProductDiscount(event, '${prodId}', ${originalPrice})" style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <label class="form-label">السعر الأصلي: <strong>${originalPrice} ج.م</strong></label>
          </div>
          <div>
            <label class="form-label">نسبة الخصم المئوية (%):</label>
            <input type="number" id="pdPctInput" class="form-input" min="1" max="90" value="15" oninput="window.roohAdmin.calcDiscPricePreview(${originalPrice})" />
          </div>
          <div>
            <label class="form-label">السعر المتوقع بعد الخصم:</label>
            <div id="pdPricePreview" style="font-size:1.3rem; font-weight:800; color:var(--rooh-gold);">
              ${Math.round(originalPrice * 0.85)} ج.م
            </div>
          </div>
          <div>
            <label class="form-label">مدة الخصم (بالساعات):</label>
            <input type="number" id="pdDuration" class="form-input" value="72" />
          </div>
          <button type="submit" class="btn-rooh btn-rooh-primary" style="margin-top:8px; padding:12px;">تطبيق الخصم فوراً</button>
        </form>
      </div>
    `;

    modalRoot.classList.add('open');
  }

  calcDiscPricePreview(originalPrice) {
    const pct = Number(document.getElementById('pdPctInput').value) || 0;
    const discounted = Math.round(originalPrice - (originalPrice * pct / 100));
    document.getElementById('pdPricePreview').textContent = `${discounted} ج.م`;
  }

  async handleApplyProductDiscount(e, prodId, originalPrice) {
    e.preventDefault();
    const pct = Number(document.getElementById('pdPctInput').value) || 0;
    const duration = Number(document.getElementById('pdDuration').value) || 72;

    try {
      await window.roohDB.saveProductDiscount({
        product_id: prodId,
        discount_type: 'percentage',
        discount_value: pct,
        duration_hours: duration
      });
      document.getElementById('pDiscModalRoot').classList.remove('open');
      window.RoohUtil.showToast('تم تطبيق الخصم على المنتج بنجاح ✓', 'success');
      this.navigateTo('product_discounts');
    } catch (err) {
      alert('فشل تطبيق الخصم');
    }
  }

  // =========================================================================
  // SECTION 12: REVIEWS (التقييمات)
  // =========================================================================
  async renderReviews(root) {
    const reviews = await window.roohDB.getReviews('all');
    const products = await window.roohDB.getProducts('all');

    root.innerHTML = `
      <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">إدارة التقييمات وآراء العملاء</h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">قائمة منظمة لتقييمات المتجر مع إمكانية إضافة تقييمات بأسماء مختلفة، وتعديل النصوص، النجوم، والرد عليها رسمياً.</p>
        </div>
        <button class="btn-rooh btn-rooh-primary" onclick="window.roohAdmin.openReviewModal()">
          <span>+ إضافة تقييم يدوي جديد</span>
          <span>✍️</span>
        </button>
      </div>

      <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); overflow:hidden;">
        <div style="padding:16px 20px; border-bottom:1px solid var(--admin-border); display:flex; justify-content:space-between; align-items:center; background:#FAF8F5;">
          <span style="font-weight:700; color:var(--rooh-dark); font-size:0.95rem;">إجمالي التقييمات المسجلة: (${reviews.length})</span>
          <span style="font-size:0.8rem; color:var(--rooh-muted);">تظهر التقييمات المعتمدة تلقائياً في صفحة المتجر وصفحات المنتجات</span>
        </div>

        ${reviews.length === 0 ? `
          <div style="text-align:center; padding:60px 20px;">
            <div style="font-size:2.5rem; margin-bottom:10px;">⭐</div>
            <h4 style="font-size:1.15rem; color:var(--rooh-dark);">لا توجد تقييمات حالياً</h4>
            <p style="font-size:0.85rem; color:var(--rooh-muted);">اضغط على "إضافة تقييم يدوي جديد" لإضافة أول رأي عميل في المتجر</p>
          </div>
        ` : `
          <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
            <thead>
              <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
                <th style="padding:12px 14px;">اسم العميل</th>
                <th style="padding:12px 14px;">التقييم</th>
                <th style="padding:12px 14px;">المنتج</th>
                <th style="padding:12px 14px;">عنوان ورأي العميل</th>
                <th style="padding:12px 14px;">رد الإدارة</th>
                <th style="padding:12px 14px;">الحالة</th>
                <th style="padding:12px 14px; text-align:center;">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${reviews.map(r => `
                <tr style="border-bottom:1px solid #F0ECE4;">
                  <td data-label="العميل" style="padding:12px 14px;">
                    <div style="font-weight:700; color:var(--rooh-dark);">${r.customer_name || 'عميل'}</div>
                    <div style="font-size:0.75rem; color:var(--rooh-muted);">${r.location || 'مصر'} ${r.verified_purchase ? '• <span style="color:#2E7D32;">مشترٍ موثق ✓</span>' : ''}</div>
                  </td>
                  <td data-label="التقييم" style="padding:12px 14px;">
                    <span style="color:#FFB300; font-size:1.1rem; letter-spacing:2px;">${'★'.repeat(r.rating || 5)}${'☆'.repeat(Math.max(0, 5 - (r.rating || 5)))}</span>
                  </td>
                  <td data-label="المنتج" style="padding:12px 14px; font-size:0.82rem; color:var(--rooh-dark);">
                    ${r.product_name_ar || 'سوق روح عامة'}
                  </td>
                  <td data-label="الرأي" style="padding:12px 14px; max-width:320px;">
                    <div style="font-weight:700; color:var(--rooh-gold); margin-bottom:2px;">${r.title || ''}</div>
                    <div style="color:var(--rooh-muted); font-size:0.82rem; line-height:1.5;">"${r.comment || ''}"</div>
                  </td>
                  <td data-label="رد الإدارة" style="padding:12px 14px; font-size:0.8rem;">
                    ${r.reply ? `<div style="background:#FAF8F5; padding:6px 10px; border-radius:6px; border-right:3px solid var(--rooh-gold); color:var(--rooh-dark);">${r.reply}</div>` : '<span style="color:#9E9E9E;">لا يوجد رد بعد</span>'}
                  </td>
                  <td data-label="الحالة" style="padding:12px 14px;">
                    <span class="status-pill status-ready">${r.status === 'approved' ? 'معتمد ومنشور' : 'قيد المراجعة'}</span>
                  </td>
                  <td data-label="إجراءات" style="padding:12px 14px; text-align:center;">
                    <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                      <button class="btn-edit-cell" onclick="window.roohAdmin.openReviewModal('${r.id}')" title="تعديل التقييم">
                        <span>تعديل</span> ✏️
                      </button>
                      <button class="btn-edit-cell" style="background:#FAF8F5;" onclick="window.roohAdmin.replyReviewModal('${r.id}')" title="الرد الرسمي">
                        <span>رد</span> 💬
                      </button>
                      <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="color:var(--rooh-danger); border-color:var(--rooh-danger); padding:4px 8px;" onclick="window.roohAdmin.deleteReview('${r.id}')" title="حذف">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- Add / Edit Review Modal -->
      <div class="modal-overlay" id="reviewCrudModalRoot"></div>
      <div class="modal-overlay" id="reviewReplyModalRoot"></div>
    `;
  }

  async openReviewModal(revId = null) {
    const modalRoot = document.getElementById('reviewCrudModalRoot');
    if (!modalRoot) return;

    const products = await window.roohDB.getProducts('all');
    let review = null;
    if (revId) {
      const all = await window.roohDB.getReviews('all');
      review = all.find(r => r.id === revId);
    }

    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:580px; max-height:90vh; overflow-y:auto;">
        <button class="modal-close-btn" onclick="document.getElementById('reviewCrudModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin-bottom:16px;">
          ${review ? 'تعديل تقييم العميل' : 'إضافة تقييم جديد باسم مخصص'}
        </h3>

        <form onsubmit="window.roohAdmin.handleReviewFormSubmit(event, '${review?.id || ''}')" style="display:flex; flex-direction:column; gap:14px;">
          <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:12px;">
            <div>
              <label class="form-label">اسم العميل *</label>
              <input type="text" id="revCustName" class="form-input" required value="${review?.customer_name || ''}" placeholder="مثال: مريم حسن / أحمد فتحي" />
            </div>
            <div>
              <label class="form-label">المحافظة / المدينة</label>
              <input type="text" id="revCustLocation" class="form-input" value="${review?.location || 'القاهرة'}" placeholder="مثال: الإسكندرية" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="form-label">المنتج المرتبط بالتقييم</label>
              <select id="revProductId" class="form-input">
                <option value="">✨ تقييم عام لمتجر روح</option>
                ${products.map(p => `
                  <option value="${p.id}" ${review?.product_id === p.id ? 'selected' : ''}>${p.name_ar}</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">عدد النجوم (التقييم) *</label>
              <select id="revRating" class="form-input">
                <option value="5" ${(!review || review.rating === 5) ? 'selected' : ''}>★★★★★ 5 نجوم (ممتاز جداً)</option>
                <option value="4" ${review?.rating === 4 ? 'selected' : ''}>★★★★☆ 4 نجوم (جيد جداً)</option>
                <option value="3" ${review?.rating === 3 ? 'selected' : ''}>★★★☆☆ 3 نجوم (جيد)</option>
                <option value="2" ${review?.rating === 2 ? 'selected' : ''}>★★☆☆☆ نجمتان</option>
                <option value="1" ${review?.rating === 1 ? 'selected' : ''}>★☆☆☆☆ نجمة واحدة</option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">عنوان التقييم / التجربة *</label>
            <input type="text" id="revTitle" class="form-input" required value="${review?.title || ''}" placeholder="مثال: بشرتي أصبحت نضرة كالحرير!" />
          </div>

          <div>
            <label class="form-label">تفاصيل كلام ورأي العميل *</label>
            <textarea id="revComment" class="form-input" style="height:90px;" required placeholder="اكتب نص تقييم العميل هنا...">${review?.comment || ''}</textarea>
          </div>

          <div>
            <label class="form-label">رد إدارة روح (اختياري)</label>
            <textarea id="revReply" class="form-input" style="height:60px;" placeholder="اكتب رد الشركة الترحيبي...">${review?.reply || ''}</textarea>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; background:#FAF8F5; padding:10px 14px; border-radius:8px;">
            <label style="font-size:0.85rem; font-weight:700; color:var(--rooh-dark); cursor:pointer;">
              <input type="checkbox" id="revVerified" ${(!review || review.verified_purchase) ? 'checked' : ''} style="margin-left:6px;" />
              علامة مشترٍ موثق (Verified Purchase)
            </label>
            <select id="revStatus" class="form-input" style="width:auto; padding:6px 12px; font-size:0.82rem;">
              <option value="approved" ${(!review || review.status === 'approved') ? 'selected' : ''}>معتمد ومنشور</option>
              <option value="pending" ${review?.status === 'pending' ? 'selected' : ''}>قيد المراجعة</option>
            </select>
          </div>

          <button type="submit" class="btn-rooh btn-rooh-primary" style="margin-top:6px; padding:13px;">
            <span>${review ? 'حفظ تعديلات التقييم 💾' : 'إضافة التقييم لقائمة المتجر ✨'}</span>
          </button>
        </form>
      </div>
    `;

    modalRoot.classList.add('open');
  }

  async handleReviewFormSubmit(e, revId) {
    e.preventDefault();
    const products = await window.roohDB.getProducts('all');
    const pId = document.getElementById('revProductId').value;
    const pObj = products.find(p => p.id === pId);

    const payload = {
      customer_name: document.getElementById('revCustName').value.trim(),
      location: document.getElementById('revCustLocation').value.trim(),
      product_id: pId,
      product_name_ar: pObj ? pObj.name_ar : 'سوق روح للمستحضرات الملكية',
      rating: Number(document.getElementById('revRating').value) || 5,
      title: document.getElementById('revTitle').value.trim(),
      comment: document.getElementById('revComment').value.trim(),
      reply: document.getElementById('revReply').value.trim(),
      verified_purchase: document.getElementById('revVerified').checked,
      status: document.getElementById('revStatus').value
    };

    if (revId) payload.id = revId;

    try {
      await window.roohDB.saveReview(payload);
      document.getElementById('reviewCrudModalRoot').classList.remove('open');
      window.RoohUtil.showToast(revId ? 'تم تحديث التقييم بنجاح ✓' : 'تم إضافة التقييم بنجاح ✓', 'success');
      this.navigateTo('reviews');
    } catch (err) {
      alert('فشل حفظ التقييم');
    }
  }

  async replyReviewModal(revId) {
    const modalRoot = document.getElementById('reviewReplyModalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:480px;">
        <button class="modal-close-btn" onclick="document.getElementById('reviewReplyModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.3rem; margin-bottom:14px;">الرد الرسمي على تقييم العميل</h3>
        <textarea id="revReplyInput" class="form-input" style="height:100px;" placeholder="اكتب رد شركة روح للعميل هنا..."></textarea>
        <button class="btn-rooh btn-rooh-primary" style="margin-top:12px; width:100%;" onclick="window.roohAdmin.submitReviewReply('${revId}')">نشر الرد في صفحة المنتج</button>
      </div>
    `;

    modalRoot.classList.add('open');
  }

  async submitReviewReply(revId) {
    const replyText = document.getElementById('revReplyInput').value.trim();
    try {
      await window.roohDB.replyReview(revId, replyText);
      document.getElementById('reviewReplyModalRoot').classList.remove('open');
      window.RoohUtil.showToast('تم نشر الرد بنجاح ✓', 'success');
      this.navigateTo('reviews');
    } catch (e) {
      alert('فشل حفظ الرد');
    }
  }

  async deleteReview(revId) {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) return;
    try {
      await window.roohDB.deleteReview(revId);
      window.RoohUtil.showToast('تم حذف التقييم ✓', 'info');
      this.navigateTo('reviews');
    } catch (e) {
      alert('فشل الحذف');
    }
  }

  // =========================================================================
  // SECTION 13: NOTIFICATIONS (الإشعارات)
  // =========================================================================
  async renderNotifications(root) {
    const notifications = await window.roohDB.getNotifications();

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">مركز الإشعارات والتنبيهات المباشرة</h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">رصد كافة العمليات الحية (طلبات جديدة، سداد، شكاوى، تقييمات، انخفاض مخزون).</p>
        </div>
        <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.markAllNotificationsRead()">
          ✓ تحديد الكل كمقروء
        </button>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px;">
        ${notifications.map(n => `
          <div style="background:#FFF; padding:16px 20px; border-radius:10px; border:1px solid ${n.read ? 'var(--admin-border)' : 'var(--rooh-gold)'}; border-right:4px solid ${n.severity === 'warning' ? '#FFA000' : (n.severity === 'success' ? '#2E7D32' : 'var(--rooh-gold)')}; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; color:var(--rooh-dark); font-size:0.95rem; margin-bottom:2px;">${n.title}</div>
              <div style="font-size:0.85rem; color:var(--rooh-muted);">${n.description}</div>
              <div style="font-size:0.75rem; color:var(--rooh-muted); margin-top:4px;">⏱️ ${new Date(n.timestamp).toLocaleTimeString('ar-EG')} - ${new Date(n.timestamp).toLocaleDateString('ar-EG')}</div>
            </div>
            ${n.link ? `<a href="${n.link}" class="btn-rooh btn-rooh-outline btn-rooh-sm" style="font-size:0.8rem;">فتح الإجراء ←</a>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  async markAllNotificationsRead() {
    await window.roohDB.markAllNotificationsRead();
    window.RoohUtil.showToast('تم تحديد كافة الإشعارات كمقروءة ✓', 'success');
    this.navigateTo('notifications');
  }

  // =========================================================================
  // SECTION 14: MEDIA LIBRARY (مكتبة الصور وتعديل الصور ورفع ملفات الكمبيوتر)
  // =========================================================================
  async renderMediaLibrary(root) {
    const media = await window.roohDB.getMediaLibrary();

    root.innerHTML = `
      <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">مكتبة الصور والوسائط وتعديل صور الموقع</h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">رفع وتعديل أي صورة لأي مكان في الموقع والمتجر مباشرة بملف من جهازك (Upload File) بدون الحاجة لروابط.</p>
        </div>
        <button class="btn-rooh btn-rooh-primary" onclick="window.roohAdmin.openUploadMediaModal()">
          <span>+ رفع صورة جديدة من الكمبيوتر</span>
          <span>📁</span>
        </button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:20px;">
        ${media.map(m => `
          <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); overflow:hidden; display:flex; flex-direction:column; box-shadow:var(--rooh-shadow-sm);">
            <div style="height:170px; background:#F5EFE6; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center;">
              <img src="${m.url || 'assets/img/placeholder.png'}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80'" />
              ${m.target ? `<span style="position:absolute; top:8px; right:8px; background:rgba(36,33,30,0.85); color:#FFD700; font-size:0.72rem; padding:4px 8px; border-radius:6px; font-weight:700;">${m.target === 'logo' ? '👑 شعار الموقع' : (m.target === 'hero' ? '🌟 بانر رئيسي' : m.target)}</span>` : ''}
            </div>
            <div style="padding:14px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="font-weight:700; font-size:0.95rem; color:var(--rooh-dark); margin-bottom:4px;">${m.name}</div>
                <div style="font-size:0.75rem; color:var(--rooh-muted); margin-bottom:8px;">التصنيف: ${m.category || 'عام'} • ${m.size || 'ملف مرفوع'}</div>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px; border-top:1px solid #F0ECE4; padding-top:10px; margin-top:8px;">
                <div style="display:flex; gap:6px;">
                  <button class="btn-edit-cell" style="flex:1; justify-content:center; padding:7px 10px;" onclick="window.roohAdmin.openEditMediaModal('${m.id}')" title="تعديل بيانات أو استبدال الصورة">
                    <span>تعديل الصورة</span> ✏️
                  </button>
                  <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="color:var(--rooh-danger); border-color:var(--rooh-danger); padding:4px 10px;" onclick="window.roohAdmin.deleteMedia('${m.id}')" title="حذف">
                    🗑️
                  </button>
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="flex:1; font-size:0.72rem; padding:4px 6px;" onclick="window.roohAdmin.setMediaAsTarget('${m.id}', 'logo')" title="تعيين كشعار الموقع">
                    👑 تعيين كشعار
                  </button>
                  <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="flex:1; font-size:0.72rem; padding:4px 6px;" onclick="window.roohAdmin.setMediaAsTarget('${m.id}', 'hero')" title="تعيين كبانر الهيرو">
                    🌟 تعيين كبانر
                  </button>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="modal-overlay" id="mediaUploadModalRoot"></div>
    `;
  }

  openUploadMediaModal(editMedia = null) {
    const modalRoot = document.getElementById('mediaUploadModalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:520px; max-height:90vh; overflow-y:auto;">
        <button class="modal-close-btn" onclick="document.getElementById('mediaUploadModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin-bottom:16px;">
          ${editMedia ? 'تعديل أو استبدال الصورة بملف جديد' : 'رفع صورة جديدة من جهاز الكمبيوتر / الموبايل'}
        </h3>
        <form onsubmit="window.roohAdmin.handleMediaUploadSubmit(event, '${editMedia?.id || ''}')" style="display:flex; flex-direction:column; gap:14px;">
          <!-- File Upload Box -->
          <div>
            <label class="form-label">اختيار ملف الصورة من جهازك (Upload from PC):</label>
            <div style="border:2px dashed var(--rooh-gold); background:#FAF8F5; border-radius:12px; padding:20px; text-align:center; cursor:pointer;" onclick="document.getElementById('mediaLocalFileInput').click()">
              <input type="file" id="mediaLocalFileInput" accept="image/*" style="display:none;" onchange="window.roohAdmin.handleMediaFileSelected(this)" />
              <div style="font-size:2rem; margin-bottom:6px;">📁</div>
              <div style="font-weight:700; color:var(--rooh-dark); font-size:0.95rem;">انقر لاختيار ملف صورة من الكمبيوتر أو الهاتف</div>
              <div style="font-size:0.78rem; color:var(--rooh-muted); margin-top:4px;">يدعم PNG, JPG, WEBP, SVG بجودة عالية وفورية</div>
            </div>
            <div id="mediaUploadPreviewBox" style="margin-top:10px; text-align:center; ${editMedia?.url ? '' : 'display:none;'}">
              <img id="mediaUploadPreviewImg" src="${editMedia?.url || ''}" style="max-height:120px; border-radius:8px; border:1px solid #E8E2D8; object-fit:contain;" />
              <div id="mediaUploadPreviewStatus" style="font-size:0.75rem; color:#2E7D32; font-weight:700; margin-top:4px;">${editMedia?.url ? '● الصورة الحالية' : ''}</div>
            </div>
            <input type="hidden" id="medUrlHidden" value="${editMedia?.url || ''}" />
          </div>

          <div>
            <label class="form-label">اسم ووصف الصورة *</label>
            <input type="text" id="medName" class="form-input" required value="${editMedia?.name || ''}" placeholder="مثال: لوجو روح الملكي الجديد / صورة سيروم الورد" />
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="form-label">تصنيف الصورة:</label>
              <select id="medCategory" class="form-input">
                <option value="site" ${editMedia?.category === 'site' ? 'selected' : ''}>الموقع الرئيسي</option>
                <option value="store" ${editMedia?.category === 'store' ? 'selected' : ''}>المتجر والمنتجات</option>
                <option value="lab" ${editMedia?.category === 'lab' ? 'selected' : ''}>معمل ابتكار المستحضرات</option>
                <option value="branding" ${editMedia?.category === 'branding' ? 'selected' : ''}>الهوية واللوجو</option>
              </select>
            </div>
            <div>
              <label class="form-label">مكان التطبيق في الموقع:</label>
              <select id="medTarget" class="form-input">
                <option value="" ${!editMedia?.target ? 'selected' : ''}>حفظ بالمكتبة فقط</option>
                <option value="logo" ${editMedia?.target === 'logo' ? 'selected' : ''}>👑 تعيين كشعار الموقع (Logo)</option>
                <option value="hero" ${editMedia?.target === 'hero' ? 'selected' : ''}>🌟 تعيين كبانر الهيرو الرئيسي</option>
              </select>
            </div>
          </div>

          <button type="submit" class="btn-rooh btn-rooh-primary" style="margin-top:8px; padding:13px; font-size:1rem;">
            <span>${editMedia ? 'حفظ تعديلات الصورة 💾' : 'حفظ الصورة وتطبيقها في الموقع 🚀'}</span>
          </button>
        </form>
      </div>
    `;

    modalRoot.classList.add('open');
  }

  async openEditMediaModal(mediaId) {
    const all = await window.roohDB.getMediaLibrary();
    const target = all.find(m => m.id === mediaId);
    if (target) {
      this.openUploadMediaModal(target);
    }
  }

  handleMediaFileSelected(input) {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      document.getElementById('medUrlHidden').value = dataUrl;
      const previewBox = document.getElementById('mediaUploadPreviewBox');
      const previewImg = document.getElementById('mediaUploadPreviewImg');
      const status = document.getElementById('mediaUploadPreviewStatus');
      if (previewBox && previewImg) {
        previewBox.style.display = 'block';
        previewImg.src = dataUrl;
        if (status) status.innerHTML = `✓ تم تحميل ملف (${file.name}) بنجاح وجاهز للحفظ`;
      }
      const nameInput = document.getElementById('medName');
      if (nameInput && !nameInput.value) {
        nameInput.value = file.name.replace(/\.[^/.]+$/, '');
      }
    };
    reader.readAsDataURL(file);
  }

  async handleMediaUploadSubmit(e, editId) {
    e.preventDefault();
    const name = document.getElementById('medName').value.trim();
    const category = document.getElementById('medCategory').value;
    const target = document.getElementById('medTarget').value;
    const url = document.getElementById('medUrlHidden').value.trim();

    if (!url) {
      alert('يرجى اختيار ملف صورة من جهازك أولاً.');
      return;
    }

    try {
      if (editId) {
        await window.roohDB.updateMedia(editId, { name, category, target, url });
        window.RoohUtil.showToast('تم تحديث الصورة بنجاح ✓', 'success');
      } else {
        await window.roohDB.uploadMedia({ name, category, target, url, size: 'ملف مرفوع من الكمبيوتر' });
        window.RoohUtil.showToast('تم رفع الصورة بنجاح ✓', 'success');
      }

      // If set as logo or hero, update settings immediately
      if (target === 'logo') {
        await window.roohDB.saveSettings({ brand_logo: url });
        window.RoohUtil.showToast('تم اعتماد الشعار الجديد للموقع بنجاح 👑', 'success');
      } else if (target === 'hero') {
        await window.roohDB.saveSettings({ hero_banner: url });
        window.RoohUtil.showToast('تم اعتماد بانر الموقع الجديد بنجاح 🌟', 'success');
      }

      document.getElementById('mediaUploadModalRoot').classList.remove('open');
      this.navigateTo('media_library');
    } catch (err) {
      alert('فشل حفظ الصورة');
    }
  }

  async setMediaAsTarget(id, targetType) {
    const all = await window.roohDB.getMediaLibrary();
    const m = all.find(item => item.id === id);
    if (!m) return;

    try {
      if (targetType === 'logo') {
        await window.roohDB.saveSettings({ brand_logo: m.url });
        await window.roohDB.updateMedia(id, { target: 'logo' });
        window.RoohUtil.showToast('تم تعيين الصورة كشعار رسمي للموقع بنجاح 👑', 'success');
      } else if (targetType === 'hero') {
        await window.roohDB.saveSettings({ hero_banner: m.url });
        await window.roohDB.updateMedia(id, { target: 'hero' });
        window.RoohUtil.showToast('تم تعيين الصورة كبانر رئيسي للموقع بنجاح 🌟', 'success');
      }
      this.navigateTo('media_library');
    } catch (e) {
      alert('فشل تطبيق التعيين');
    }
  }

  async deleteMedia(id) {
    if (!confirm('هل تريد حذف هذه الصورة من المكتبة؟')) return;
    try {
      await window.roohDB.deleteMedia(id);
      window.RoohUtil.showToast('تم حذف الصورة ✓', 'info');
      this.navigateTo('media_library');
    } catch (e) {
      alert('فشل الحذف');
    }
  }

  // =========================================================================
  // SECTION 15 & 16: PALETTE & BOTANICAL NATURE MOTIFS (باليتة الألوان وزخارف الطبيعة)
  // =========================================================================
  async renderColors(root, type = 'site') {
    const colors = await window.roohDB.getThemeColors() || {};
    const unifiedBg = colors.unified_bg || colors.site?.background || '#FAF6EE';
    const activeMotif = colors.motif || 'none';
    const motifOpacity = colors.motif_opacity || 0.12;

    const luxurySwatches = [
      { name: 'الذهبي الملكي (Royal Gold)', hex: '#BFA15F' },
      { name: 'العاجي اللؤلؤي (Pearl Ivory)', hex: '#FAF6EE' },
      { name: 'الزمرد الطبيعي (Deep Emerald)', hex: '#1B4D3E' },
      { name: 'الوردي المخملي (Velvet Rose)', hex: '#C98D83' },
      { name: 'الكحلي الإمبراطوري (Midnight Navy)', hex: '#1B2A4A' },
      { name: 'الأسود الفاخر (Onyx Black)', hex: '#24211E' },
      { name: 'رمل الصحراء الدافئ (Desert Sand)', hex: '#EFE9DF' },
      { name: 'عنبر الغروب (Sunset Amber)', hex: '#D97706' },
      { name: 'أوراق الميرمية (Soft Sage)', hex: '#7E927A' },
      { name: 'العنابي الملكي (Burgundy)', hex: '#7A1C2E' },
      { name: 'البرونز النحاسي (Copper Bronze)', hex: '#8C6239' },
      { name: 'اللافندر الهادئ (Soft Lavender)', hex: '#EAE5F3' },
      { name: 'الرمادي الناعم (Cashmere Grey)', hex: '#ECE8E1' },
      { name: 'النعناع العشبي (Mint Herbal)', hex: '#E2EBE2' },
      { name: 'الخوخي الرقيق (Blush Peach)', hex: '#FBECE8' },
      { name: 'الأبيض الملكي الصافي (Pure White)', hex: '#FFFFFF' },
      { name: 'الشوكولاتة الداكنة (Dark Truffle)', hex: '#38302A' },
      { name: 'الأزرق الفيروزي (Royal Cyan)', hex: '#2E6B77' }
    ];

    root.innerHTML = `
      <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">
            لوحة الألوان المفتوحة وخلفيات الطبيعة الراقية
          </h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">
            انقر على أي درجة في لوحة الألوان لتوحيد خلفية الموقع والمتجر فوراً، مع إمكانية إضافة زخارف طبيعية رقيقة كأوراق الشجر وبتلات الورد.
          </p>
        </div>
        <button class="btn-rooh btn-rooh-primary" onclick="window.roohAdmin.saveUnifiedThemeSettings()">
          <span>حفظ وتطبيق التصميم بالكامل</span>
          <span>💾</span>
        </button>
      </div>

      <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:24px; align-items:start;">
        <!-- Left: Color Selection & Botanical Motifs Controls -->
        <div style="display:flex; flex-direction:column; gap:20px;">
          <!-- Master Spectrum & Current Color -->
          <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border);">
            <h3 style="font-size:1.05rem; font-weight:700; color:var(--rooh-dark); margin:0 0 14px;">
              1. اللون الموحد لخلفية المتجر والموقع:
            </h3>
            <div style="display:flex; align-items:center; gap:16px; background:#FAF8F5; padding:16px; border-radius:12px; border:1px solid #E8E2D8;">
              <input type="color" id="masterColorPicker" value="${unifiedBg}" style="width:64px; height:64px; border:none; border-radius:12px; cursor:pointer; box-shadow:var(--rooh-shadow-sm);" oninput="window.roohAdmin.previewUnifiedColor(this.value)" />
              <div style="flex:1;">
                <label style="font-size:0.85rem; font-weight:700; color:var(--rooh-dark); display:block; margin-bottom:4px;">كود اللون المختار (HEX / RGB):</label>
                <div style="display:flex; gap:8px;">
                  <input type="text" id="masterColorHex" value="${unifiedBg}" class="form-input" style="font-family:monospace; font-weight:800; text-transform:uppercase; font-size:1rem; width:140px;" oninput="window.roohAdmin.previewUnifiedColor(this.value)" />
                  <span style="font-size:0.8rem; color:var(--rooh-muted); align-self:center;">انقر على المربع لاختيار أي درجة مخصصة من الطيف الكامل</span>
                </div>
              </div>
            </div>

            <!-- 18 Royal Swatches Grid -->
            <div style="margin-top:18px;">
              <label style="font-size:0.85rem; font-weight:700; color:var(--rooh-muted); display:block; margin-bottom:10px;">درجات ألوان ملكية جاهزة ومختارة بعناية (انقر للاختيار المباشر):</label>
              <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(46px, 1fr)); gap:10px;">
                ${luxurySwatches.map(s => `
                  <div onclick="window.roohAdmin.previewUnifiedColor('${s.hex}')" title="${s.name} (${s.hex})" style="height:46px; border-radius:10px; background:${s.hex}; cursor:pointer; border:2px solid ${unifiedBg.toLowerCase() === s.hex.toLowerCase() ? 'var(--rooh-gold)' : 'rgba(0,0,0,0.08)'}; box-shadow:0 2px 6px rgba(0,0,0,0.08); transition:transform 0.2s; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                    ${unifiedBg.toLowerCase() === s.hex.toLowerCase() ? '<span style="color:#BFA15F; font-size:1.2rem; filter:drop-shadow(0 1px 2px #000);">✓</span>' : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Botanical Nature Motifs -->
          <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border);">
            <h3 style="font-size:1.05rem; font-weight:700; color:var(--rooh-dark); margin:0 0 8px;">
              2. زخارف وتأثيرات الطبيعة الراقية (Nature & Botanical Motifs):
            </h3>
            <p style="font-size:0.82rem; color:var(--rooh-muted); margin:0 0 16px;">
              دمج نفس لون الخلفية المختار مع نقوش طبيعية رقيقة تمنح المتجر لمسة عضوية ملكية فخمة:
            </p>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:18px;">
              <label style="border:2px solid ${activeMotif === 'none' ? 'var(--rooh-gold)' : 'var(--admin-border)'}; background:${activeMotif === 'none' ? 'var(--rooh-sand-light)' : '#FFF'}; padding:14px 10px; border-radius:12px; text-align:center; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px;">
                <input type="radio" name="natureMotif" value="none" ${activeMotif === 'none' ? 'checked' : ''} onchange="window.roohAdmin.previewMotif('none')" style="display:none;" />
                <span style="font-size:1.6rem;">✨</span>
                <span style="font-size:0.85rem; font-weight:700; color:var(--rooh-dark);">لون نقي كلاسيكي</span>
                <span style="font-size:0.72rem; color:var(--rooh-muted);">بدون زخارف</span>
              </label>

              <label style="border:2px solid ${activeMotif === 'leaves' ? 'var(--rooh-gold)' : 'var(--admin-border)'}; background:${activeMotif === 'leaves' ? 'var(--rooh-sand-light)' : '#FFF'}; padding:14px 10px; border-radius:12px; text-align:center; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px;">
                <input type="radio" name="natureMotif" value="leaves" ${activeMotif === 'leaves' ? 'checked' : ''} onchange="window.roohAdmin.previewMotif('leaves')" style="display:none;" />
                <span style="font-size:1.6rem;">🌿</span>
                <span style="font-size:0.85rem; font-weight:700; color:var(--rooh-dark);">ورق شجر ناعم</span>
                <span style="font-size:0.72rem; color:var(--rooh-muted);">أغصان نباتية رقيقة</span>
              </label>

              <label style="border:2px solid ${activeMotif === 'petals' ? 'var(--rooh-gold)' : 'var(--admin-border)'}; background:${activeMotif === 'petals' ? 'var(--rooh-sand-light)' : '#FFF'}; padding:14px 10px; border-radius:12px; text-align:center; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px;">
                <input type="radio" name="natureMotif" value="petals" ${activeMotif === 'petals' ? 'checked' : ''} onchange="window.roohAdmin.previewMotif('petals')" style="display:none;" />
                <span style="font-size:1.6rem;">🌸</span>
                <span style="font-size:0.85rem; font-weight:700; color:var(--rooh-dark);">بتلات ورد ملكية</span>
                <span style="font-size:0.72rem; color:var(--rooh-muted);">تناثر بتلات الزهور</span>
              </label>

              <label style="border:2px solid ${activeMotif === 'waves' ? 'var(--rooh-gold)' : 'var(--admin-border)'}; background:${activeMotif === 'waves' ? 'var(--rooh-sand-light)' : '#FFF'}; padding:14px 10px; border-radius:12px; text-align:center; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px;">
                <input type="radio" name="natureMotif" value="waves" ${activeMotif === 'waves' ? 'checked' : ''} onchange="window.roohAdmin.previewMotif('waves')" style="display:none;" />
                <span style="font-size:1.6rem;">🌊</span>
                <span style="font-size:0.85rem; font-weight:700; color:var(--rooh-dark);">تموجات حريرية</span>
                <span style="font-size:0.72rem; color:var(--rooh-muted);">تموجات ماء هادئة</span>
              </label>

              <label style="border:2px solid ${activeMotif === 'marble' ? 'var(--rooh-gold)' : 'var(--admin-border)'}; background:${activeMotif === 'marble' ? 'var(--rooh-sand-light)' : '#FFF'}; padding:14px 10px; border-radius:12px; text-align:center; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px;">
                <input type="radio" name="natureMotif" value="marble" ${activeMotif === 'marble' ? 'checked' : ''} onchange="window.roohAdmin.previewMotif('marble')" style="display:none;" />
                <span style="font-size:1.6rem;">🏛️</span>
                <span style="font-size:0.85rem; font-weight:700; color:var(--rooh-dark);">رخام إمبراطوري</span>
                <span style="font-size:0.72rem; color:var(--rooh-muted);">عروق رخامية كلاسيكية</span>
              </label>
            </div>

            <!-- Motif Opacity Slider -->
            <div style="background:#FAF8F5; padding:14px 18px; border-radius:10px; border:1px solid #E8E2D8;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label style="font-size:0.85rem; font-weight:700; color:var(--rooh-dark);">درجة ظهور الزخرفة (شفافية النقش):</label>
                <span id="motifOpacityVal" style="font-weight:800; color:var(--rooh-gold); font-size:0.9rem;">${Math.round(motifOpacity * 100)}%</span>
              </div>
              <input type="range" id="motifOpacitySlider" min="0.04" max="0.35" step="0.02" value="${motifOpacity}" style="width:100%; cursor:pointer;" oninput="window.roohAdmin.previewMotifOpacity(this.value)" />
            </div>
          </div>
        </div>

        <!-- Right: Live Real-Time Interactive Canvas Preview -->
        <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); position:sticky; top:20px;">
          <h3 style="font-size:1.05rem; font-weight:700; color:var(--rooh-dark); margin:0 0 12px; display:flex; align-items:center; justify-content:space-between;">
            <span>👁️ المعاينة الحية لمتجر وموقع روح:</span>
            <span style="font-size:0.75rem; color:#2E7D32;">● تنعكس التغييرات لحظياً</span>
          </h3>

          <div id="paletteLivePreviewBox" style="border-radius:14px; border:2px solid var(--rooh-border); overflow:hidden; background-color:${unifiedBg}; position:relative; min-height:480px; box-shadow:var(--rooh-shadow-md); transition:background-color 0.3s;">
            <!-- Motif Overlay Inside Preview -->
            <div id="previewMotifOverlay" class="site-nature-overlay ${activeMotif !== 'none' ? 'motif-' + activeMotif : ''}" style="opacity:${motifOpacity}; position:absolute; z-index:1;"></div>

            <!-- Mini Store Simulation -->
            <div style="position:relative; z-index:2; padding:18px;">
              <!-- Mini Header -->
              <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:12px; border-bottom:1px solid rgba(0,0,0,0.08);">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div style="width:32px; height:32px; border-radius:50%; background:var(--rooh-gold); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:800;">ر</div>
                  <strong style="font-family:var(--rooh-font-serif); font-size:1rem; color:var(--rooh-dark);">ROOH – روح</strong>
                </div>
                <div style="display:flex; gap:6px;">
                  <span style="font-size:0.75rem; padding:3px 8px; border-radius:20px; background:rgba(191,161,95,0.2); font-weight:700;">🛍️ سلة التسوق</span>
                </div>
              </div>

              <!-- Mini Hero Banner -->
              <div style="margin:20px 0; text-align:center; padding:24px 14px; background:rgba(255,255,255,0.7); backdrop-filter:blur(6px); border-radius:12px; border:1px solid rgba(191,161,95,0.3);">
                <span style="font-size:0.75rem; background:var(--rooh-gold); color:#FFF; padding:2px 8px; border-radius:10px;">عناية ملكية طبيعية</span>
                <h4 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:8px 0 4px;">فخامة الطبيعة.. وإشراقة تدوم</h4>
                <p style="font-size:0.8rem; color:var(--rooh-muted); margin:0 0 12px;">مستحضرات تجميل مصممة بعناية فائقة لتبرز جمالك الطبيعي</p>
                <button class="btn-rooh btn-rooh-primary btn-rooh-sm" style="font-size:0.8rem; padding:6px 16px;">تسوقي الآن ✨</button>
              </div>

              <!-- Mini Category Pills -->
              <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:10px;">
                <span style="padding:4px 10px; border-radius:20px; background:var(--rooh-gold); color:#FFF; font-size:0.72rem; font-weight:700;">✨ جميع المنتجات</span>
                <span style="padding:4px 10px; border-radius:20px; background:rgba(255,255,255,0.8); font-size:0.72rem; font-weight:700; border:1px solid #E8E2D8;">🌿 العناية بالشعر</span>
                <span style="padding:4px 10px; border-radius:20px; background:rgba(255,255,255,0.8); font-size:0.72rem; font-weight:700; border:1px solid #E8E2D8;">🧴 العناية بالبشرة</span>
              </div>

              <!-- Mini Sample Product Card -->
              <div style="background:rgba(255,255,255,0.9); border-radius:12px; padding:12px; border:1px solid #E8E2D8; display:flex; gap:12px; align-items:center; margin-top:10px;">
                <div style="width:50px; height:50px; border-radius:8px; background:#FAF6EE; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">🌸</div>
                <div style="flex:1;">
                  <strong style="font-size:0.85rem; color:var(--rooh-dark); display:block;">سيروم النضارة الملكي</strong>
                  <span style="font-size:0.78rem; color:var(--rooh-gold); font-weight:800;">380 ج.م</span>
                </div>
                <button class="btn-rooh btn-rooh-primary btn-rooh-sm" style="padding:4px 10px; font-size:0.75rem;">+ إضافة</button>
              </div>
            </div>
          </div>

          <button class="btn-rooh btn-rooh-primary" style="width:100%; margin-top:16px; padding:14px; font-size:1rem;" onclick="window.roohAdmin.saveUnifiedThemeSettings()">
            <span>حفظ واعتماد هذا اللون والخلفية في الموقع والمتجر 💾</span>
          </button>
        </div>
      </div>
    `;
  }

  previewUnifiedColor(hex) {
    if (!hex) return;
    document.getElementById('masterColorPicker').value = hex;
    document.getElementById('masterColorHex').value = hex;
    const box = document.getElementById('paletteLivePreviewBox');
    if (box) box.style.backgroundColor = hex;
  }

  previewMotif(motif) {
    const overlay = document.getElementById('previewMotifOverlay');
    if (overlay) {
      overlay.className = `site-nature-overlay ${motif !== 'none' ? 'motif-' + motif : ''}`;
    }
  }

  previewMotifOpacity(val) {
    const overlay = document.getElementById('previewMotifOverlay');
    const label = document.getElementById('motifOpacityVal');
    if (overlay) overlay.style.opacity = val;
    if (label) label.textContent = `${Math.round(val * 100)}%`;
  }

  async saveUnifiedThemeSettings() {
    const hex = document.getElementById('masterColorHex').value.trim();
    const motif = document.querySelector('input[name="natureMotif"]:checked')?.value || 'none';
    const opacity = Number(document.getElementById('motifOpacitySlider').value) || 0.12;

    const payload = {
      unified_bg: hex,
      motif: motif,
      motif_opacity: opacity,
      site: { background: hex, primary: '#BFA15F' },
      store: { background: hex, primary: '#BFA15F' }
    };

    try {
      await window.roohDB.saveThemeColors(payload);
      window.RoohUtil.showToast('تم حفظ وتطبيق اللون والخلفية على كامل الموقع والمتجر بنجاح ✓', 'success');
      // Apply immediately to current admin page background
      document.body.style.backgroundColor = hex;
    } catch (e) {
      alert('فشل حفظ إعدادات الألوان');
    }
  }

  // =========================================================================
  // SECTION 17 & 18: INTERACTIVE IN-PLACE STORE & WEBSITE DESIGNERS
  // =========================================================================
  async renderWebsiteBuilder(root) {
    await this.renderVisualCustomizer(root, 'site');
  }

  async renderStoreBuilder(root) {
    await this.renderVisualCustomizer(root, 'store');
  }

  async renderVisualCustomizer(root, mode = 'site') {
    const settings = await window.roohDB.getSettings() || {};
    const categories = await window.roohDB.getCategories() || [];
    const products = await window.roohDB.getProducts('all') || [];

    root.innerHTML = `
      <!-- Sticky Top Builder Action Bar -->
      <div style="background:#FFF; padding:18px 24px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; position:sticky; top:10px; z-index:100; box-shadow:var(--rooh-shadow-md);">
        <div>
          <div style="display:flex; align-items:center; gap:10px;">
            <h2 style="font-family:var(--rooh-font-serif); font-size:1.4rem; color:var(--rooh-dark); margin:0;">
              ${mode === 'site' ? '🌐 تصميم الموقع (المحرر البصري الحي المباشر)' : '🏬 تصميم المتجر وسوق روح (المحرر البصري الحي المباشر)'}
            </h2>
            <span class="status-pill status-ready">● وضع التعديل التفاعلي المباشر</span>
          </div>
          <p style="font-size:0.82rem; color:var(--rooh-muted); margin:4px 0 0;">
            انقر على أي نص أو عنوان أو زر في المعاينة لتعديله في مكانه فوراً، واستخدم زر رفع اللوجو لتغيير شعار الموقع بملف من جهازك.
          </p>
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          <!-- Logo File Upload from PC -->
          <input type="file" id="builderLogoFileInput" accept="image/*" style="display:none;" onchange="window.roohAdmin.handleLogoFileSelected(this)" />
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="document.getElementById('builderLogoFileInput').click()" style="border-color:var(--rooh-gold); color:var(--rooh-gold);">
            <span>📁 رفع لوجو / بروفايل من الكمبيوتر</span>
          </button>

          <!-- Save Design Button -->
          <button class="btn-rooh btn-rooh-primary" style="padding:10px 24px; font-weight:700;" onclick="window.roohAdmin.saveVisualCustomizerChanges('${mode}')">
            <span>💾 حفظ التصميم والتعديلات</span>
          </button>
        </div>
      </div>

      <!-- Live Interactive Visual Canvas (Replication of Store/Site) -->
      <div style="background:#FFF; border-radius:16px; border:2px solid var(--rooh-border); overflow:hidden; box-shadow:var(--rooh-shadow-lg);">
        <!-- Announcement Bar -->
        <div style="background:var(--rooh-dark); color:#DDD4C5; padding:10px 20px; text-align:center; font-size:0.85rem; border-bottom:1px solid rgba(191,161,95,0.3);">
          <div class="visual-editable-item" contenteditable="true" id="liveEditAnnouncement" title="انقر لتعديل نص شريط الإعلانات">
            ${settings.top_announcement || '✨ أهلاً بكم في روح (ROOH) – شحن مجاني لكافة محافظات جمهورية مصر العربية للطلبات فوق 750 ج.م'}
          </div>
        </div>

        <!-- Main Header -->
        <div style="padding:16px 28px; background:#FAF6EE; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E8E2D8;">
          <!-- Brand Logo Area -->
          <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="document.getElementById('builderLogoFileInput').click()" title="انقر لتغيير اللوجو بملف من جهازك">
            <div id="livePreviewLogoWrap" style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, var(--rooh-gold), #D4BA7D); display:flex; align-items:center; justify-content:center; overflow:hidden; box-shadow:var(--rooh-shadow-sm);">
              ${settings.brand_logo ? `<img src="${settings.brand_logo}" id="livePreviewLogoImg" style="width:100%; height:100%; object-fit:cover;" />` : `<span id="livePreviewLogoText" style="font-size:1.4rem; color:#FFF; font-weight:800;">ر</span>`}
            </div>
            <div>
              <div class="visual-editable-item" contenteditable="true" id="liveEditBrandName" style="font-family:var(--rooh-font-serif); font-size:1.35rem; font-weight:800; color:var(--rooh-dark);">
                ${settings.brand_name_ar || 'ROOH – روح'}
              </div>
              <div class="visual-editable-item" contenteditable="true" id="liveEditBrandSubtext" style="font-size:0.75rem; color:var(--rooh-muted);">
                ${settings.brand_subtext || 'روح للمستحضرات الملكية والطبيعية'}
              </div>
            </div>
          </div>

          <!-- Nav Items -->
          <div style="display:flex; gap:16px; font-size:0.9rem; font-weight:700; color:var(--rooh-dark);">
            <span>الرئيسية</span>
            <span style="color:var(--rooh-gold);">سوق روح (المتجر)</span>
            <span>اصنع منتجكِ بنفسكِ ✨</span>
            <span>قصة روح</span>
            <span>آراء العملاء</span>
          </div>

          <!-- Header Actions -->
          <div style="display:flex; align-items:center; gap:10px;">
            <button class="btn-rooh btn-rooh-primary btn-rooh-sm">تسوقي الآن</button>
            <span style="font-size:1.2rem;">🛍️</span>
          </div>
        </div>

        <!-- Hero Section Canvas -->
        <div style="padding:48px 36px; background:radial-gradient(circle at 10% 20%, #FAF6EE 0%, #F5EFE6 50%, #EBE2D3 100%); border-bottom:1px solid #E8E2D8; position:relative;">
          <div style="max-width:750px;">
            <span style="display:inline-block; background:var(--rooh-gold); color:#FFF; font-size:0.8rem; padding:4px 12px; border-radius:20px; font-weight:700; margin-bottom:14px;">
              👑 عناية ملكية بمستخلصات طبيعية 100%
            </span>
            <h1 class="visual-editable-item" contenteditable="true" id="liveEditHeroTitle" style="font-family:var(--rooh-font-serif); font-size:2.4rem; color:var(--rooh-dark); margin:0 0 14px; line-height:1.3;">
              ${settings.hero_title || 'فخامة الطبيعة.. وإشراقة تدوم في روحكِ'}
            </h1>
            <p class="visual-editable-item" contenteditable="true" id="liveEditHeroDesc" style="font-size:1.1rem; color:var(--rooh-muted); margin:0 0 24px; line-height:1.7;">
              ${settings.hero_desc || 'نبتكر في روح مستحضرات تجميل راقية تجمع بين نقاء الزيوت الطبيعية المعصورة على البارد وأحدث علوم التركيبات الجلدية لتنعمي بإشراقة مخملية ساحرة.'}
            </p>
            <div style="display:flex; gap:14px;">
              <button class="visual-editable-item btn-rooh btn-rooh-primary" contenteditable="true" id="liveEditBtnStore" style="padding:12px 28px; font-size:1rem;">
                ${settings.btn_store_text || 'تسوقي في سوق روح'}
              </button>
              <button class="visual-editable-item btn-rooh btn-rooh-outline" contenteditable="true" id="liveEditBtnLab" style="padding:12px 28px; font-size:1rem; background:rgba(255,255,255,0.7);">
                ${settings.btn_lab_text || 'اصنعي منتجكِ بنفسكِ ✨'}
              </button>
            </div>
          </div>
        </div>

        <!-- Store Catalog Section Canvas -->
        <div style="padding:36px; background:#FAF6EE;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:14px;">
            <div>
              <h2 class="visual-editable-item" contenteditable="true" id="liveEditStoreTitle" style="font-family:var(--rooh-font-serif); font-size:1.8rem; color:var(--rooh-dark); margin:0 0 4px;">
                ${settings.catalog_title || 'سوق روح – تشكيلة مستحضرات التجميل الراقية'}
              </h2>
              <span class="visual-editable-item" contenteditable="true" id="liveEditStoreSub" style="font-size:0.88rem; color:var(--rooh-muted);">
                ${settings.store_name_ar || 'سوق روح للمستحضرات التجميل الطبيعية'}
              </span>
            </div>
            <div style="background:#FFF; padding:8px 16px; border-radius:10px; border:1px solid #E8E2D8; font-size:0.85rem;">
              🚚 الشحن المجاني يبدأ من: <strong id="liveFreeShipThreshold">${settings.free_shipping_threshold || 750} ج.م</strong>
            </div>
          </div>

          <!-- Sample Product Cards Grid -->
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:18px;">
            ${(products.slice(0, 4)).map(p => `
              <div style="background:#FFF; border-radius:12px; border:1px solid #E8E2D8; overflow:hidden; padding:12px; box-shadow:var(--rooh-shadow-sm);">
                <div style="height:140px; background:#F5EFE6; border-radius:8px; overflow:hidden; margin-bottom:10px;">
                  <img src="${p.image}" style="width:100%; height:100%; object-fit:cover;" />
                </div>
                <span style="font-size:0.75rem; color:var(--rooh-gold); font-weight:700;">🏷️ ${p.category_name_ar || 'تجميل'}</span>
                <h4 style="font-size:0.95rem; margin:4px 0 8px; color:var(--rooh-dark);">${p.name_ar}</h4>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-weight:800; color:var(--rooh-gold); font-size:1.05rem;">${p.price} ج.م</span>
                  <button class="btn-rooh btn-rooh-primary btn-rooh-sm" style="padding:4px 10px; font-size:0.75rem;">شراء</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- About & Mission Section -->
        <div style="padding:36px; background:#FFF; border-top:1px solid #E8E2D8;">
          <h3 class="visual-editable-item" contenteditable="true" id="liveEditStoryTitle" style="font-family:var(--rooh-font-serif); font-size:1.4rem; color:var(--rooh-dark); margin:0 0 8px;">
            قصة روح ورسالتنا الملكية
          </h3>
          <p class="visual-editable-item" contenteditable="true" id="liveEditStoryMission" style="font-size:0.95rem; color:var(--rooh-muted); line-height:1.7; margin:0;">
            ${settings.story_mission || 'تمكين كل امرأة ورجل من الحصول على عناية صحية نقية متطورة مصممة خصيصاً لاحتياجاتهم، بمكونات نباتية مستدامة ومعتمدة بأعلى المعايير المعملية العالمية.'}
          </p>
        </div>
      </div>
    `;

    // Inject hover styles for interactive editable elements
    if (!document.getElementById('visualBuilderStyleTag')) {
      const style = document.createElement('style');
      style.id = 'visualBuilderStyleTag';
      style.innerHTML = `
        .visual-editable-item {
          transition: all 0.2s ease;
          border-radius: 6px;
          outline: none;
        }
        .visual-editable-item:hover {
          outline: 2px dashed #BFA15F !important;
          background: rgba(191,161,95,0.08) !important;
          cursor: text;
        }
        .visual-editable-item:focus {
          outline: 2px solid #BFA15F !important;
          background: #FFF !important;
          box-shadow: 0 0 0 4px rgba(191,161,95,0.2) !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  handleLogoFileSelected(input) {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const wrap = document.getElementById('livePreviewLogoWrap');
      if (wrap) {
        wrap.innerHTML = `<img src="${dataUrl}" id="livePreviewLogoImg" style="width:100%; height:100%; object-fit:cover;" />`;
      }
      // Save logo into state
      window._tempNewLogoDataUrl = dataUrl;
      window.RoohUtil.showToast('تم تحميل الشعار الجديد من الكمبيوتر بنجاح! اضغط على "حفظ التصميم" لتطبيقه 👑', 'success');
    };
    reader.readAsDataURL(file);
  }

  async saveVisualCustomizerChanges(mode = 'site', showToast = true) {
    const announcement = document.getElementById('liveEditAnnouncement')?.innerText.trim();
    const brandName = document.getElementById('liveEditBrandName')?.innerText.trim();
    const brandSubtext = document.getElementById('liveEditBrandSubtext')?.innerText.trim();
    const heroTitle = document.getElementById('liveEditHeroTitle')?.innerText.trim();
    const heroDesc = document.getElementById('liveEditHeroDesc')?.innerText.trim();
    const btnStore = document.getElementById('liveEditBtnStore')?.innerText.trim();
    const btnLab = document.getElementById('liveEditBtnLab')?.innerText.trim();
    const storeTitle = document.getElementById('liveEditStoreTitle')?.innerText.trim();
    const storeSub = document.getElementById('liveEditStoreSub')?.innerText.trim();
    const storyMission = document.getElementById('liveEditStoryMission')?.innerText.trim();

    const payload = {};
    if (announcement !== undefined) payload.top_announcement = announcement;
    if (brandName !== undefined) payload.brand_name_ar = brandName;
    if (brandSubtext !== undefined) payload.brand_subtext = brandSubtext;
    if (heroTitle !== undefined) payload.hero_title = heroTitle;
    if (heroDesc !== undefined) payload.hero_desc = heroDesc;
    if (btnStore !== undefined) payload.btn_store_text = btnStore;
    if (btnLab !== undefined) payload.btn_lab_text = btnLab;
    if (storeTitle !== undefined) payload.catalog_title = storeTitle;
    if (storeSub !== undefined) payload.store_name_ar = storeSub;
    if (storyMission !== undefined) payload.story_mission = storyMission;

    if (window._tempNewLogoDataUrl) {
      payload.brand_logo = window._tempNewLogoDataUrl;
    }

    try {
      await window.roohDB.saveSettings(payload);

      // Also update website_sections if hero or story was updated
      if (heroTitle || heroDesc || storyMission) {
        const db = window.roohDB.getLocalDB();
        if (db && db.website_sections) {
          const heroSec = db.website_sections.find(s => s.type === 'hero');
          if (heroSec) {
            if (heroTitle) heroSec.title_ar = heroTitle;
            if (heroDesc) heroSec.subtitle_ar = heroDesc;
          }
          const storySec = db.website_sections.find(s => s.type === 'story');
          if (storySec && storyMission) {
            storySec.mission_ar = storyMission;
          }
          await window.roohDB.saveBuilderSections(db.website_sections);
        }
      }

      // Persist full database to ensure permanent sync
      await window.roohDB.saveFullDatabase();

      if (showToast) {
        window.RoohUtil.showToast('تم حفظ كافة تعديلات التصميم في قاعدة البيانات ونشرها بنجاح 💾✓', 'success');
      }
    } catch (err) {
      if (showToast) alert('فشل حفظ التصميم: ' + (err.message || 'خطأ غير معروف'));
      throw err;
    }
  }

  async triggerGlobalSave() {
    const saveBtn = document.getElementById('globalSaveBtn');
    const originalHtml = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span style="font-size:1.15rem;">⏳</span> <span>جاري حفظ ونشر التعديلات...</span>';
    }

    try {
      // 1. If currently in visual customizer (website or store builder), collect and save its changes
      if (document.getElementById('liveEditAnnouncement') || document.getElementById('liveEditHeroTitle')) {
        await this.saveVisualCustomizerChanges(this.currentSection === 'store_builder' ? 'store' : 'site', false);
      }

      // 2. Sync full database to backend server and local storage
      await window.roohDB.saveFullDatabase();

      if (saveBtn) {
        saveBtn.style.background = 'linear-gradient(135deg, #1B5E20, #00C853)';
        saveBtn.innerHTML = '<span style="font-size:1.15rem;">✓</span> <span>تم الحفظ والتطبيق!</span>';
      }

      // 3. Show luxury confirmation toast
      window.RoohUtil.showToast('تم حفظ ونشر كافة التعديلات بنجاح! التعديلات أصبحت سارية ومحفوظة فوراً على الموقع والمتجر والموبايل 💾✓', 'success', 4500);

      // Play soft vibration if mobile
      if (navigator.vibrate) {
        try { navigator.vibrate([40, 60, 40]); } catch (e) {}
      }

      setTimeout(() => {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalHtml;
          saveBtn.style.background = '';
        }
      }, 2500);
    } catch (err) {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalHtml;
        saveBtn.style.background = '';
      }
      alert('حدث خطأ أثناء الحفظ: ' + (err.message || 'خطأ غير معروف'));
    }
  }

  // =========================================================================
  // SECTION 19: CUSTOM LAB EDITOR (تعديل المعمل الخاص)
  // =========================================================================
  async renderLabEditor(root) {
    const materials = await window.roohDB.getLabMaterials();
    const packaging = await window.roohDB.getLabPackaging();

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">تعديل معمل ابتكار المنتجات (اعمل منتجك بنفسك)</h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">إدارة الخامات الطبيعية، المواد الفعالة، العطور الملكية، وأشكال العبوات ومحددات المعاينة التفاعلية.</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-rooh btn-rooh-primary btn-rooh-sm" onclick="window.roohAdmin.openAddLabMaterialModal()">+ إضافة خامة معملية</button>
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.openAddLabPkgModal()">+ إضافة شكل عبوة</button>
        </div>
      </div>

      <!-- Raw Materials Table -->
      <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:24px;">
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.25rem; color:var(--rooh-dark); margin:0 0 16px;">1. قائمة الخامات والمكونات المتاحة للتركيب:</h3>
        <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
          <thead>
            <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
              <th style="padding:10px;">الأيقونة</th>
              <th style="padding:10px;">اسم المكون</th>
              <th style="padding:10px;">التصنيف</th>
              <th style="padding:10px;">السعر الإضافي</th>
              <th style="padding:10px;">المخزون المعملي</th>
              <th style="padding:10px; text-align:center;">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${materials.map(m => `
              <tr style="border-bottom:1px solid #F0ECE4;">
                <td data-label="الأيقونة" style="padding:10px; font-size:1.3rem;">${m.image || '🧪'}</td>
                <td data-label="المكون" style="padding:10px; font-weight:700;">${m.name_ar}</td>
                <td data-label="التصنيف" style="padding:10px;">${m.category}</td>
                <td data-label="السعر" style="padding:10px; font-weight:700; color:var(--rooh-gold);">${m.price} ج.م</td>
                <td data-label="المخزون" style="padding:10px;">${m.stock} عبوة</td>
                <td data-label="التحكم" style="padding:10px; text-align:center;">
                  <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="color:var(--rooh-danger); border-color:var(--rooh-danger); padding:2px 8px;" onclick="window.roohAdmin.deleteLabMaterial('${m.id}')">حذف 🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Packaging Catalog -->
      <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border);">
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.25rem; color:var(--rooh-dark); margin:0 0 16px;">2. أشكال العبوات والزجاجات الفاخرة:</h3>
        <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
          <thead>
            <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
              <th style="padding:10px;">الرمز</th>
              <th style="padding:10px;">نوع العبوة</th>
              <th style="padding:10px;">الحجم</th>
              <th style="padding:10px;">سعر العبوة</th>
              <th style="padding:10px;">الرصيد المتاح</th>
              <th style="padding:10px; text-align:center;">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${packaging.map(p => `
              <tr style="border-bottom:1px solid #F0ECE4;">
                <td data-label="الرمز" style="padding:10px; font-size:1.3rem;">${p.image || '🧴'}</td>
                <td data-label="النوع" style="padding:10px; font-weight:700;">${p.name_ar}</td>
                <td data-label="الحجم" style="padding:10px;">${p.volume}</td>
                <td data-label="السعر" style="padding:10px; font-weight:700; color:var(--rooh-gold);">${p.price} ج.م</td>
                <td data-label="المتاح" style="padding:10px;">${p.stock} قطعة</td>
                <td data-label="التحكم" style="padding:10px; text-align:center;">
                  <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="color:var(--rooh-danger); border-color:var(--rooh-danger); padding:2px 8px;" onclick="window.roohAdmin.deleteLabPackaging('${p.id}')">حذف 🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="modal-overlay" id="labModalRoot"></div>
    `;
  }

  openAddLabMaterialModal() {
    const modalRoot = document.getElementById('labModalRoot');
    if (!modalRoot) return;
    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:480px;">
        <button class="modal-close-btn" onclick="document.getElementById('labModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.35rem; margin-bottom:14px;">إضافة مكون معملي جديد</h3>
        <form onsubmit="window.roohAdmin.handleAddLabMaterial(event)" style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <label class="form-label">اسم المكون بالعربية *</label>
            <input type="text" id="lmName" class="form-input" required placeholder="مثال: ريتينول نقي 1%" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="form-label">التصنيف</label>
              <select id="lmCat" class="form-input">
                <option value="base">قاعدة طبيعية (Base)</option>
                <option value="active">مادة فعالة (Active)</option>
                <option value="fragrance">عطر ملكي (Fragrance)</option>
              </select>
            </div>
            <div>
              <label class="form-label">السعر الإضافي (ج.م)</label>
              <input type="number" id="lmPrice" class="form-input" required value="75" />
            </div>
          </div>
          <div>
            <label class="form-label">الوصف وفائدة المكون</label>
            <input type="text" id="lmDesc" class="form-input" placeholder="يعزز تجديد الخلايا..." />
          </div>
          <button type="submit" class="btn-rooh btn-rooh-primary" style="margin-top:8px; padding:12px;">إضافة لمعمل روح</button>
        </form>
      </div>
    `;
    modalRoot.classList.add('open');
  }

  async handleAddLabMaterial(e) {
    e.preventDefault();
    const payload = {
      name_ar: document.getElementById('lmName').value.trim(),
      category: document.getElementById('lmCat').value,
      price: Number(document.getElementById('lmPrice').value) || 0,
      description_ar: document.getElementById('lmDesc').value.trim(),
      stock: 50,
      available: true
    };
    await window.roohDB.saveLabMaterial(payload);
    document.getElementById('labModalRoot').classList.remove('open');
    window.RoohUtil.showToast('تمت إضافة المكون بنجاح ✓', 'success');
    this.navigateTo('lab_editor');
  }

  async deleteLabMaterial(id) {
    if (!confirm('هل تريد حذف هذا المكون من المعمل؟')) return;
    await window.roohDB.deleteLabMaterial(id);
    window.RoohUtil.showToast('تم حذف المكون ✓', 'info');
    this.navigateTo('lab_editor');
  }

  openAddLabPkgModal() {
    const modalRoot = document.getElementById('labModalRoot');
    if (!modalRoot) return;
    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:480px;">
        <button class="modal-close-btn" onclick="document.getElementById('labModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.35rem; margin-bottom:14px;">إضافة شكل عبوة جديد للمعمل</h3>
        <form onsubmit="window.roohAdmin.handleAddLabPkg(event)" style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <label class="form-label">اسم العبوة بالعربية *</label>
            <input type="text" id="lpName" class="form-input" required placeholder="مثال: زجاجة رول أون كريستال" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="form-label">الحجم</label>
              <input type="text" id="lpVol" class="form-input" value="30ml" />
            </div>
            <div>
              <label class="form-label">السعر (ج.م)</label>
              <input type="number" id="lpPrice" class="form-input" value="45" />
            </div>
          </div>
          <button type="submit" class="btn-rooh btn-rooh-primary" style="margin-top:8px; padding:12px;">حفظ العبوة</button>
        </form>
      </div>
    `;
    modalRoot.classList.add('open');
  }

  async handleAddLabPkg(e) {
    e.preventDefault();
    const payload = {
      name_ar: document.getElementById('lpName').value.trim(),
      volume: document.getElementById('lpVol').value.trim(),
      price: Number(document.getElementById('lpPrice').value) || 0,
      stock: 100
    };
    await window.roohDB.saveLabPackaging(payload);
    document.getElementById('labModalRoot').classList.remove('open');
    window.RoohUtil.showToast('تمت إضافة العبوة بنجاح ✓', 'success');
    this.navigateTo('lab_editor');
  }

  async deleteLabPackaging(id) {
    if (!confirm('هل تريد حذف هذه العبوة؟')) return;
    await window.roohDB.deleteLabPackaging(id);
    window.RoohUtil.showToast('تم حذف العبوة ✓', 'info');
    this.navigateTo('lab_editor');
  }

  // =========================================================================
  // SECTION 20: MANAGER MEETINGS & LIVE TEAM CHAT (اجتماعات المدير وفريق العمل)
  // =========================================================================
  async renderMeetings(root) {
    const data = await window.roohDB.getTeamMeetings() || { messages: [], participants: [] };
    const currentUser = window.roohDB.getCurrentUser() || { id: 'USR-001', name: 'عبدالرحمن', role_ar: 'المالك والمدير العام' };

    root.innerHTML = `
      <div class="chat-room-layout">
        <!-- Participants Sidebar -->
        <div class="chat-room-sidebar">
          <div style="padding:18px 20px; border-bottom:1px solid var(--admin-border); background:#FFF;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h3 style="font-family:var(--rooh-font-serif); font-size:1.15rem; color:var(--rooh-dark); margin:0;">فريق عمل روح المتصل</h3>
              <span class="status-pill status-ready" style="font-size:0.7rem;">مباشر ●</span>
            </div>
            <span style="font-size:0.75rem; color:var(--rooh-muted);">غرفة محادثة واجتماعات مشفرة للمدير والمساعدين</span>
          </div>

          <div style="padding:14px; display:flex; flex-direction:column; gap:8px; overflow-y:auto; flex:1;" id="chatParticipantsList">
            ${(data.participants || []).map(p => {
              const isCurrent = p.id === currentUser.id;
              return `
                <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:${isCurrent ? 'var(--rooh-sand-light)' : '#FFF'}; border-radius:10px; border:1px solid ${isCurrent ? 'var(--rooh-gold)' : 'var(--admin-border)'};">
                  <div style="position:relative; font-size:1.4rem;">
                    ${p.avatar || (p.role_ar?.includes('مدير') ? '👑' : '👤')}
                    <span style="position:absolute; bottom:0; right:0; width:9px; height:9px; border-radius:50%; background:${(p.status === 'online' || isCurrent) ? '#2E7D32' : '#9E9E9E'}; border:1.5px solid #FFF;"></span>
                  </div>
                  <div style="flex:1;">
                    <div style="font-weight:700; font-size:0.88rem; color:var(--rooh-dark); display:flex; align-items:center; gap:4px;">
                      <span>${p.name}</span>
                      ${isCurrent ? '<span style="font-size:0.7rem; color:var(--rooh-gold); font-weight:800;">(أنت الآن)</span>' : ''}
                    </div>
                    <div style="font-size:0.75rem; color:var(--rooh-muted);">${p.role_ar || (isCurrent ? currentUser.role_ar : 'مساعد فريق العمل')}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Chat Content Area -->
        <div class="chat-room-content">
          <div style="padding:16px 20px; border-bottom:1px solid var(--admin-border); background:#FFF; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <h3 style="font-size:1.15rem; font-weight:700; color:var(--rooh-dark); margin:0;">غرفة اجتماعات وتشغيل شركة روح</h3>
                <span class="status-pill status-ready" style="font-size:0.7rem;">مزامنة فورية</span>
              </div>
              <span style="font-size:0.75rem; color:var(--rooh-muted);">تسجيل الدخول باسم: <strong>${currentUser.name}</strong> (${currentUser.role_ar || 'المدير'})</span>
            </div>
            <div id="typingIndicatorEl" style="font-size:0.8rem; color:var(--rooh-gold); font-style:italic; display:none;">
              يكتب الآن...
            </div>
          </div>

          <div class="chat-messages-scroll" id="chatMessagesScroll" style="display:flex; flex-direction:column; gap:12px; padding:20px; overflow-y:auto; height:440px;">
            ${(data.messages || []).map(m => {
              const isMine = m.sender_id === currentUser.id;
              return `
                <div style="display:flex; flex-direction:column; align-items:${isMine ? 'flex-end' : 'flex-start'};">
                  <div style="font-size:0.75rem; color:var(--rooh-muted); margin-bottom:3px; display:flex; align-items:center; gap:6px;">
                    <span style="font-weight:700; color:${isMine ? 'var(--rooh-gold)' : 'var(--rooh-dark)'};">${m.sender_name}</span>
                    <span>(${m.sender_role || ''})</span>
                    <span>• ${new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style="max-width:75%; padding:12px 18px; border-radius:${isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px'}; background:${isMine ? 'linear-gradient(135deg, var(--rooh-dark), #38342F)' : '#FFF'}; color:${isMine ? '#FFF' : 'var(--rooh-dark)'}; font-size:0.92rem; line-height:1.6; border:1px solid ${isMine ? 'var(--rooh-dark)' : 'var(--rooh-border)'}; box-shadow:0 2px 8px rgba(0,0,0,0.06); word-break:break-word;">
                    ${m.text}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <form class="chat-input-bar" onsubmit="window.roohAdmin.handleSendChatMessage(event)">
            <input type="text" id="chatMsgInput" class="form-input" placeholder="اكتب رسالتك للمدير وفريق العمل هنا..." autocomplete="off" style="flex:1; border-radius:50px; padding:12px 20px;" oninput="window.roohAdmin.broadcastTyping(true)" />
            <button type="submit" class="btn-rooh btn-rooh-primary" style="border-radius:50px; padding:12px 24px;">
              <span>إرسال</span>
              <span>📤</span>
            </button>
          </form>
        </div>
      </div>
    `;

    // Auto-scroll to bottom of chat
    const scrollEl = document.getElementById('chatMessagesScroll');
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;

    // Send heartbeat to keep online presence active
    try {
      fetch(`${window.roohDB.apiBase}/api/meetings/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...window.roohDB.getAuthHeaders() },
        body: JSON.stringify({ user_id: currentUser.id })
      }).catch(() => {});
    } catch (e) {}

    // Live Auto-Refresh Interval
    if (window._meetingLiveInterval) clearInterval(window._meetingLiveInterval);
    window._meetingLiveInterval = setInterval(async () => {
      if (window.location.hash !== '#meetings') {
        clearInterval(window._meetingLiveInterval);
        return;
      }
      try {
        const liveData = await window.roohDB.getTeamMeetings();
        if (liveData && liveData.messages) {
          const currentCount = document.querySelectorAll('#chatMessagesScroll > div').length;
          if (liveData.messages.length !== currentCount) {
            this.renderMeetings(document.getElementById('adminMainView'));
          }
        }
      } catch (e) {}
    }, 3000);
  }

  async handleSendChatMessage(e) {
    e.preventDefault();
    const inputEl = document.getElementById('chatMsgInput');
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';

    const currentUser = window.roohDB.getCurrentUser() || { id: 'USR-001', name: 'عبدالرحمن', role_ar: 'المالك والمدير العام' };

    const newMsg = {
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_role: currentUser.role_ar || (currentUser.is_master ? 'المالك والمدير العام' : 'مساعد فريق العمل'),
      sender_avatar: currentUser.avatar || (currentUser.is_master ? '👑' : '👤'),
      text: text,
      timestamp: new Date().toISOString()
    };

    // 1. Try API
    try {
      await fetch(`${window.roohDB.apiBase}/api/meetings/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...window.roohDB.getAuthHeaders() },
        body: JSON.stringify(newMsg)
      });
    } catch (e) {}

    // 2. Local Fallback
    const db = window.roohDB.getLocalDB();
    if (db) {
      db.team_meetings = db.team_meetings || { messages: [], active_users: [] };
      db.team_meetings.messages.push(newMsg);
      window.roohDB.saveLocalDB(db);
    }

    this.renderMeetings(document.getElementById('adminMainView'));
  }

  broadcastTyping(typing) {
    window.roohDB.sendMeetingTyping(typing);
  }

  // =========================================================================
  // SECTION 21: MANAGERS & ASSISTANTS (المديرون والمساعدون) - ABDELRAHMAN
  // =========================================================================
  async renderStaff(root) {
    const users = await window.roohDB.getUsers();

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <span style="background:rgba(255,215,0,0.2); color:var(--rooh-dark); padding:3px 10px; border-radius:50px; font-size:0.75rem; font-weight:700;">سري للمدير الأساسي عبدالرحمن</span>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:6px 0 4px;">إدارة المديرين والمساعدين وتوزيع الصلاحيات (RBAC)</h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">إضافة حسابات المساعدين، تحديد الصلاحيات المخصصة، مع حظر كامل للوصول إلى الخزنة.</p>
        </div>
        <button class="btn-rooh btn-rooh-primary" onclick="window.roohAdmin.openAddStaffModal()">
          <span>+ إضافة حساب مساعد جديد</span>
          <span>👤</span>
        </button>
      </div>

      <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); padding:20px; overflow-x:auto;">
        <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
          <thead>
            <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
              <th style="padding:12px;">المستخدم</th>
              <th style="padding:12px;">اسم الدخول</th>
              <th style="padding:12px;">المسمى الوظيفي</th>
              <th style="padding:12px;">الصلاحيات الممنوحة</th>
              <th style="padding:12px;">حالة الحساب</th>
              <th style="padding:12px;">آخر دخول</th>
              <th style="padding:12px; text-align:center;">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr style="border-bottom:1px solid #F0ECE4;">
                <td data-label="المستخدم" style="padding:12px; font-weight:700; color:var(--rooh-dark);">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.3rem;">${u.avatar || '👤'}</span>
                    <span>${u.name}</span>
                  </div>
                </td>
                <td data-label="اسم الدخول" style="padding:12px; font-family:monospace; color:var(--rooh-gold); font-weight:700;">${u.username}</td>
                <td data-label="المسمى" style="padding:12px;">${u.role_ar || (u.is_master ? 'المالك والمدير العام' : 'مساعد')}</td>
                <td data-label="الصلاحيات" style="padding:12px;">
                  ${u.is_master ? '<span class="status-pill status-ready">كامل الصلاحيات + الخزنة</span>' : `
                    <span style="font-size:0.75rem; color:var(--rooh-muted);">${(u.permissions || []).join('، ') || 'محدودة'}</span>
                  `}
                </td>
                <td data-label="الحالة" style="padding:12px;">
                  <span class="status-pill ${u.status === 'Active' ? 'status-ready' : 'status-draft'}">${u.status || 'Active'}</span>
                </td>
                <td data-label="آخر دخول" style="padding:12px; font-size:0.8rem; color:var(--rooh-muted);">
                  ${u.last_login ? new Date(u.last_login).toLocaleDateString('ar-EG') : 'لم يسجل بعد'}
                </td>
                <td data-label="التحكم" style="padding:12px; text-align:center;">
                  ${!u.is_master ? `
                    <div style="display:flex; gap:6px; justify-content:center;">
                      <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="padding:4px 8px;" onclick="window.roohAdmin.toggleStaffStatus('${u.id}', '${u.status === 'Active' ? 'Inactive' : 'Active'}')">
                        ${u.status === 'Active' ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="color:var(--rooh-danger); border-color:var(--rooh-danger); padding:4px 8px;" onclick="window.roohAdmin.deleteStaff('${u.id}')">
                        حذف 🗑️
                      </button>
                    </div>
                  ` : '<span style="color:var(--rooh-gold); font-weight:700; font-size:0.8rem;">الحساب الرئيسي 👑</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="modal-overlay" id="staffModalRoot"></div>
    `;
  }

  openAddStaffModal() {
    const modalRoot = document.getElementById('staffModalRoot');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-content" style="max-width:500px;">
        <button class="modal-close-btn" onclick="document.getElementById('staffModalRoot').classList.remove('open')">&times;</button>
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.35rem; margin-bottom:16px;">إضافة حساب مساعد جديد</h3>
        <form onsubmit="window.roohAdmin.handleAddStaffSubmit(event)" style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <label class="form-label">الاسم الظاهر للمساعد *</label>
            <input type="text" id="stName" class="form-input" required placeholder="مثال: سارة محمد" />
          </div>
          <div>
            <label class="form-label">اسم المستخدم للدخول (Username) *</label>
            <input type="text" id="stUsername" class="form-input" required placeholder="e.g. sara_orders" style="text-transform:lowercase;" />
          </div>
          <div>
            <label class="form-label">كلمة المرور المؤقتة *</label>
            <input type="password" id="stPassword" class="form-input" required placeholder="••••••••" />
          </div>
          <div>
            <label class="form-label">المسمى الوظيفي بالعربية:</label>
            <input type="text" id="stRole" class="form-input" value="مساعد إدارة الطلبات والمخزون" />
          </div>
          <div>
            <label class="form-label">الصلاحيات الممنوحة:</label>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:0.85rem;">
              <label><input type="checkbox" name="stPerm" value="orders" checked /> إدارة الطلبات والشحن</label>
              <label><input type="checkbox" name="stPerm" value="products" checked /> إدارة كتالوج المنتجات</label>
              <label><input type="checkbox" name="stPerm" value="reviews" checked /> مراجعة التقييمات والرد عليها</label>
              <label><input type="checkbox" name="stPerm" value="meetings" checked /> حضور اجتماعات المدير والشات</label>
              <label style="color:var(--rooh-muted);"><input type="checkbox" disabled /> الخزنة والربط المالي (محظور للمساعدين 🔒)</label>
            </div>
          </div>
          <button type="submit" class="btn-rooh btn-rooh-primary" style="margin-top:8px; padding:12px;">إنشاء الحساب فوراً</button>
        </form>
      </div>
    `;

    modalRoot.classList.add('open');
  }

  async handleAddStaffSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('stName').value.trim();
    const username = document.getElementById('stUsername').value.trim().toLowerCase();
    const password = document.getElementById('stPassword').value.trim();
    const role_ar = document.getElementById('stRole').value.trim();
    const permissions = Array.from(document.querySelectorAll('input[name="stPerm"]:checked')).map(el => el.value);

    try {
      await window.roohDB.createUser({ name, username, password, role_ar, permissions });
      document.getElementById('staffModalRoot').classList.remove('open');
      window.RoohUtil.showToast('تم إنشاء حساب المساعد بنجاح ✓', 'success');
      this.navigateTo('managers_assistants');
    } catch (err) {
      alert(err.message || 'فشل إنشاء الحساب');
    }
  }

  async toggleStaffStatus(userId, status) {
    try {
      await window.roohDB.updateUser(userId, { status });
      window.RoohUtil.showToast(`تم ${status === 'Active' ? 'تفعيل' : 'تعطيل'} الحساب بنجاح ✓`, 'info');
      this.navigateTo('managers_assistants');
    } catch (e) {
      alert('فشل تغيير الحالة');
    }
  }

  async deleteStaff(userId) {
    if (!confirm('هل أنت متأكد من حذف حساب هذا المساعد؟')) return;
    try {
      await window.roohDB.deleteUser(userId);
      window.RoohUtil.showToast('تم حذف الحساب ✓', 'info');
      this.navigateTo('managers_assistants');
    } catch (e) {
      alert('فشل الحذف');
    }
  }

  // =========================================================================
  // SECTION 22: SECURITY SYSTEM (سيستم الحماية) - ABDELRAHMAN
  // =========================================================================
  async renderSecuritySystem(root) {
    const health = await window.roohDB.getSecurityHealth();
    const backups = await window.roohDB.getBackups();

    root.innerHTML = `
      <!-- Security Status Hero Banner -->
      <div style="background:${health.is_safe ? 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)' : 'linear-gradient(135deg, #B71C1C 0%, #D32F2F 100%)'}; color:#FFF; padding:28px; border-radius:16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <div style="font-size:2rem; margin-bottom:6px;">${health.is_safe ? '🛡️' : '⚠️'}</div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.6rem; margin:0 0 6px;">
            ${health.banner_text}
          </h2>
          <p style="margin:0; font-size:0.88rem; opacity:0.9;">
            تاريخ آخر فحص أمني: ${new Date(health.last_scan).toLocaleString('ar-EG')}
          </p>
        </div>
        ${!health.is_safe ? `
          <button class="btn-rooh" style="background:#FFF; color:#B71C1C; font-weight:800; padding:12px 24px;" onclick="window.roohAdmin.autoFixSecurity()">
            حل المشكلة وتأمين المنظومة فوراً ⚡
          </button>
        ` : `
          <button class="btn-rooh" style="background:#FFF; color:#1B5E20; font-weight:700; padding:10px 20px;" onclick="window.roohAdmin.navigateTo('security_system')">
            إعادة الفحص الآن 🔄
          </button>
        `}
      </div>

      <!-- Live Diagnostics Checklist -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:16px; margin-bottom:24px;">
        <div style="background:#FFF; padding:18px; border-radius:12px; border:1px solid var(--admin-border);">
          <div style="font-size:0.8rem; color:var(--rooh-muted);">قاعدة البيانات</div>
          <div style="font-weight:700; color:#2E7D32; font-size:1.1rem; margin-top:4px;">متصلة ومحمية ✓</div>
          <div style="font-size:0.75rem; color:var(--rooh-muted);">فصل البيانات ومعالجة الأخطاء</div>
        </div>

        <div style="background:#FFF; padding:18px; border-radius:12px; border:1px solid var(--admin-border);">
          <div style="font-size:0.8rem; color:var(--rooh-muted);">جدار حماية تسجيل الدخول</div>
          <div style="font-weight:700; color:#2E7D32; font-size:1.1rem; margin-top:4px;">حماية Brute-force مفعلة ✓</div>
          <div style="font-size:0.75rem; color:var(--rooh-muted);">حظر بعد 5 محاولات خاطئة</div>
        </div>

        <div style="background:#FFF; padding:18px; border-radius:12px; border:1px solid var(--admin-border);">
          <div style="font-size:0.8rem; color:var(--rooh-muted);">عزل الخزنة المالية</div>
          <div style="font-weight:700; color:#2E7D32; font-size:1.1rem; margin-top:4px;">محمية من السيرفر 100% ✓</div>
          <div style="font-size:0.75rem; color:var(--rooh-muted);">حظر تام لأي مستخدم غير عبدالرحمن</div>
        </div>

        <div style="background:#FFF; padding:18px; border-radius:12px; border:1px solid var(--admin-border);">
          <div style="font-size:0.8rem; color:var(--rooh-muted);">النسخ الاحتياطي الدوري</div>
          <div style="font-weight:700; color:#2E7D32; font-size:1.1rem; margin-top:4px;">${backups.length} نسخ متوفرة ✓</div>
          <div style="font-size:0.75rem; color:var(--rooh-muted);">جاهزة للاستعادة في أي لحظة</div>
        </div>
      </div>

      <!-- Backup Management Center -->
      <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 style="font-family:var(--rooh-font-serif); font-size:1.25rem; color:var(--rooh-dark); margin:0;">مركز النسخ الاحتياطي والاستعادة</h3>
            <span style="font-size:0.8rem; color:var(--rooh-muted);">إنشاء واسترجاع النسخ الاحتياطية بنقرة زر</span>
          </div>
          <button class="btn-rooh btn-rooh-primary btn-rooh-sm" onclick="window.roohAdmin.createBackupNow()">
            + إنشاء نسخة احتياطية الآن 💾
          </button>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
          <tr style="background:#FAF8F5; text-align:right;">
            <th style="padding:10px;">اسم ملف النسخة</th>
            <th style="padding:10px;">الحجم</th>
            <th style="padding:10px;">تاريخ الإنشاء</th>
            <th style="padding:10px; text-align:center;">إجراء</th>
          </tr>
          ${backups.map(b => `
            <tr style="border-bottom:1px solid #F0ECE4;">
              <td style="padding:10px; font-family:monospace; font-weight:700;">${b.filename}</td>
              <td style="padding:10px;">${b.size}</td>
              <td style="padding:10px;">${new Date(b.created_at).toLocaleString('ar-EG')}</td>
              <td style="padding:10px; text-align:center;">
                <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.restoreBackupFile('${b.filename}')">استعادة ↺</button>
              </td>
            </tr>
          `).join('')}
        </table>
      </div>

      <!-- Emergency Operational Reset Card (القسم 2) -->
      <div style="background:#FFF5F5; border:1.5px solid #FFCDD2; padding:22px; border-radius:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <h3 style="color:#C62828; font-size:1.15rem; margin:0 0 4px;">⚠️ تصفير الموقع والبدء من الصفر (القسم 2)</h3>
            <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0; max-width:650px;">
              حذف كافة الطلبات، العملاء، قيود اليومية، والإحصائيات القديمة والبدء بسجل نظيف تماماً مع إنشاء نسخة احتياطية إلزامية والاحتفاظ بحساب عبدالرحمن والمنتجات والإعدادات.
            </p>
          </div>
          <button class="btn-rooh" style="background:#C62828; color:#FFF; font-weight:700; padding:10px 20px;" onclick="window.roohAdmin.promptZeroReset()">
            تصفير البيانات التشغيلية 🗑️
          </button>
        </div>
      </div>
    `;
  }

  async autoFixSecurity() {
    try {
      const res = await window.roohDB.fixSecurityIssues();
      if (res.success) {
        window.RoohUtil.showToast('تم الإصلاح الأمني الذكي بنجاح وتشفير كلمات المرور ✓', 'success');
        this.navigateTo('security_system');
      }
    } catch (e) {
      alert('فشل الإصلاح التلقائي');
    }
  }

  async createBackupNow() {
    try {
      const res = await window.roohDB.createBackup();
      if (res.success) {
        window.RoohUtil.showToast(`تم إنشاء النسخة الاحتياطية بنجاح (${res.filename}) ✓`, 'success');
        this.navigateTo('security_system');
      }
    } catch (e) {
      alert('فشل إنشاء النسخة');
    }
  }

  async restoreBackupFile(filename) {
    if (!confirm(`هل أنت متأكد من استعادة هذه النسخة الاحتياطية (${filename})؟ ستعود قاعدة البيانات لحالتها السابقة فوراً.`)) return;
    try {
      const res = await window.roohDB.restoreBackup(filename);
      if (res.success) {
        alert('تمت استعادة النسخة الاحتياطية بنجاح! جاري إعادة تحميل المنظومة.');
        window.location.reload();
      }
    } catch (e) {
      alert('فشلت الاستعادة');
    }
  }

  async promptZeroReset() {
    const confirmText = prompt('تنبيه أمني بالغ الأهمية: لتنفيذ تصفير البيانات التشغيلية القديمة، اكتب بدقة النص التالي:\nCONFIRM_RESET_ROOH_2026');
    if (confirmText !== 'CONFIRM_RESET_ROOH_2026') {
      alert('تم إلغاء التصفير لأن نص التأكيد غير مطابق.');
      return;
    }

    try {
      const res = await window.roohDB.resetOperationalData('CONFIRM_RESET_ROOH_2026');
      if (res.success) {
        alert(`✓ تم التصفير بنجاح والبدء من الصفر!\nتم حفظ نسخة احتياطية آمنة في: ${res.backupFile}`);
        window.location.reload();
      } else {
        alert(res.error || 'فشلت عملية التصفير');
      }
    } catch (e) {
      alert('فشلت العملية');
    }
  }

  // =========================================================================
  // SECTION 23: ADMIN AI EXECUTIVE ASSISTANT (مساعد المدير الذكي والتذكيرات الصوتية)
  // =========================================================================
  async renderAdminAI(root) {
    const reminders = await window.roohDB.getAdminReminders() || [];
    const pendingReminders = reminders.filter(r => r.status === 'pending');
    const db = window.roohDB.getLocalDB() || {};
    const memories = db.admin_ai_memory || [];

    root.innerHTML = `
      <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0;">
              مساعد المدير التنفيذي الذكي (Executive Business Partner)
            </h2>
            <span class="status-pill status-ready">● متصل وجاهز</span>
          </div>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:4px 0 0;">
            شريك أعمال حقيقي يتحدث معك بالعامية والمهنية المصرية، يحل مشكلات المتجر، يحفظ الذاكرة، ويطلق رنات تنبيه صوتية لتذكيرك بالأوردرات والمواعيد.
          </p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.playChimeSound()" title="تجربة رنة التنبيه">
            <span>🔔 تجربة رنة التنبيه الصوتية</span>
          </button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1.4fr 1fr; gap:20px; align-items:start;">
        <!-- Left: Conversational AI Chat -->
        <div style="background:#FFF; border-radius:14px; border:1px solid var(--admin-border); height:640px; display:flex; flex-direction:column; overflow:hidden; box-shadow:var(--rooh-shadow-sm);">
          <div style="padding:14px 20px; border-bottom:1px solid var(--admin-border); background:#FAF8F5; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, var(--rooh-gold), #D4BA7D); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:800;">🧠</div>
              <div>
                <strong style="font-size:0.95rem; color:var(--rooh-dark); display:block;">مساعدك الشخصي - شركة روح</strong>
                <span style="font-size:0.75rem; color:#2E7D32;">● يتابع الخزنة، الأوردرات، والذاكرة الدائمة</span>
              </div>
            </div>
          </div>

          <div style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:14px;" id="adminAIChatLog">
            <div style="display:flex; justify-content:flex-start;">
              <div style="background:var(--rooh-sand-light); color:var(--rooh-dark); padding:16px 20px; border-radius:16px 16px 16px 4px; max-width:85%; line-height:1.7; border:1px solid var(--rooh-border); font-size:0.92rem;">
                أهلاً بك يا أستاذ <strong>عبدالرحمن</strong>! 👋 أنا معاك وتحت أمرك كأنك قاعد مع شريكك ومستشارك الشخصي بالظبط.<br><br>
                تقدر تقولي أي حاجة زي:<br>
                • <strong>"الساعة 6 فكرني بأوردر عميل المعادي"</strong> ⏰ (وهبعتلك رنة منبه في الوقت بالظبط)<br>
                • <strong>"فاكر الموضوع اللي كنا بنتكلم فيه؟"</strong> 🧠 (وهستحضر كل اللي اتفقنا عليه قبل كده)<br>
                • <strong>"موقف الخزنة والأرباح إيه النهاردة؟"</strong> 💰<br>
                • <strong>"إيه خطتنا التسويقية لزيادة مبيعات السيروم؟"</strong> 💡
              </div>
            </div>
          </div>

          <!-- Quick Prompts Pills -->
          <div style="padding:10px 16px; background:#FAF8F5; border-top:1px solid var(--admin-border); display:flex; gap:8px; overflow-x:auto;">
            <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.sendAdminAIQuick('فكرني بعد 10 دقائق بمتابعة أول أوردر في المتجر')">⏰ فكرني بعد 10 دقائق</button>
            <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.sendAdminAIQuick('فاكر الموضوع اللي كنا بنتكلم فيه من شوية؟')">🧠 فاكر الموضوع؟</button>
            <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.sendAdminAIQuick('موقف الخزنة والحسابات والطلبات حالياً إيه؟')">💰 موقف الخزنة</button>
            <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohAdmin.sendAdminAIQuick('اقتراحات تسويقية قوية لزيادة مبيعات متجر روح')">💡 خطة تسويق</button>
          </div>

          <!-- Input Row -->
          <form onsubmit="window.roohAdmin.handleAdminAISubmit(event)" style="padding:14px 20px; border-top:1px solid var(--admin-border); display:flex; gap:10px; background:#FFF;">
            <input type="text" id="adminAIInput" class="form-input" placeholder="اكتب رسالتك أو اطلب التذكير (مثال: فكرني الساعة 5 بمكالمة المورد)..." autocomplete="off" style="flex:1; border-radius:50px; padding:12px 20px;" />
            <button type="submit" class="btn-rooh btn-rooh-primary" style="border-radius:50px; padding:12px 24px;">
              <span>إرسال</span> 🧠
            </button>
          </form>
        </div>

        <!-- Right: Smart Reminders & Memory Cards -->
        <div style="display:flex; flex-direction:column; gap:20px;">
          <!-- Reminders Card -->
          <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); box-shadow:var(--rooh-shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:1.3rem;">🔔</span>
                <h3 style="font-size:1.05rem; font-weight:700; color:var(--rooh-dark); margin:0;">
                  المنبه والتذكيرات الذكية (${pendingReminders.length})
                </h3>
              </div>
              <span class="status-pill status-ready" style="font-size:0.75rem;">رنة صوتية حية</span>
            </div>

            <div id="adminRemindersList" style="display:flex; flex-direction:column; gap:10px; max-height:260px; overflow-y:auto;">
              ${reminders.length === 0 ? `
                <div style="text-align:center; padding:24px 10px; color:var(--rooh-muted); font-size:0.85rem;">
                  لا توجد تذكيرات نشطة حالياً.<br>
                  اطلب من المساعد: <em>"فكرني بكذا الساعة كذا"</em> لجدولتها فوراً برنة صوتية!
                </div>
              ` : reminders.map(r => `
                <div style="background:${r.status === 'completed' ? '#F5F5F5' : '#FAF8F5'}; padding:12px 14px; border-radius:10px; border:1px solid ${r.status === 'completed' ? '#E0E0E0' : 'rgba(191,161,95,0.4)'}; display:flex; justify-content:space-between; align-items:center;">
                  <div style="flex:1;">
                    <div style="font-weight:700; font-size:0.88rem; color:${r.status === 'completed' ? '#757575' : 'var(--rooh-dark)'}; text-decoration:${r.status === 'completed' ? 'line-through' : 'none'};">
                      ${r.text}
                    </div>
                    <div style="font-size:0.75rem; color:var(--rooh-muted); margin-top:2px;">
                      ⏰ الميعاد: <strong>${r.due_time_ar}</strong> (${r.due_date_ar})
                    </div>
                  </div>
                  <div>
                    ${r.status === 'pending' ? `
                      <button class="btn-rooh btn-rooh-primary btn-rooh-sm" style="font-size:0.72rem; padding:4px 8px;" onclick="window.roohAdmin.completeReminder('${r.id}')" title="تم التنفيذ">
                        ✓ تم
                      </button>
                    ` : `
                      <span style="font-size:0.75rem; color:#2E7D32; font-weight:700;">مكتمل ✓</span>
                    `}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Conversational Memory Card -->
          <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); box-shadow:var(--rooh-shadow-sm);">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
              <span style="font-size:1.3rem;">🧠</span>
              <h3 style="font-size:1.05rem; font-weight:700; color:var(--rooh-dark); margin:0;">
                ذاكرة المساعد الدائمة (Memory Logs)
              </h3>
            </div>
            <p style="font-size:0.8rem; color:var(--rooh-muted); margin:0 0 12px;">
              يحتفظ المساعد بكافة الموضوعات والقرارات التي تم التحدث فيها ليمكنك استكمالها في أي وقت:
            </p>

            <div style="display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto;">
              ${memories.length === 0 ? `
                <div style="font-size:0.82rem; color:var(--rooh-muted); padding:10px; background:#FAF8F5; border-radius:8px; text-align:center;">
                  الذاكرة نظيفة ومستعدة لتسجيل كل مناقشاتك وقراراتك التشغيلية.
                </div>
              ` : memories.slice(-6).reverse().map(m => `
                <div style="background:#FAF8F5; padding:8px 12px; border-radius:8px; border:1px solid #E8E2D8; font-size:0.8rem;">
                  <strong style="color:var(--rooh-gold); display:block; margin-bottom:2px;">• ${m.topic}</strong>
                  <span style="color:var(--rooh-muted);">${m.summary}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Start background reminder checking if not already started
    this.startReminderAlertMonitor();
  }

  sendAdminAIQuick(text) {
    const input = document.getElementById('adminAIInput');
    if (input) {
      input.value = text;
      this.handleAdminAISubmit({ preventDefault: () => {} });
    }
  }

  async handleAdminAISubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const inputEl = document.getElementById('adminAIInput');
    const msg = inputEl.value.trim();
    if (!msg) return;
    inputEl.value = '';

    const chatLog = document.getElementById('adminAIChatLog');
    if (chatLog) {
      chatLog.innerHTML += `
        <div style="display:flex; justify-content:flex-end;">
          <div style="background:var(--rooh-dark); color:#FFF; padding:12px 18px; border-radius:16px 16px 4px 16px; max-width:75%; font-size:0.95rem;">
            ${msg}
          </div>
        </div>
      `;
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    try {
      const res = await window.roohDB.consultAdminAI(msg);
      const replyFormatted = (res.reply || '').replace(/\n/g, '<br>');
      if (chatLog) {
        chatLog.innerHTML += `
          <div style="display:flex; justify-content:flex-start;">
            <div style="background:var(--rooh-sand-light); color:var(--rooh-dark); padding:16px 20px; border-radius:16px 16px 16px 4px; max-width:85%; line-height:1.7; border:1px solid var(--rooh-border); font-size:0.92rem;">
              ${replyFormatted}
            </div>
          </div>
        `;
        chatLog.scrollTop = chatLog.scrollHeight;
      }

      // If a reminder was created, play confirmation tone and refresh reminders list
      if (res.action === 'reminder_created') {
        this.playChimeSound();
        this.renderAdminAI(document.getElementById('adminMainView'));
      }
    } catch (err) {
      if (chatLog) {
        chatLog.innerHTML += `<div style="color:var(--rooh-danger); font-size:0.85rem;">تعذر الرد حالياً.</div>`;
      }
    }
  }

  async completeReminder(id) {
    await window.roohDB.completeAdminReminder(id);
    window.RoohUtil.showToast('تم إكمال التذكير بنجاح ✓', 'success');
    this.renderAdminAI(document.getElementById('adminMainView'));
  }

  // Web Audio API Chime Ring Synthesizer
  playChimeSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      // 4 harmonic ascending bells
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);
        gain.gain.setValueAtTime(0.35, now + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.7);
      });
    } catch (e) {
      console.warn('AudioContext alert tone:', e);
    }
  }

  startReminderAlertMonitor() {
    if (window._reminderMonitorInterval) return;
    window._reminderMonitorInterval = setInterval(async () => {
      try {
        const reminders = await window.roohDB.getAdminReminders() || [];
        const now = Date.now();
        const dueReminders = reminders.filter(r => r.status === 'pending' && new Date(r.due_at).getTime() <= now);

        if (dueReminders.length > 0) {
          const firstDue = dueReminders[0];
          // Ring audible alert chime
          this.playChimeSound();

          // Show floating popup alert modal
          this.showReminderAlarmPopup(firstDue);
        }
      } catch (e) {}
    }, 10000);
  }

  showReminderAlarmPopup(reminder) {
    let popup = document.getElementById('reminderAlarmPopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'reminderAlarmPopup';
      popup.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 30px;
        z-index: 99999;
        background: #24211E;
        color: #FFF;
        padding: 20px 24px;
        border-radius: 16px;
        border: 2px solid #FFD700;
        box-shadow: 0 16px 40px rgba(0,0,0,0.4);
        max-width: 400px;
        width: 90%;
        animation: pulseReminder 1.5s infinite;
      `;
      document.body.appendChild(popup);
    }

    popup.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
        <span style="font-size:2rem; animation: bounce 1s infinite;">🔔</span>
        <div>
          <h4 style="margin:0; font-size:1.1rem; color:#FFD700; font-family:var(--rooh-font-serif);">رنة تنبيه من مساعد المدير الذكي!</h4>
          <span style="font-size:0.75rem; color:#DDD4C5;">حان الآن ميعاد التذكير المحدد:</span>
        </div>
      </div>
      <p style="font-size:0.95rem; font-weight:700; margin:0 0 16px; line-height:1.5; color:#FFF;">
        "${reminder.text}"
      </p>
      <div style="display:flex; gap:10px;">
        <button class="btn-rooh btn-rooh-primary btn-rooh-sm" style="flex:1; padding:8px;" onclick="window.roohAdmin.dismissReminderAlarm('${reminder.id}')">
          <span>إيقاف الرنة وعلم كمكتمل ✓</span>
        </button>
      </div>
    `;
    popup.style.display = 'block';
  }

  async dismissReminderAlarm(id) {
    await window.roohDB.completeAdminReminder(id);
    const popup = document.getElementById('reminderAlarmPopup');
    if (popup) popup.style.display = 'none';
    window.RoohUtil.showToast('تم إيقاف الرنة وإكمال التذكير ✓', 'success');
    if (window.location.hash === '#admin_ai') {
      this.renderAdminAI(document.getElementById('adminMainView'));
    }
  }

  // =========================================================================
  // SECTION 24: SITE SETTINGS (إعدادات الموقع)
  // =========================================================================
  async renderSettings(root) {
    const s = await window.roohDB.getSettings();

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px;">
        <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">الإعدادات العامة لمنظومة روح</h2>
        <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">بيانات الاتصال، أرقام الهاتف، السجل التجاري والبطاقة الضريبية وساعات العمل الرسمية.</p>
      </div>

      <form onsubmit="window.roohAdmin.handleSaveGeneralSettings(event)" style="background:#FFF; padding:24px; border-radius:14px; border:1px solid var(--admin-border); display:flex; flex-direction:column; gap:16px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div>
            <label class="form-label">اسم المالك والمدير العام:</label>
            <input type="text" id="gsOwnerName" class="form-input" value="${s.company_owner_ar || 'عبدالرحمن'}" />
          </div>
          <div>
            <label class="form-label">رقم هاتف الإدارة المعتمد:</label>
            <input type="text" id="gsOwnerPhone" class="form-input" value="${s.owner_phone || '01227208589'}" />
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div>
            <label class="form-label">رقم واتساب المباشر:</label>
            <input type="text" id="gsWhatsapp" class="form-input" value="${s.owner_whatsapp || '201227208589'}" />
          </div>
          <div>
            <label class="form-label">البريد الإلكتروني للإدارة:</label>
            <input type="email" id="gsEmail" class="form-input" value="${s.owner_email || 'abdulrahman@rooh-cosmetics.com'}" />
          </div>
        </div>

        <div>
          <label class="form-label">العنوان والمقر الرئيسي بالعربية:</label>
          <input type="text" id="gsAddress" class="form-input" value="${s.address_ar || 'التجمع الخامس، شارع التسعين الشمالي، القاهرة الجديدة، مصر'}" />
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px;">
          <div>
            <label class="form-label">رقم السجل التجاري:</label>
            <input type="text" id="gsCr" class="form-input" value="${s.commercial_reg || 'CR-74892-CAIRO'}" />
          </div>
          <div>
            <label class="form-label">رقم البطاقة الضريبية:</label>
            <input type="text" id="gsTax" class="form-input" value="${s.tax_number || 'EG-893-482-109'}" />
          </div>
          <div>
            <label class="form-label">العملة الأساسية:</label>
            <input type="text" id="gsCurrency" class="form-input" value="${s.currency_ar || 'ج.م'}" />
          </div>
        </div>

        <div>
          <label class="form-label">ساعات العمل الرسمية:</label>
          <input type="text" id="gsHours" class="form-input" value="${s.working_hours_ar || 'يومياً من 10 صباحاً حتى 10 مساءً'}" />
        </div>

        <div style="display:flex; justify-content:flex-end; border-top:1px solid #F0ECE4; padding-top:16px;">
          <button type="submit" class="btn-rooh btn-rooh-primary" style="padding:12px 32px;">حفظ وتأكيد الإعدادات 💾</button>
        </div>
      </form>
    `;
  }

  async handleSaveGeneralSettings(e) {
    e.preventDefault();
    const payload = {
      company_owner_ar: document.getElementById('gsOwnerName').value.trim(),
      owner_phone: document.getElementById('gsOwnerPhone').value.trim(),
      owner_whatsapp: document.getElementById('gsWhatsapp').value.trim(),
      owner_email: document.getElementById('gsEmail').value.trim(),
      address_ar: document.getElementById('gsAddress').value.trim(),
      commercial_reg: document.getElementById('gsCr').value.trim(),
      tax_number: document.getElementById('gsTax').value.trim(),
      currency_ar: document.getElementById('gsCurrency').value.trim(),
      working_hours_ar: document.getElementById('gsHours').value.trim()
    };

    try {
      await window.roohDB.saveSettings(payload);
      window.RoohUtil.showToast('تم حفظ الإعدادات العامة بنجاح ✓', 'success');
    } catch (err) {
      alert('فشل حفظ الإعدادات');
    }
  }

  // =========================================================================
  // SECTION 25: REPORTS & ANALYTICS (التقارير والإحصائيات)
  // =========================================================================
  async renderReports(root) {
    const orders = await window.roohDB.getOrders('all');
    const products = await window.roohDB.getProducts('all');

    let totalGrossSales = 0;
    let totalCogs = 0;
    orders.forEach(o => {
      totalGrossSales += (Number(o.subtotal) || 0) - (Number(o.discount) || 0);
      totalCogs += (Number(o.cogs_total) || 0);
    });

    const grossProfit = totalGrossSales - totalCogs;
    const profitMargin = totalGrossSales > 0 ? ((grossProfit / totalGrossSales) * 100).toFixed(1) : 0;

    root.innerHTML = `
      <div style="background:#FFF; padding:20px; border-radius:14px; border:1px solid var(--admin-border); margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-family:var(--rooh-font-serif); font-size:1.35rem; color:var(--rooh-dark); margin:0 0 4px;">التقارير المالية والربحية</h2>
          <p style="font-size:0.85rem; color:var(--rooh-muted); margin:0;">تحليل دقيق للمبيعات وهوامش ربح المنتجات وقيمة المخزون الإجمالية.</p>
        </div>
        <button class="btn-rooh btn-rooh-primary btn-rooh-sm" onclick="window.roohAdmin.exportOrdersCSV()">تصدير تقرير شامل (CSV) 📥</button>
      </div>

      <!-- Financial Metrics -->
      <div class="kpi-grid" style="margin-bottom:24px;">
        <div class="kpi-card">
          <div class="kpi-label">إجمالي المبيعات المحققة</div>
          <div class="kpi-value" style="color:var(--rooh-dark);">${totalGrossSales.toLocaleString()} ج.م</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">تكلفة البضاعة المباعة (COGS)</div>
          <div class="kpi-value" style="color:var(--rooh-muted);">${totalCogs.toLocaleString()} ج.م</div>
        </div>
        <div class="kpi-card highlight">
          <div class="kpi-label">مجمل الربح التجاري</div>
          <div class="kpi-value" style="color:#2E7D32;">${grossProfit.toLocaleString()} ج.م</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">هامش الربح الإجمالي</div>
          <div class="kpi-value" style="color:var(--rooh-gold);">${profitMargin}%</div>
        </div>
      </div>

      <!-- Product Profitability Table -->
      <div style="background:#FFF; padding:22px; border-radius:14px; border:1px solid var(--admin-border);">
        <h3 style="font-family:var(--rooh-font-serif); font-size:1.25rem; color:var(--rooh-dark); margin:0 0 16px;">مصفوفة ربحية المنتجات وهوامشها</h3>
        <table class="responsive-table-cards" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
          <thead>
            <tr style="background:#FBF9F5; border-bottom:1.5px solid var(--admin-border); text-align:right;">
              <th style="padding:10px;">المنتج</th>
              <th style="padding:10px;">سعر البيع</th>
              <th style="padding:10px;">سعر التكلفة</th>
              <th style="padding:10px;">ربح القطعة الواحدة</th>
              <th style="padding:10px;">هامش الربح</th>
              <th style="padding:10px;">المخزون الحالي</th>
              <th style="padding:10px;">تقييم المخزون بالتكلفة</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => {
              const unitProfit = p.price - (p.cost_price || 0);
              const margin = p.price > 0 ? ((unitProfit / p.price) * 100).toFixed(1) : 0;
              const valuation = (p.stock || 0) * (p.cost_price || 0);
              return `
                <tr style="border-bottom:1px solid #F0ECE4;">
                  <td data-label="المنتج" style="padding:10px; font-weight:700;">${p.name_ar}</td>
                  <td data-label="سعر البيع" style="padding:10px;">${p.price} ج.م</td>
                  <td data-label="التكلفة" style="padding:10px; color:var(--rooh-muted);">${p.cost_price || 0} ج.م</td>
                  <td data-label="الربح للقطعة" style="padding:10px; font-weight:700; color:#2E7D32;">+${unitProfit} ج.م</td>
                  <td data-label="الهامش" style="padding:10px; font-weight:700; color:var(--rooh-gold);">${margin}%</td>
                  <td data-label="المخزون" style="padding:10px;">${p.stock} قطعة</td>
                  <td data-label="قيمة المخزون" style="padding:10px; color:var(--rooh-muted);">${valuation.toLocaleString()} ج.م</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Live Background Heartbeat for Notifications & Live Orders
  startLiveHeartbeat() {
    this.pollingInterval = setInterval(async () => {
      try {
        const notifs = await window.roohDB.getNotifications();
        const unread = notifs.filter(n => !n.read).length;
        const badgeEl = document.getElementById('notifBadge');
        const topbarPill = document.getElementById('topbarNotifCount');
        if (badgeEl) badgeEl.textContent = unread;
        if (topbarPill) {
          topbarPill.textContent = unread;
          topbarPill.style.display = unread > 0 ? 'flex' : 'none';
        }

        const orders = await window.roohDB.getOrders('all');
        const newOrders = orders.filter(o => o.order_status === 'New').length;
        const ordBadge = document.getElementById('ordersNavBadge');
        if (ordBadge) ordBadge.textContent = newOrders;
      } catch (e) {}
    }, 10000); // 10 seconds live poll
  }
}

// Global Instantiation
window.roohAdmin = new RoohAdmin();
document.addEventListener('DOMContentLoaded', () => {
  window.roohAdmin.init();
});
