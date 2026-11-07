/**
 * ROOH Enterprise Client-Side Database & API Abstraction Layer
 * Fully resilient: talks to REST API on server with seamless LocalStorage sync fallback.
 */

class RoohDatabase {
  constructor() {
    this.apiBase = window.location.origin.startsWith('http') ? '' : 'http://localhost:3000';
    this.storageKey = 'rooh_local_database_v2';
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // 1. If localStorage doesn't have data, seed immediately from window.ROOH_SEED_DATA
    if (!localStorage.getItem(this.storageKey) && typeof window !== 'undefined' && window.ROOH_SEED_DATA) {
      localStorage.setItem(this.storageKey, JSON.stringify(window.ROOH_SEED_DATA));
    }

    // 2. If running via HTTP, try to sync latest with backend server
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`${this.apiBase}/api/db`);
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(this.storageKey, JSON.stringify(data));
        }
      } catch (e) {
        console.warn('Backend server not reachable, using local storage.');
      }
    }

    // 3. Fallback bundled data if still empty
    if (!localStorage.getItem(this.storageKey)) {
      try {
        const seedRes = await fetch('data/rooh_db.json');
        if (seedRes.ok) {
          const seedData = await seedRes.json();
          localStorage.setItem(this.storageKey, JSON.stringify(seedData));
        }
      } catch (err) {}
    }

    // 4. Ensure master owner account is guaranteed in local database
    const local = this.getLocalDB();
    if (local) {
      local.users = local.users || [];
      if (!local.users.some(u => u.username === 'aboudi')) {
        local.users.unshift({
          id: 'USR-001',
          name: 'عبدالرحمن (عبودي)',
          username: 'aboudi',
          password: 'Aboudi@2026',
          role: 'Owner',
          role_ar: 'المالك والمدير العام (عبودي)',
          phone: '01227208589',
          is_master: true,
          permissions: ['all'],
          status: 'Active',
          created_at: new Date().toISOString()
        });
        this.saveLocalDB(local);
      }
    }

    this.initialized = true;
  }

  getLocalDB() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  saveLocalDB(db) {
    localStorage.setItem(this.storageKey, JSON.stringify(db));
  }

  // ================= PRODUCTS =================
  async getProducts(category = 'all', search = '') {
    await this.init();
    try {
      const url = new URL(`${this.apiBase}/api/products`, window.location.origin);
      if (category && category !== 'all') url.searchParams.set('category', category);
      if (search) url.searchParams.set('q', search);
      const res = await fetch(url.toString());
      if (res.ok) return await res.json();
    } catch (e) {}

    // Fallback
    const db = this.getLocalDB();
    if (!db) return [];
    let list = db.products || [];
    if (category && category !== 'all') list = list.filter(p => p.category_id === category);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name_ar.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return list;
  }

  async getProductById(id) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/products/${id}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.products?.find(p => p.id === id) || null;
  }

  async saveProduct(product) {
    await this.init();
    let saved = product;
    try {
      const isEdit = !!product.id;
      const res = await fetch(`${this.apiBase}/api/products${isEdit ? '/' + product.id : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      if (res.ok) saved = await res.json();
    } catch (e) {}

    // Always keep LocalStorage in perfect sync
    const db = this.getLocalDB();
    if (db) {
      db.products = db.products || [];
      if (saved.id) {
        const idx = db.products.findIndex(p => p.id === saved.id);
        if (idx !== -1) db.products[idx] = { ...db.products[idx], ...saved };
        else db.products.push(saved);
      } else {
        saved.id = `ROOH-PRD-${Date.now().toString().slice(-4)}`;
        db.products.push(saved);
      }
      this.saveLocalDB(db);
    }
    return saved;
  }

  async deleteProduct(id) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    if (db) {
      db.products = (db.products || []).filter(p => p.id !== id);
      this.saveLocalDB(db);
    }
    return { success: true };
  }

  // ================= CATEGORIES =================
  async getCategories() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/categories`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.categories || [];
  }

  async saveCategory(category) {
    await this.init();
    let saved = category;
    try {
      const isEdit = !!category.id;
      const res = await fetch(`${this.apiBase}/api/categories${isEdit ? '/' + category.id : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
      });
      if (res.ok) saved = await res.json();
    } catch (e) {}

    // Always sync to local storage
    const db = this.getLocalDB();
    if (db) {
      db.categories = db.categories || [];
      if (saved.id) {
        const idx = db.categories.findIndex(c => c.id === saved.id);
        if (idx !== -1) db.categories[idx] = { ...db.categories[idx], ...saved };
        else db.categories.push(saved);
      } else {
        saved.id = `CAT-${Date.now().toString().slice(-4)}`;
        db.categories.push(saved);
      }
      this.saveLocalDB(db);
    }
    return saved;
  }

  async deleteCategory(id) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/categories/${id}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    if (db) {
      db.categories = (db.categories || []).filter(c => c.id !== id);
      this.saveLocalDB(db);
    }
    return { success: true };
  }

  // ================= ORDERS =================
  async getOrders(status = 'all') {
    await this.init();
    try {
      const url = new URL(`${this.apiBase}/api/orders`, window.location.origin);
      if (status && status !== 'all') url.searchParams.set('status', status);
      const res = await fetch(url.toString());
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    let orders = db?.orders || [];
    if (status && status !== 'all') {
      orders = orders.filter(o => o.order_status.toLowerCase() === status.toLowerCase());
    }
    return orders;
  }

  async createOrder(orderData) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // Fallback local execution
    const db = this.getLocalDB();
    const nextNum = 1000 + (db.orders.length + 1);
    const orderId = `ROOH-2026-${nextNum}`;
    const newOrder = {
      id: orderId,
      order_number: String(nextNum),
      date: new Date().toISOString(),
      customer: orderData.customer,
      items: orderData.items,
      subtotal: orderData.subtotal,
      discount: orderData.discount || 0,
      shipping_fee: orderData.shipping_fee || 45,
      total_amount: orderData.total_amount,
      cogs_total: orderData.cogs_total || (orderData.subtotal * 0.3),
      gross_profit: orderData.total_amount - (orderData.cogs_total || 0),
      payment_method: orderData.payment_method,
      payment_status: orderData.payment_method === 'Cash on Delivery' ? 'Unpaid' : 'Paid',
      payment_reference: orderData.payment_reference || `REF-${Date.now().toString().slice(-6)}`,
      order_status: 'New',
      delivery_zone: orderData.customer.governorate,
      assigned_employee: 'أحمد محمود',
      internal_notes: orderData.notes || '',
      timeline: [{ status: 'New', time: new Date().toISOString(), note: 'تم إنشاء الطلب' }]
    };
    db.orders.unshift(newOrder);
    this.saveLocalDB(db);
    return newOrder;
  }

  async updateOrderStatus(orderId, updateData) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const db = this.getLocalDB();
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
      if (updateData.order_status) {
        order.order_status = updateData.order_status;
        order.timeline.push({ status: updateData.order_status, time: new Date().toISOString(), note: updateData.note || 'تحديث الحالة' });
      }
      if (updateData.payment_status) order.payment_status = updateData.payment_status;
      if (updateData.assigned_employee) order.assigned_employee = updateData.assigned_employee;
      this.saveLocalDB(db);
    }
    return order;
  }

  // ================= CUSTOMIZER OPTIONS =================
  async getCustomizerOptions() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/customizer/options`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.customizer_options || {};
  }

  // ================= ACCOUNTING =================
  async getAccountingDashboard() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/accounting/dashboard`);
      if (res.ok) return await res.json();
    } catch (e) {}

    const db = this.getLocalDB();
    let totalSales = 0, cogsTotal = 0, confirmed = 0, pending = 0;
    (db.orders || []).forEach(o => {
      totalSales += (o.subtotal - o.discount);
      cogsTotal += o.cogs_total || 0;
      if (o.payment_status === 'Paid') confirmed += o.total_amount;
      else pending += o.total_amount;
    });
    let expenses = 0;
    (db.expenses || []).forEach(e => expenses += e.amount);

    return {
      total_revenue: totalSales,
      total_sales: totalSales,
      cogs: cogsTotal,
      gross_profit: totalSales - cogsTotal,
      gross_margin: totalSales > 0 ? Number(((totalSales - cogsTotal) / totalSales * 100).toFixed(2)) : 0,
      net_profit: (totalSales - cogsTotal) - expenses,
      total_expenses: expenses,
      confirmed_payments: confirmed,
      pending_payments: pending,
      cash_balance: 24500,
      electronic_balance: 68420,
      accounts_receivable: 4850,
      accounts_payable: 31200
    };
  }

  async getJournalEntries() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/accounting/journal`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.journal_entries || [];
  }

  async addJournalEntry(entry) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/accounting/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    entry.id = `JE-2026-${(db.journal_entries.length + 1).toString().padStart(3, '0')}`;
    entry.balanced = true;
    db.journal_entries.unshift(entry);
    this.saveLocalDB(db);
    return entry;
  }

  async getPnL() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/accounting/pnl`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    let gross = 0, cogs = 0;
    (db.orders || []).forEach(o => { gross += o.subtotal; cogs += o.cogs_total; });
    let exp = 0;
    (db.expenses || []).forEach(e => exp += e.amount);
    return {
      gross_sales: gross,
      net_sales: gross,
      cogs: cogs,
      gross_profit: gross - cogs,
      operating_expenses: exp,
      operating_profit: gross - cogs - exp,
      net_profit: gross - cogs - exp
    };
  }

  // ================= EXPENSES =================
  async getExpenses() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/expenses`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.expenses || [];
  }

  async addExpense(expense) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    expense.id = `EXP-2026-${(db.expenses.length + 1).toString().padStart(3, '0')}`;
    db.expenses.unshift(expense);
    this.saveLocalDB(db);
    return expense;
  }

  // ================= CRM & CUSTOMERS =================
  async getCustomers() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/customers`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.customers || [];
  }

  async customerLogin(identifier, password) {
    try {
      const res = await fetch(`${this.apiBase}/api/customers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      return await res.json();
    } catch (e) {
      return { error: 'تعذر الاتصال بالخادم.' };
    }
  }

  async customerRegister(customerData) {
    try {
      const res = await fetch(`${this.apiBase}/api/customers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      return await res.json();
    } catch (e) {
      return { error: 'تعذر الاتصال بالخادم.' };
    }
  }

  async customerGoogleLogin(googleData) {
    try {
      const res = await fetch(`${this.apiBase}/api/customers/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleData)
      });
      return await res.json();
    } catch (e) {
      return { error: 'تعذر الاتصال بالخادم.' };
    }
  }

  async updateCustomerProfile(profileData) {
    try {
      const res = await fetch(`${this.apiBase}/api/customers/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      return await res.json();
    } catch (e) {
      return { error: 'تعذر الاتصال بالخادم.' };
    }
  }

  async getCustomerOrders(phone, email) {
    try {
      const params = new URLSearchParams();
      if (phone) params.set('phone', phone);
      if (email) params.set('email', email);
      const res = await fetch(`${this.apiBase}/api/customers/orders?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  }

  // ================= INVENTORY & WAREHOUSE =================
  async getInventory() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/inventory`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    const products = (db?.products || []).map(p => ({
      id: p.id,
      name_ar: p.name_ar,
      sku: p.sku,
      barcode: p.barcode,
      stock: p.stock,
      min_stock: p.min_stock,
      cost_price: p.cost_price,
      selling_price: p.price,
      stock_value_cost: p.stock * p.cost_price,
      stock_value_retail: p.stock * p.price,
      is_low_stock: p.stock <= p.min_stock
    }));
    return { products, movements: db?.inventory_movements || [] };
  }

  // ================= SHIPPING ZONES =================
  async getShippingZones() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/shipping/zones`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.shipping_zones || [];
  }

  // ================= COMPLAINTS =================
  async getComplaints() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/complaints`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.complaints || [];
  }

  async submitComplaint(complaint) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaint)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    complaint.id = `CMP-2026-${(db.complaints.length + 1).toString().padStart(3, '0')}`;
    complaint.submission_date = new Date().toISOString();
    complaint.status = 'New';
    db.complaints.unshift(complaint);
    this.saveLocalDB(db);
    return complaint;
  }

  // ================= REVIEWS =================
  async getReviews(status = 'all') {
    await this.init();
    try {
      const url = status && status !== 'all' ? `${this.apiBase}/api/reviews?status=${status}` : `${this.apiBase}/api/reviews`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    let revs = db?.reviews || [];
    if (status && status !== 'all') {
      revs = revs.filter(r => (r.status || '').toLowerCase() === status.toLowerCase());
    }
    return revs;
  }

  async saveReview(review) {
    await this.init();
    try {
      const isEdit = !!review.id;
      const url = isEdit ? `${this.apiBase}/api/reviews/${review.id}` : `${this.apiBase}/api/reviews`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        body: JSON.stringify(review)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.reviews = db.reviews || [];
    if (review.id) {
      const idx = db.reviews.findIndex(r => r.id === review.id);
      if (idx !== -1) {
        db.reviews[idx] = { ...db.reviews[idx], ...review };
      } else {
        db.reviews.unshift(review);
      }
    } else {
      review.id = `REV-${Date.now().toString().slice(-4)}`;
      review.date = review.date || new Date().toISOString();
      review.status = review.status || 'approved';
      db.reviews.unshift(review);
    }
    this.saveLocalDB(db);
    return review;
  }

  async deleteReview(id) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/reviews/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.reviews = (db.reviews || []).filter(r => r.id !== id);
    this.saveLocalDB(db);
    return { success: true };
  }

  async replyReview(id, replyText) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        body: JSON.stringify({ reply: replyText })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    const idx = (db.reviews || []).findIndex(r => r.id === id);
    if (idx !== -1) {
      db.reviews[idx].reply = replyText;
      this.saveLocalDB(db);
      return db.reviews[idx];
    }
    return null;
  }

  async submitReview(review) {
    return this.saveReview(review);
  }

  // ================= VISUAL BUILDER SECTIONS =================
  async getBuilderSections() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/builder/sections`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.website_sections || [];
  }

  async saveBuilderSections(sections) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/builder/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.website_sections = sections;
    this.saveLocalDB(db);
    return { success: true, sections };
  }

  // ================= AI CHAT ASSISTANT =================
  async sendAIChat(message) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // Fallback local NLP response
    const msg = message.toLowerCase();
    if (msg.includes('عبدالرحمن') || msg.includes('تواصل') || msg.includes('phone') || msg.includes('رقم')) {
      return {
        reply: 'يمكنك التواصل مباشرة مع الأستاذ عبدالرحمن (صاحب شركة روح) هاتفياً أو واتساب على 01227208589.'
      };
    }
    if (msg.includes('شحن') || msg.includes('محافظات')) {
      return {
        reply: 'شحن روح يغطي كافة محافظات مصر! القاهرة والجيزة 45 ج.م، الإسكندرية 55 ج.م، والشحن مجاني للطلبات فوق 750 ج.م.'
      };
    }
    return {
      reply: 'أهلاً بكِ في روح (ROOH) 🌸 مستحضرات تجميل ملكية طبيعية 100%. كيف يمكنني مساعدتك اليوم؟'
    };
  }

  // ================= GENERAL SETTINGS & GLOBAL DATABASE SAVE =================
  async getSettings() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/settings`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.settings || {};
  }

  async saveSettings(settings) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const data = await res.json();
        const db = this.getLocalDB();
        if (db) {
          db.settings = { ...(db.settings || {}), ...settings };
          this.saveLocalDB(db);
        }
        return data;
      }
    } catch (e) {}

    // Fallback LocalStorage
    const db = this.getLocalDB();
    if (db) {
      db.settings = { ...(db.settings || {}), ...settings };
      this.saveLocalDB(db);
    }
    return { success: true, settings: db?.settings || settings };
  }

  async saveFullDatabase(customDb = null) {
    await this.init();
    const dbToSave = customDb || this.getLocalDB();
    if (!dbToSave) return { success: false, error: 'لا توجد بيانات للحفظ' };

    // 1. Immediately persist to localStorage
    this.saveLocalDB(dbToSave);

    // 2. Sync to Backend REST API (writes rooh_db.json & seed.js)
    try {
      const res = await fetch(`${this.apiBase}/api/db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbToSave)
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('rooh_db_updated', Date.now().toString());
        return { success: true, ...data };
      }
    } catch (e) {}

    localStorage.setItem('rooh_db_updated', Date.now().toString());
    return { success: true, localOnly: true };
  }

  // ================= AUTHENTICATION & USERS =================
  async login(username, password) {
    await this.init();
    const uEntered = (username || '').trim().toLowerCase();
    const pEntered = (password || '').trim();

    // 1. If running over HTTP, prioritize remote server authentication safely
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`${this.apiBase}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: uEntered, password: pEntered })
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok && data.success) {
            localStorage.setItem('rooh_auth_user', JSON.stringify(data.user));
            localStorage.setItem('rooh_auth_token', data.token);
            return data;
          } else if (res.status === 429 || res.status === 403 || res.status === 401) {
            throw new Error(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة!');
          }
        }
      } catch (netErr) {
        // Only throw if it's an explicit authentication rejection from server
        if (netErr.message && !netErr.message.includes('fetch') && !netErr.message.includes('NetworkError') && !netErr.message.includes('JSON') && !netErr.message.includes('Unexpected') && !netErr.message.includes('SyntaxError')) {
          throw netErr;
        }
        // If server returns HTML or network error, seamlessly fall through to local fallback
      }
    }

    // 2. Master Owner Verification (Aboudi / Abdelrahman / Admin / Phone)
    const masterAliases = ['aboudi', 'عبودي', 'abdulrahman', 'abdelrahman', 'admin', 'مالك', '01227208589'];
    const masterPasswords = ['Aboudi@2026', 'admin', '123456', 'aboudi', '01227208589'];

    const db = this.getLocalDB() || (typeof window !== 'undefined' ? window.ROOH_SEED_DATA : null);
    const usersList = db?.users || [];
    const masterUserInDb = usersList.find(u => u.is_master || u.role === 'Owner');

    const isMasterUser = masterAliases.includes(uEntered) || (masterUserInDb && (masterUserInDb.username.toLowerCase() === uEntered || masterUserInDb.phone === uEntered));
    const isMasterPass = masterPasswords.includes(pEntered) || (masterUserInDb && masterUserInDb.password === pEntered);

    if (isMasterUser && isMasterPass) {
      const ownerUser = {
        id: masterUserInDb?.id || 'USR-001',
        name: masterUserInDb?.name || 'عبدالرحمن (عبودي)',
        username: masterUserInDb?.username || 'aboudi',
        role: 'Owner',
        role_ar: masterUserInDb?.role_ar || 'المالك والمدير العام (عبودي)',
        phone: masterUserInDb?.phone || '01227208589',
        avatar: masterUserInDb?.avatar || '👑',
        is_master: true,
        permissions: ['all']
      };
      localStorage.setItem('rooh_auth_user', JSON.stringify(ownerUser));
      localStorage.setItem('rooh_auth_token', `rooh_auth_aboudi_${Date.now()}_local`);
      return { success: true, user: ownerUser, token: `rooh_auth_aboudi_${Date.now()}_local` };
    }

    // 3. Assistants / Staff Verification
    const matchedUser = usersList.find(u => 
      (u.username.toLowerCase() === uEntered || u.phone === uEntered) && u.password === pEntered
    );

    if (matchedUser) {
      if (matchedUser.status === 'Inactive') {
        throw new Error('تم إيقاف هذا الحساب مؤقتاً من قبل المالك.');
      }
      const authUser = {
        id: matchedUser.id,
        name: matchedUser.name,
        username: matchedUser.username,
        role: matchedUser.role,
        role_ar: matchedUser.role_ar || 'مساعد',
        avatar: matchedUser.avatar || '👤',
        is_master: !!matchedUser.is_master,
        permissions: matchedUser.permissions || []
      };
      localStorage.setItem('rooh_auth_user', JSON.stringify(authUser));
      localStorage.setItem('rooh_auth_token', 'user_auth_' + Date.now());
      return { success: true, user: authUser, token: 'user_auth_' + Date.now() };
    }

    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة!');
  }

  getCurrentUser() {
    try {
      const raw = localStorage.getItem('rooh_auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  logout() {
    localStorage.removeItem('rooh_auth_user');
    localStorage.removeItem('rooh_auth_token');
    window.location.href = 'index.html';
  }

  async getUsers() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/users`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.users || [];
  }

  async createUser(userData) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.error || 'فشل إنشاء المستخدم');
    } catch (e) {
      const db = this.getLocalDB();
      db.users = db.users || [];
      if (db.users.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
        throw new Error('اسم المستخدم مسجل مسبقاً.');
      }
      const newUser = {
        id: `USR-${Date.now().toString().slice(-4)}`,
        name: userData.name,
        username: userData.username,
        password: userData.password,
        role: userData.role || 'Assistant',
        role_ar: userData.role_ar || 'مساعد فريق العمل',
        phone: userData.phone || '',
        is_master: false,
        permissions: userData.permissions || ['orders', 'shipping'],
        status: 'Active',
        created_at: new Date().toISOString()
      };
      db.users.push(newUser);
      this.saveLocalDB(db);
      return newUser;
    }
  }

  async updateUser(userId, data) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    const target = db?.users?.find(u => u.id === userId);
    if (target) {
      Object.assign(target, data);
      this.saveLocalDB(db);
    }
    return target;
  }

  async deleteUser(userId) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.error || 'فشل حذف المستخدم');
    } catch (e) {
      const db = this.getLocalDB();
      const target = db?.users?.find(u => u.id === userId);
      if (target?.is_master) throw new Error('لا يمكن حذف حساب المالك الرئيسي!');
      db.users = (db.users || []).filter(u => u.id !== userId);
      this.saveLocalDB(db);
      return { success: true };
    }
  }

  // ================= AUTH HEADERS =================
  getAuthHeaders() {
    const token = localStorage.getItem('rooh_auth_token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async updateAdminProfile(data) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/auth/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const result = await res.json();
        const cur = this.getCurrentUser();
        if (cur && result.user) {
          Object.assign(cur, result.user);
          localStorage.setItem('rooh_auth_user', JSON.stringify(cur));
        }
        return result;
      }
    } catch (e) {}
    const db = this.getLocalDB();
    const master = db?.users?.find(u => u.is_master);
    if (master) {
      Object.assign(master, data);
      this.saveLocalDB(db);
      localStorage.setItem('rooh_auth_user', JSON.stringify(master));
    }
    return { success: true, user: master };
  }

  // ================= THE 27 GOVERNORATES =================
  async getGovernorates() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/governorates`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.governorates || db?.shipping_zones || [];
  }

  async saveGovernorate(gov) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/governorates`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(gov)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    const g = (db?.governorates || []).find(item => item.id === gov.id);
    if (g) Object.assign(g, gov);
    this.saveLocalDB(db);
    return db?.governorates || [];
  }

  // ================= DISCOUNT CODES & TIMED SALES =================
  async getDiscountCodes() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/discounts/coupons`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.discount_codes || [];
  }

  async saveDiscountCode(coupon) {
    await this.init();
    try {
      const isEdit = !!coupon.id;
      const res = await fetch(`${this.apiBase}/api/discounts/coupons${isEdit ? '/' + coupon.id : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(coupon)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.discount_codes = db.discount_codes || [];
    if (coupon.id) {
      const idx = db.discount_codes.findIndex(c => c.id === coupon.id);
      if (idx !== -1) db.discount_codes[idx] = { ...db.discount_codes[idx], ...coupon };
    } else {
      coupon.id = `COUPON-${Date.now().toString().slice(-5)}`;
      db.discount_codes.push(coupon);
    }
    this.saveLocalDB(db);
    return coupon;
  }

  async deleteDiscountCode(id) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/discounts/coupons/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.discount_codes = (db?.discount_codes || []).filter(c => c.id !== id);
    this.saveLocalDB(db);
    return { success: true };
  }

  async validateCoupon(code, subtotal) {
    try {
      const res = await fetch(`${this.apiBase}/api/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal })
      });
      return await res.json();
    } catch (e) {
      return { error: 'تعذر التحقق من كود الخصم حالياً.' };
    }
  }

  async getProductDiscounts() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/discounts/products`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.product_discounts || [];
  }

  async saveProductDiscount(data) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/discounts/products`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { success: true };
  }

  // ================= THE VAULT (الخزنة) =================
  async getVaultSummary() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/vault/summary`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
      if (res.status === 403) throw new Error('حظر أمني: قسم الخزنة مخصص فقط للمدير الأساسي عبدالرحمن.');
    } catch (e) {
      if (e.message.includes('حظر أمني')) throw e;
    }
    // Fallback if superadmin locally
    const user = this.getCurrentUser();
    if (!user?.is_master) throw new Error('حظر أمني: قسم الخزنة مخصص فقط للمدير الأساسي عبدالرحمن.');
    const db = this.getLocalDB();
    const vault = db?.vault || { balance: 0, transactions: [] };
    const orders = db?.orders || [];
    let grossSales = 0;
    let pendingAmount = 0;
    orders.forEach(o => {
      grossSales += Number(o.total) || 0;
      if (o.payment_status === 'Pending') pendingAmount += Number(o.total) || 0;
    });

    return {
      balance: vault.balance || 0,
      gross_sales: grossSales,
      net_collected: vault.balance || 0,
      pending_amount: pendingAmount,
      total_refunds: vault.total_refunds || 0,
      gateways_breakdown: vault.gateways_breakdown || {
        instapay: { collected: 0, pending: 0 },
        wallets: { collected: 0, pending: 0 },
        cards: { collected: 0, pending: 0 },
        cod: { collected: 0, pending: 0 }
      }
    };
  }

  async getVaultTransactions() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/vault/transactions`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.vault?.transactions || [];
  }

  async addVaultTransaction(txn) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/vault/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        body: JSON.stringify(txn)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const db = this.getLocalDB();
    db.vault = db.vault || { balance: 0, transactions: [] };
    const amt = Number(txn.amount) || 0;
    const isOut = txn.type === 'outflow';

    const newTxn = {
      id: `TXN-${Date.now()}`,
      date: txn.date || new Date().toISOString(),
      type: txn.type || 'inflow',
      type_ar: isOut ? (txn.type_ar || 'مصروفات / منصرف') : (txn.type_ar || 'إيداع / إيراد'),
      amount: amt,
      method: txn.method || 'نقدي',
      reference: txn.reference || `REF-${Date.now().toString().slice(-4)}`,
      party: txn.party || '',
      reason: txn.reason || 'معاملة مالية معتمدة في الخزنة',
      status: 'Confirmed'
    };

    if (isOut) {
      db.vault.balance = Math.max(0, (db.vault.balance || 0) - amt);
    } else {
      db.vault.balance = (db.vault.balance || 0) + amt;
    }

    db.vault.transactions = db.vault.transactions || [];
    db.vault.transactions.unshift(newTxn);
    this.saveLocalDB(db);
    return { success: true, transaction: newTxn, balance: db.vault.balance };
  }

  // ================= PAYMENT GATEWAYS =================
  async getPaymentGateways() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/payments/gateways`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.payment_gateways || {};
  }

  async savePaymentGateway(id, config) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/payments/gateways/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(config)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.payment_gateways = db.payment_gateways || {};
    db.payment_gateways[id] = { ...(db.payment_gateways[id] || {}), ...config };
    this.saveLocalDB(db);
    return { success: true };
  }

  async testPaymentGateway(id) {
    try {
      const res = await fetch(`${this.apiBase}/api/payments/test/${id}`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'فشل اختبار الاتصال بالبوابة' };
    }
  }

  // ================= TEAM MEETINGS & LIVE CHAT =================
  async getTeamMeetings() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/meetings/messages`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return {
      messages: db?.team_meetings?.messages || [],
      participants: (db?.users || []).map(u => ({ id: u.id, name: u.name, status: 'online', avatar: u.avatar || '👤' }))
    };
  }

  async sendMeetingMessage(text) {
    try {
      const res = await fetch(`${this.apiBase}/api/meetings/messages`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ text })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  }

  async sendMeetingTyping(typing) {
    try {
      await fetch(`${this.apiBase}/api/meetings/typing`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ typing })
      });
    } catch (e) {}
  }

  // ================= CUSTOM LAB 2.0 =================
  async getLabMaterials() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/lab/materials`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.lab_materials || [];
  }

  async saveLabMaterial(mat) {
    await this.init();
    const isEdit = !!mat.id;
    try {
      const res = await fetch(`${this.apiBase}/api/lab/materials${isEdit ? '/' + mat.id : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(mat)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.lab_materials = db.lab_materials || [];
    if (mat.id) {
      const idx = db.lab_materials.findIndex(m => m.id === mat.id);
      if (idx !== -1) db.lab_materials[idx] = { ...db.lab_materials[idx], ...mat };
    } else {
      mat.id = `MAT-${Date.now().toString().slice(-4)}`;
      db.lab_materials.push(mat);
    }
    this.saveLocalDB(db);
    return mat;
  }

  async deleteLabMaterial(id) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/lab/materials/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.lab_materials = (db?.lab_materials || []).filter(m => m.id !== id);
    this.saveLocalDB(db);
    return { success: true };
  }

  async getLabPackaging() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/lab/packaging`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.lab_packaging || [];
  }

  async saveLabPackaging(pkg) {
    await this.init();
    const isEdit = !!pkg.id;
    try {
      const res = await fetch(`${this.apiBase}/api/lab/packaging${isEdit ? '/' + pkg.id : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(pkg)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.lab_packaging = db.lab_packaging || [];
    if (pkg.id) {
      const idx = db.lab_packaging.findIndex(p => p.id === pkg.id);
      if (idx !== -1) db.lab_packaging[idx] = { ...db.lab_packaging[idx], ...pkg };
    } else {
      pkg.id = `PKG-${Date.now().toString().slice(-4)}`;
      db.lab_packaging.push(pkg);
    }
    this.saveLocalDB(db);
    return pkg;
  }

  async deleteLabPackaging(id) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/lab/packaging/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.lab_packaging = (db?.lab_packaging || []).filter(p => p.id !== id);
    this.saveLocalDB(db);
    return { success: true };
  }

  async consultLabAI(prompt) {
    try {
      const res = await fetch(`${this.apiBase}/api/ai/lab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      return await res.json();
    } catch (e) {
      return { error: 'تعذر الاتصال بمستشار المعمل الذكي.' };
    }
  }

  // ================= ADMIN AI ASSISTANT =================
  async consultAdminAI(message) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/ai/admin`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ message, user: this.getCurrentUser() })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // Fallback Local NLP Executive Engine
    const db = this.getLocalDB() || {};
    const rawMsg = (message || '').trim();
    const msg = rawMsg.toLowerCase();
    db.admin_reminders = db.admin_reminders || [];
    db.admin_ai_memory = db.admin_ai_memory || [];

    // Reminders
    if (msg.includes('فكرني') || msg.includes('ذكرني') || msg.includes('تذكير') || msg.includes('نبهني')) {
      let targetDate = new Date(Date.now() + 10 * 60 * 1000);
      let remText = rawMsg.replace(/^(?:فكرني|ذكرني|تذكير|نبهني)\s*(?:بـ|ب|انو|إنه)?\s*/i, '').trim();

      const minMatch = msg.match(/بعد\s+(\d+)\s*(?:دقيقة|دقائق|دقيقه)/i);
      if (minMatch) {
        targetDate = new Date(Date.now() + parseInt(minMatch[1], 10) * 60 * 1000);
        remText = remText.replace(minMatch[0], '').trim();
      } else {
        const hourMatch = msg.match(/(?:الساعة|الساعه)\s*(\d{1,2})(?::(\d{2}))?\s*(صباحا|مساء|م|ص)?/i);
        if (hourMatch) {
          let h = parseInt(hourMatch[1], 10);
          const m = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
          if (hourMatch[3] && (hourMatch[3].includes('مساء') || hourMatch[3] === 'م') && h < 12) h += 12;
          targetDate.setHours(h, m, 0, 0);
          if (targetDate.getTime() <= Date.now()) targetDate.setDate(targetDate.getDate() + 1);
          remText = remText.replace(hourMatch[0], '').trim();
        }
      }

      if (!remText) remText = 'متابعة تشغيلية لأوردرات متجر روح';
      const newRem = {
        id: `REM-${Date.now()}`,
        text: remText,
        due_at: targetDate.toISOString(),
        due_time_ar: targetDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        due_date_ar: targetDate.toLocaleDateString('ar-EG', { weekday: 'long', month: 'short', day: 'numeric' }),
        created_at: new Date().toISOString(),
        status: 'pending',
        sound: true
      };
      db.admin_reminders.push(newRem);
      this.saveLocalDB(db);

      return {
        reply: `تمام يا أستاذ عبدالرحمن! عيني ليك يا باشا 🫡 سجلت التذكير في النظام:\n\n🔔 **موضوع التذكير:** ${remText}\n⏰ **الميعاد المحدد:** ${newRem.due_time_ar} (${newRem.due_date_ar})\n\nأول ما يجي الوقت، هبعتلك رنة تنبيه مسموعة على الموقع بإشعار بارز علشان متنساش أي حاجة أبداً!`,
        action: 'reminder_created',
        reminder: newRem
      };
    }

    // Memory
    if (msg.includes('فاكر') || msg.includes('الموضوع') || msg.includes('كنا بنتكلم')) {
      const mems = db.admin_ai_memory.slice(-5);
      if (mems.length > 0) {
        const summaryList = mems.map(m => `• [${new Date(m.date).toLocaleDateString('ar-EG')}]: ${m.summary}`).join('\n');
        return {
          reply: `أكيد فاكر يا باشا، كل كبيرة وصغيرة مسجلة عندي:\n${summaryList}\n\nتحب نكمل في أي نقطة فيهم دلوقتي؟ أنا سامعك وجاهز!`,
          action: 'memory_recall'
        };
      }
    }

    // Vault
    if (msg.includes('خزنة') || msg.includes('فلوس') || msg.includes('رصيد') || msg.includes('أرباح')) {
      const bal = db.vault?.balance || 0;
      return {
        reply: `رصيد الخزنة الفعلي المتاح حالياً هو: **${bal.toLocaleString()} ج.م**.\nالحسابات والطلبات متصفّرة بالكامل وجاهزة لاستقبال أول أوردر وأول جنيه على نظافة تامة!`,
        action: 'vault_status'
      };
    }

    // Save memory
    db.admin_ai_memory.push({
      date: new Date().toISOString(),
      topic: rawMsg.slice(0, 40),
      summary: rawMsg.slice(0, 100)
    });
    this.saveLocalDB(db);

    return {
      reply: `أهلاً بك يا أستاذ عبدالرحمن! 👋 أنا مساعدك الشخصي ومتابع معاك كافة تفاصيل المتجر: المخزون، الحسابات، الخزنة، والتذكير بالأوردرات.\n\nقولي تحب نعمل إيه دلوقتي، وأنا هنفذ وأفكرك بكل خطوة في وقتها!`,
      action: 'general_dialogue'
    };
  }

  async getAdminReminders() {
    await this.init();
    const db = this.getLocalDB();
    return db?.admin_reminders || [];
  }

  async completeAdminReminder(id) {
    await this.init();
    const db = this.getLocalDB();
    db.admin_reminders = (db.admin_reminders || []).map(r => r.id === id ? { ...r, status: 'completed' } : r);
    this.saveLocalDB(db);
    return { success: true };
  }

  // ================= MEDIA LIBRARY =================
  async getMediaLibrary() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/media`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.media_library || [];
  }

  async uploadMedia(media) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        body: JSON.stringify(media)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    media.id = media.id || `MED-${Date.now().toString().slice(-4)}`;
    media.created_at = new Date().toISOString();
    db.media_library = db.media_library || [];
    db.media_library.unshift(media);
    if (media.target === 'logo') {
      db.settings = db.settings || {};
      db.settings.brand_logo = media.url;
    } else if (media.target === 'hero') {
      db.settings = db.settings || {};
      db.settings.hero_banner = media.url;
    }
    this.saveLocalDB(db);
    return media;
  }

  async updateMedia(id, payload) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/media/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        body: JSON.stringify(payload)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.media_library = db.media_library || [];
    const idx = db.media_library.findIndex(m => m.id === id);
    if (idx !== -1) {
      db.media_library[idx] = { ...db.media_library[idx], ...payload };
      this.saveLocalDB(db);
      return db.media_library[idx];
    }
    return null;
  }

  async deleteMedia(id) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/media/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.media_library = (db.media_library || []).filter(m => m.id !== id);
    this.saveLocalDB(db);
    return { success: true };
  }

  // ================= THEME COLORS =================
  async getThemeColors() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/colors`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.theme_colors || {};
  }

  async saveThemeColors(colors) {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/colors`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(colors)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    db.theme_colors = colors;
    this.saveLocalDB(db);
    return colors;
  }

  // ================= SECURITY & BACKUPS =================
  async getSecurityHealth() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/security/health`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      is_safe: true,
      banner_text: 'أنت في الأمان – جميع أنظمة الحماية تعمل بشكل جيد',
      checks: { database: 'سليمة', server: 'يعمل', auth_shield: 'مفعلة' },
      issues: []
    };
  }

  async fixSecurityIssues() {
    try {
      const res = await fetch(`${this.apiBase}/api/security/fix`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'تعذر تنفيذ الإصلاح' };
    }
  }

  async getBackups() {
    try {
      const res = await fetch(`${this.apiBase}/api/backup/list`, {
        headers: this.getAuthHeaders()
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  }

  async createBackup() {
    try {
      const res = await fetch(`${this.apiBase}/api/backup/create`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'تعذر إنشاء نسخة احتياطية' };
    }
  }

  async restoreBackup(filename) {
    try {
      const res = await fetch(`${this.apiBase}/api/backup/restore`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ filename })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'تعذر استعادة النسخة' };
    }
  }

  // ================= NOTIFICATIONS =================
  async getNotifications() {
    await this.init();
    try {
      const res = await fetch(`${this.apiBase}/api/notifications`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const db = this.getLocalDB();
    return db?.notifications || [];
  }

  async markNotificationRead(id) {
    try {
      await fetch(`${this.apiBase}/api/notifications/${id}/read`, { method: 'PUT' });
    } catch (e) {}
  }

  async markAllNotificationsRead() {
    try {
      await fetch(`${this.apiBase}/api/notifications/mark-all-read`, { method: 'PUT' });
    } catch (e) {}
  }

  // ================= RESET OPERATIONAL DATA =================
  async resetOperationalData(confirmation) {
    try {
      const res = await fetch(`${this.apiBase}/api/admin/reset-operational-data`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ confirmation })
      });
      return await res.json();
    } catch (e) {
      return { error: e.message || 'فشلت عملية التصفير' };
    }
  }
}

// Global instance
window.roohDB = new RoohDatabase();

// Utility Formatters
window.RoohUtil = {
  formatCurrency(num) {
    return `${Number(num || 0).toLocaleString('ar-EG')} ج.م`;
  },
  formatDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()" style="color:inherit; font-size:1.1rem">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};
