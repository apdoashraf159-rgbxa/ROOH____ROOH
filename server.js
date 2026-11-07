/**
 * ROOH Cosmetics Enterprise Management System - Core Backend Server
 * High performance, zero external dependencies, native Node.js HTTP/REST engine.
 * Full mobile & LAN access, clean URL routing (/admin, /login, /store),
 * AI Executive Assistant with Egyptian dialect NLP & reminders,
 * Vault ledger, Reviews CRUD, and live collaboration.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'rooh_db.json');

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Get local IPv4 addresses for mobile connectivity
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Safe Database Access Helpers
function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file:', err);
    return null;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    // Also sync to seed.js for seamless client-side bootstrap
    const seedPath = path.join(__dirname, 'data', 'seed.js');
    const seedContent = '/**\n * ROOH Enterprise Ecosystem - Synchronized Seed Data\n */\nwindow.ROOH_SEED_DATA = ' + JSON.stringify(data, null, 2) + ';\n';
    fs.writeFileSync(seedPath, seedContent, 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing to database file:', err);
    return false;
  }
}

// Parse JSON request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 25 * 1024 * 1024) { // 25MB limit for images/files
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) return resolve({});
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Send JSON Response Helper
function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(payload));
}

// =========================================================================
// EXECUTIVE AI NLP ENGINE (المساعد المدير الذكي لعبدالرحمن)
// =========================================================================
function handleAdminAIChat(message, db, user) {
  const rawMsg = (message || '').trim();
  const msg = rawMsg.toLowerCase();
  db.admin_ai_memory = db.admin_ai_memory || [];
  db.admin_reminders = db.admin_reminders || [];

  // 1. SMART REMINDERS CHECK ("فكرني بكذا الساعة كذا" أو "فكرني بعد كذا")
  const reminderMatch = rawMsg.match(/(?:فكرني|ذكرني|تذكير|نبهني)\s+(.+?)(?:\s+(?:الساعة|الساعه|بعد|في تمام|يوم)\s+(.+))?$/i);
  if (msg.includes('فكرني') || msg.includes('ذكرني') || msg.includes('تذكير') || msg.includes('نبهني')) {
    let reminderText = rawMsg;
    let reminderTimeStr = '';
    let targetDate = new Date();

    // Check relative minutes: "بعد 10 دقائق" / "بعد ربع ساعة" / "بعد نص ساعة"
    if (msg.includes('بعد ربع ساعة') || msg.includes('بعد ربع ساعه')) {
      targetDate = new Date(Date.now() + 15 * 60 * 1000);
      reminderText = rawMsg.replace(/بعد ربع ساع[ةه]/gi, '').trim();
    } else if (msg.includes('بعد نص ساعة') || msg.includes('بعد نص ساعه') || msg.includes('بعد نصف ساعة')) {
      targetDate = new Date(Date.now() + 30 * 60 * 1000);
      reminderText = rawMsg.replace(/بعد ن?صف? ساع[ةه]/gi, '').trim();
    } else if (msg.includes('بعد ساعة') || msg.includes('بعد ساعه')) {
      targetDate = new Date(Date.now() + 60 * 60 * 1000);
      reminderText = rawMsg.replace(/بعد ساع[ةه]/gi, '').trim();
    } else {
      const minMatch = msg.match(/بعد\s+(\d+)\s*(?:دقيقة|دقائق|دقيقه)/i);
      if (minMatch) {
        const mins = parseInt(minMatch[1], 10);
        targetDate = new Date(Date.now() + mins * 60 * 1000);
        reminderText = rawMsg.replace(minMatch[0], '').trim();
      } else {
        // Specific hour e.g. "الساعة 5" أو "الساعة 6 مساء"
        const hourMatch = msg.match(/(?:الساعة|الساعه)\s*(\d{1,2})(?::(\d{2}))?\s*(صباحا|مساء|م|ص)?/i);
        if (hourMatch) {
          let h = parseInt(hourMatch[1], 10);
          const m = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0;
          const period = hourMatch[3] ? hourMatch[3].trim() : '';
          if (period.includes('مساء') || period === 'م') {
            if (h < 12) h += 12;
          } else if (period.includes('صباح') || period === 'ص') {
            if (h === 12) h = 0;
          } else if (h < 12 && targetDate.getHours() >= 12) {
            // Default to PM if current time is afternoon
            h += 12;
          }
          targetDate.setHours(h, m, 0, 0);
          if (targetDate.getTime() <= Date.now()) {
            targetDate.setDate(targetDate.getDate() + 1); // Next day
          }
          reminderText = rawMsg.replace(hourMatch[0], '').trim();
        } else {
          // Default: 10 minutes from now
          targetDate = new Date(Date.now() + 10 * 60 * 1000);
        }
      }
    }

    // Clean up reminder text
    reminderText = reminderText.replace(/^(?:فكرني|ذكرني|تذكير|نبهني)\s*(?:بـ|ب|انو|إنه)?\s*/i, '').trim();
    if (!reminderText) reminderText = 'متابعة تشغيلية لمتجر روح';

    const newReminder = {
      id: `REM-${Date.now()}`,
      text: reminderText,
      due_at: targetDate.toISOString(),
      due_time_ar: targetDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      due_date_ar: targetDate.toLocaleDateString('ar-EG', { weekday: 'long', month: 'short', day: 'numeric' }),
      created_at: new Date().toISOString(),
      status: 'pending',
      sound: true
    };

    db.admin_reminders.push(newReminder);
    writeDB(db);

    return {
      reply: `تمام يا أستاذ عبدالرحمن! عيني ليك يا باشا 🫡 سجلت التذكير في النظام:\n\n🔔 **موضوع التذكير:** ${reminderText}\n⏰ **الميعاد المحدد:** ${newReminder.due_time_ar} (${newReminder.due_date_ar})\n\nأول ما يجي الوقت بالثانية، هبعتلك رنة تنبيه مسموعة على الموقع بإشعار بارز علشان متنساش أي حاجة أبداً! تقدر تتابع كل تذكيراتك من قائمة التذكيرات.`,
      action: 'reminder_created',
      reminder: newReminder
    };
  }

  // 2. CONVERSATIONAL MEMORY CHECK ("فاكر الموضوع..." أو "كنا بنتكلم في ايه")
  if (msg.includes('فاكر') || msg.includes('الموضوع اللي') || msg.includes('كنا بنتكلم') || msg.includes('تفتكر')) {
    const lastMemories = db.admin_ai_memory.slice(-5);
    if (lastMemories.length > 0) {
      const summaryList = lastMemories.map((m, idx) => `• [${new Date(m.date).toLocaleDateString('ar-EG')}]: كان بخصوص "${m.topic}" - النتيجة: ${m.summary}`).join('\n');
      return {
        reply: `أكيد فاكر يا أستاذ عبدالرحمن، أنا مسجل كل كبيرة وصغيرة بنتناقش فيها! 👌\n\nدي آخر حاجات كنا متكلمين فيها:\n${summaryList}\n\nتحب نكمل في أي نقطة فيهم بالظبط أو نبدأ في تفاصيل جديدة؟ أنا سامعك وجاهز!`,
        action: 'memory_recall',
        memories: lastMemories
      };
    } else {
      return {
        reply: `أكيد يا باشا! أنا معاك ومتابع كل خطوة في المتجر. دي بداية محادثاتنا الرسمية بعد تصفير النظام والبدء على نظافة، وكل كلمة وقرار بناخده سوا مسجل ومحفوظ عندي في الذاكرة الدائمة ومش هنساه أبداً. تحب نناقش إيه دلوقتي؟`,
        action: 'memory_empty'
      };
    }
  }

  // 3. FINANCIAL & VAULT STATUS
  if (msg.includes('خزنة') || msg.includes('فلوس') || msg.includes('حسابات') || msg.includes('رصيد') || msg.includes('أرباح') || msg.includes('مبيعات')) {
    const ordersCount = (db.orders || []).length;
    const vaultBal = db.vault?.balance || 0;
    const netColl = db.vault?.net_collected || 0;
    return {
      reply: `موقف الخزنة والحسابات الحالية لشركة روح:\n• رصيد الخزنة الفعلي المتاح: **${vaultBal.toLocaleString()} ج.م**\n• صافي المحصل في الحسابات: **${netColl.toLocaleString()} ج.م**\n• إجمالي الطلبات المسجلة: **${ordersCount} طلب**\n\n💡 الحسابات متصفّرة وجاهزة بالمليم لاستقبال أول أوردر وأول جنيه. كل حركة وارد أو منصرف بتتسجل بالسبب والتوقيت وطريقة الدفع تلقائياً!`,
      action: 'vault_status'
    };
  }

  // 4. ORDERS & SHIPPING
  if (msg.includes('أوردر') || msg.includes('طلبات') || msg.includes('شحن') || msg.includes('توصيل')) {
    const pendingOrders = (db.orders || []).filter(o => o.order_status === 'New' || o.order_status === 'In Preparation');
    if (pendingOrders.length === 0) {
      return {
        reply: `يا أستاذ عبدالرحمن، مفيش أي أوردرات معلقة حالياً. السيستم متصفر ونظيف تماماً وبانتظار أول مشتري يدخل المتجر. جاهزين ومستعدين لأول عملية بيع! 🚀`,
        action: 'no_pending_orders'
      };
    } else {
      return {
        reply: `عندنا حالياً **${pendingOrders.length} طلب** محتاج متابعة وتجهيز للشحن. تحب أجهزهملك وأعرضلك تفاصيل العناوين وأرقام التليفونات؟`,
        action: 'pending_orders',
        orders: pendingOrders
      };
    }
  }

  // 5. MARKETING & GROWTH ADVICE
  if (msg.includes('تسويق') || msg.includes('مبيعات') || msg.includes('خطة') || msg.includes('إعلان') || msg.includes('أفكار')) {
    return {
      reply: `بناءً على تشكيلة مستحضرات التجميل الملكية في روح، دي أفضل 3 خطوات تسويقية ننفذها فوراً عشان نحقق مبيعات قوية:\n\n1. **حملة إطلاق سيروم النضارة الملكي (Hero Product):** نعمل ريلز وفيديوهات توضح ملمس السيروم وفوائده مع خصم حصري لأول 50 طلب مع شحن مجاني.\n2. **تفعيل تجربة 'اصنع منتجك بنفسك' التفاعلية:** دي ميزة فريدة مش موجودة في البراندات التانية، الترويج ليها كهدية مخصصة للأعياد والمناسبات بيجيب تفاعل عالي جداً.\n3. **عروض المجموعات (Bundles):** ندمج سيروم + كريم ترطيب + عطر روح العنبر في بوكس ملكي فخم بسعر مميز بدلاً من شراء كل منتج لوحده.\n\nتحب أساعدك في صياغة كود خصم جديد دلوقتي أو تعديل البنر الرئيسي في الموقع؟`,
      action: 'marketing_advice'
    };
  }

  // 6. DEFAULT NATURAL HUMAN-LIKE EXECUTIVE RESPONSE
  // Save to persistent memory
  db.admin_ai_memory.push({
    date: new Date().toISOString(),
    topic: rawMsg.slice(0, 40),
    summary: rawMsg.slice(0, 100),
    user: user?.name || 'عبدالرحمن'
  });
  if (db.admin_ai_memory.length > 50) db.admin_ai_memory.shift();
  writeDB(db);

  return {
    reply: `أهلاً بك يا أستاذ عبدالرحمن! 👋 أنا معاك وتحت أمرك كأنك قاعد مع مستشارك الشخصي بالظبط.\n\nفهمت كلامك بخصوص: "${rawMsg}"\n\nأنا بتابع معاك كافة تفاصيل المتجر: المخزون، الحسابات، الخزنة، التذكيرات بالأوردرات، وتجهيز الشحنات. قولي تحب نعمل إيه دلوقتي، وأنا هنفذ وأفكرك بكل خطوة في وقتها!`,
    action: 'general_dialogue'
  };
}

// Customer Storefront AI
function handleAIChat(userMessage, db) {
  const msg = (userMessage || '').toLowerCase();
  
  if (msg.includes('تواصل') || msg.includes('مسؤول') || msg.includes('عبدالرحمن') || msg.includes('رقم') || msg.includes('owner') || msg.includes('شكوى')) {
    return {
      reply: `يمكنك التواصل مباشرة مع الأستاذ عبدالرحمن (صاحب شركة روح) عبر الهاتف أو الواتساب على الرقم:\n📞 01227208589\nأو الضغط على زر الشكاوى والدعم في القائمة للمتابعة الفورية معك على مدار الساعة!`,
      action: 'escalate',
      contact: '01227208589'
    };
  }

  if (msg.includes('شحن') || msg.includes('محافظ') || msg.includes('توصيل') || msg.includes('delivery')) {
    return {
      reply: `مرحباً بكِ في روح! 🚚 نشحن لجميع محافظات جمهورية مصر العربية:\n• القاهرة والجيزة: 45 - 50 ج.م (خلال 24 إلى 48 ساعة)\n• الإسكندرية ومحافظات الدلتا: 55 - 60 ج.م (خلال يومين إلى 3 أيام)\n• مدن القناة والصعيد: 65 - 85 ج.م\n✨ ومفاجأة روح: الشحن مجاني تماماً لأي طلب بقيمة 750 ج.م فأكثر!`
    };
  }

  if (msg.includes('دفع') || msg.includes('إنستاباي') || msg.includes('فودافون') || msg.includes('كاش') || msg.includes('فيزا')) {
    return {
      reply: `نوفر لكِ جميع طرق الدفع الآمنة في مصر:\n1. الدفع الفوري عبر InstaPay.\n2. المحافظ الإلكترونية (فودافون كاش، أورنج كاش، اتصالات كاش، WE Pay) على رقم الشركة: 01227208589.\n3. البطاقات البنكية فيزا وماستركارد.\n4. الدفع عند الاستلام (COD) مع معاينة المنتج عند وصول مندوب الشحن.`
    };
  }

  if (msg.includes('اصنع') || msg.includes('تفصيل') || msg.includes('مخصص') || msg.includes('مختبر') || msg.includes('custom')) {
    return {
      reply: `✨ في 'مختبر ابتكار روح' يمكنك ابتكار مستحضرك التجميلي الخاص بـ 6 خطوات سهلة:\nاختيار نوع المنتج ➜ القاعدة الطبيعية ➜ المواد الفعالة ➜ العطر الملكي ➜ العبوة الفاخرة ➜ كتابة اسمك أو اسم من تحبين ليطبع على الزجاجة!\nاضغطي على 'اصنع منتجكِ بنفسكِ ✨' في القائمة العلوية لتجربة فورية.`
    };
  }

  return {
    reply: `أهلاً بكِ في روح (ROOH) – مستحضرات التجميل الملكية الطبيعية 🌸\nأنا مساعدتكِ الذكية، يمكنني مساعدتكِ في:\n• ترشيح أنسب المنتجات لنوع بشرتك وشعرك\n• تصميم منتجك التجميلي الخاص من معمل روح\n• معرفة أسعار الشحن ومواعيد التوصيل لمحافظتك\n• تتبع حالة طلبكِ أو التحدث مع الأستاذ عبدالرحمن مباشرة (01227208589).\nكيف يمكنني مساعدتكِ اليوم؟`
  };
}

// =========================================================================
// MAIN HTTP SERVER ENGINE
// =========================================================================
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // =======================================================================
  // REST API ROUTING
  // =======================================================================
  if (pathname.startsWith('/api/')) {
    const db = readDB();
    if (!db) {
      return sendJSON(res, 500, { error: 'Failed to access database' });
    }

    try {
      // 1. Full Database Dump & Unified Global Save
      if (pathname === '/api/db' && method === 'GET') {
        return sendJSON(res, 200, db);
      }
      if ((pathname === '/api/db' || pathname === '/api/db/save') && (method === 'POST' || method === 'PUT')) {
        const body = await parseBody(req);
        if (body && typeof body === 'object') {
          Object.assign(db, body);
          writeDB(db);
          return sendJSON(res, 200, {
            success: true,
            message: 'تم حفظ كافة التعديلات وتطبيقها بنجاح على المتجر وقاعدة البيانات',
            timestamp: new Date().toISOString()
          });
        }
        return sendJSON(res, 400, { error: 'بيانات غير صالحة' });
      }

      // 2. Settings
      if (pathname === '/api/settings') {
        if (method === 'GET') return sendJSON(res, 200, db.settings || {});
        if (method === 'POST' || method === 'PUT') {
          const body = await parseBody(req);
          db.settings = { ...(db.settings || {}), ...body };
          writeDB(db);
          return sendJSON(res, 200, { success: true, settings: db.settings });
        }
      }

      // 3. Products Endpoints
      if (pathname === '/api/products') {
        if (method === 'GET') {
          const cat = parsedUrl.query.category;
          const search = (parsedUrl.query.q || '').toLowerCase();
          let results = db.products || [];
          if (cat && cat !== 'all') {
            results = results.filter(p => p.category_id === cat);
          }
          if (search) {
            results = results.filter(p => 
              (p.name_ar && p.name_ar.toLowerCase().includes(search)) || 
              (p.name_en && p.name_en.toLowerCase().includes(search)) || 
              (p.sku && p.sku.toLowerCase().includes(search))
            );
          }
          return sendJSON(res, 200, results);
        }

        if (method === 'POST') {
          const body = await parseBody(req);
          const newProduct = {
            id: body.id || `PRD-${Date.now().toString().slice(-4)}`,
            name_ar: body.name_ar,
            name_en: body.name_en || '',
            category_id: body.category_id,
            category_name_ar: body.category_name_ar || '',
            sku: body.sku || `SKU-${Date.now().toString().slice(-4)}`,
            barcode: body.barcode || `622${Date.now().toString().slice(-9)}`,
            price: Number(body.price) || 0,
            original_price: Number(body.original_price) || Number(body.price) || 0,
            cost_price: Number(body.cost_price) || 0,
            stock: Number(body.stock) || 0,
            min_stock: Number(body.min_stock) || 10,
            image: body.image || 'assets/img/placeholder.png',
            images: body.images || [body.image || 'assets/img/placeholder.png'],
            description_ar: body.description_ar || '',
            usage_ar: body.usage_ar || '',
            ingredients_ar: body.ingredients_ar || '',
            sizes: body.sizes || ['100ml'],
            colors: body.colors || [],
            is_bestseller: !!body.is_bestseller,
            is_new: !!body.is_new,
            status: body.status || 'Active',
            rating: 5,
            reviews_count: 0,
            created_at: new Date().toISOString()
          };
          db.products = db.products || [];
          db.products.unshift(newProduct);
          writeDB(db);
          return sendJSON(res, 201, newProduct);
        }
      }

      if (pathname.startsWith('/api/products/')) {
        const prodId = pathname.replace('/api/products/', '');
        db.products = db.products || [];
        const idx = db.products.findIndex(p => p.id === prodId);
        if (idx === -1) return sendJSON(res, 404, { error: 'المنتج غير موجود' });

        if (method === 'GET') return sendJSON(res, 200, db.products[idx]);
        if (method === 'PUT') {
          const body = await parseBody(req);
          db.products[idx] = { ...db.products[idx], ...body, id: prodId };
          writeDB(db);
          return sendJSON(res, 200, db.products[idx]);
        }
        if (method === 'DELETE') {
          const deleted = db.products.splice(idx, 1)[0];
          writeDB(db);
          return sendJSON(res, 200, { success: true, deleted });
        }
      }

      // 4. Categories Endpoints
      if (pathname === '/api/categories') {
        if (method === 'GET') return sendJSON(res, 200, db.categories || []);
        if (method === 'POST') {
          const body = await parseBody(req);
          const newCat = {
            id: body.id || `CAT-${Date.now().toString().slice(-4)}`,
            name_ar: body.name_ar,
            name_en: body.name_en || '',
            description_ar: body.description_ar || '',
            icon: body.icon || '✨',
            order: (db.categories || []).length + 1,
            active: true
          };
          db.categories = db.categories || [];
          db.categories.push(newCat);
          writeDB(db);
          return sendJSON(res, 201, newCat);
        }
      }

      if (pathname.startsWith('/api/categories/')) {
        const catId = pathname.replace('/api/categories/', '');
        db.categories = db.categories || [];
        const idx = db.categories.findIndex(c => c.id === catId);
        if (idx === -1) return sendJSON(res, 404, { error: 'القسم غير موجود' });

        if (method === 'PUT') {
          const body = await parseBody(req);
          db.categories[idx] = { ...db.categories[idx], ...body, id: catId };
          writeDB(db);
          return sendJSON(res, 200, db.categories[idx]);
        }
        if (method === 'DELETE') {
          const deleted = db.categories.splice(idx, 1)[0];
          writeDB(db);
          return sendJSON(res, 200, { success: true, deleted });
        }
      }

      // 5. Orders Endpoints
      if (pathname === '/api/orders') {
        if (method === 'GET') {
          const status = parsedUrl.query.status;
          let orders = db.orders || [];
          if (status && status !== 'all') orders = orders.filter(o => o.order_status === status);
          return sendJSON(res, 200, orders);
        }

        if (method === 'POST') {
          const body = await parseBody(req);
          const newOrder = {
            id: `ORD-${Date.now().toString().slice(-5)}`,
            order_number: 1000 + (db.orders || []).length + 1,
            customer_name: body.customer_name || 'عميل كرام',
            customer_phone: body.customer_phone || '',
            customer_governorate: body.customer_governorate || 'القاهرة',
            customer_address: body.customer_address || '',
            items: body.items || [],
            subtotal: Number(body.subtotal) || 0,
            shipping_fee: Number(body.shipping_fee) || 0,
            discount: Number(body.discount) || 0,
            total: Number(body.total) || 0,
            payment_method: body.payment_method || 'cod',
            payment_status: body.payment_status || 'Pending',
            order_status: 'New',
            created_at: new Date().toISOString(),
            notes: body.notes || ''
          };
          db.orders = db.orders || [];
          db.orders.unshift(newOrder);

          // Update Vault
          db.vault = db.vault || { balance: 0, transactions: [] };
          if (newOrder.payment_status === 'Paid') {
            db.vault.balance += newOrder.total;
            db.vault.transactions.unshift({
              id: `TXN-${Date.now()}`,
              date: new Date().toISOString(),
              type: 'inflow',
              type_ar: 'إيراد مبيعات',
              amount: newOrder.total,
              method: newOrder.payment_method,
              reference: newOrder.id,
              reason: `تحصيل قيمة طلب جديد رقم #${newOrder.order_number}`,
              status: 'Confirmed'
            });
          }

          writeDB(db);
          return sendJSON(res, 201, newOrder);
        }
      }

      if (pathname.startsWith('/api/orders/')) {
        const orderId = pathname.replace('/api/orders/', '');
        db.orders = db.orders || [];
        const idx = db.orders.findIndex(o => o.id === orderId);
        if (idx === -1) return sendJSON(res, 404, { error: 'الطلب غير موجود' });

        if (method === 'PUT') {
          const body = await parseBody(req);
          db.orders[idx] = { ...db.orders[idx], ...body, id: orderId };
          writeDB(db);
          return sendJSON(res, 200, db.orders[idx]);
        }
        if (method === 'DELETE') {
          const deleted = db.orders.splice(idx, 1)[0];
          writeDB(db);
          return sendJSON(res, 200, { success: true, deleted });
        }
      }

      // 6. Customers Endpoints
      if (pathname === '/api/customers') {
        if (method === 'GET') return sendJSON(res, 200, db.customers || []);
        if (method === 'POST') {
          const body = await parseBody(req);
          const newCust = {
            id: `CUST-${Date.now().toString().slice(-4)}`,
            name: body.name,
            phone: body.phone,
            governorate: body.governorate || 'القاهرة',
            address: body.address || '',
            total_orders: 0,
            total_spent: 0,
            created_at: new Date().toISOString()
          };
          db.customers = db.customers || [];
          db.customers.push(newCust);
          writeDB(db);
          return sendJSON(res, 201, newCust);
        }
      }

      if (pathname.startsWith('/api/customers/')) {
        const custId = pathname.replace('/api/customers/', '');
        db.customers = db.customers || [];
        const idx = db.customers.findIndex(c => c.id === custId);
        if (idx === -1) return sendJSON(res, 404, { error: 'العميل غير موجود' });

        if (method === 'PUT') {
          const body = await parseBody(req);
          db.customers[idx] = { ...db.customers[idx], ...body, id: custId };
          writeDB(db);
          return sendJSON(res, 200, db.customers[idx]);
        }
        if (method === 'DELETE') {
          const deleted = db.customers.splice(idx, 1)[0];
          writeDB(db);
          return sendJSON(res, 200, { success: true, deleted });
        }
      }

      // 7. Reviews Endpoints (Full Manual Add, Edit, Delete)
      if (pathname === '/api/reviews') {
        if (method === 'GET') return sendJSON(res, 200, db.reviews || []);
        if (method === 'POST') {
          const body = await parseBody(req);
          const newRev = {
            id: body.id || `REV-${Date.now().toString().slice(-4)}`,
            customer_name: body.customer_name || 'عميل مميز',
            rating: Number(body.rating) || 5,
            title: body.title || '',
            comment: body.comment || '',
            reply: body.reply || '',
            verified_purchase: body.verified_purchase !== undefined ? !!body.verified_purchase : true,
            location: body.location || 'جمهورية مصر العربية',
            product_id: body.product_id || '',
            product_name_ar: body.product_name_ar || 'سوق روح للمستحضرات الملكية',
            status: body.status || 'approved',
            date: body.date || new Date().toISOString()
          };
          db.reviews = db.reviews || [];
          db.reviews.unshift(newRev);
          writeDB(db);
          return sendJSON(res, 201, newRev);
        }
      }

      if (pathname.startsWith('/api/reviews/')) {
        const revId = pathname.replace('/api/reviews/', '');
        db.reviews = db.reviews || [];
        const idx = db.reviews.findIndex(r => r.id === revId);
        if (idx === -1) return sendJSON(res, 404, { error: 'التقييم غير موجود' });

        if (method === 'PUT') {
          const body = await parseBody(req);
          db.reviews[idx] = { ...db.reviews[idx], ...body, id: revId };
          writeDB(db);
          return sendJSON(res, 200, db.reviews[idx]);
        }
        if (method === 'DELETE') {
          const deleted = db.reviews.splice(idx, 1)[0];
          writeDB(db);
          return sendJSON(res, 200, { success: true, deleted });
        }
      }

      // 8. The Vault & Financials
      if (pathname === '/api/vault/summary') {
        const vault = db.vault || { balance: 0, transactions: [] };
        const orders = db.orders || [];
        let grossSales = 0;
        let netCollected = vault.balance || 0;
        let pendingAmount = 0;

        orders.forEach(o => {
          grossSales += Number(o.total) || 0;
          if (o.payment_status === 'Pending') pendingAmount += Number(o.total) || 0;
        });

        const summary = {
          balance: vault.balance || 0,
          gross_sales: grossSales,
          net_collected: netCollected,
          pending_amount: pendingAmount,
          total_refunds: vault.total_refunds || 0,
          gateways_breakdown: vault.gateways_breakdown || {
            instapay: { collected: 0, pending: 0 },
            wallets: { collected: 0, pending: 0 },
            cards: { collected: 0, pending: 0 },
            cod: { collected: 0, pending: 0 }
          }
        };
        return sendJSON(res, 200, summary);
      }

      if (pathname === '/api/vault/transactions') {
        db.vault = db.vault || { balance: 0, transactions: [] };
        if (method === 'GET') return sendJSON(res, 200, db.vault.transactions || []);
        if (method === 'POST') {
          const body = await parseBody(req);
          const amount = Number(body.amount) || 0;
          const isOutflow = body.type === 'outflow';

          const newTxn = {
            id: `TXN-${Date.now()}`,
            date: body.date || new Date().toISOString(),
            type: body.type || 'inflow',
            type_ar: isOutflow ? (body.type_ar || 'مصروفات / منصرف') : (body.type_ar || 'إيداع / إيراد'),
            amount: amount,
            method: body.method || 'نقدي',
            reference: body.reference || `REF-${Date.now().toString().slice(-4)}`,
            party: body.party || '',
            reason: body.reason || 'معاملة مالية معتمدة في الخزنة',
            status: 'Confirmed'
          };

          if (isOutflow) {
            db.vault.balance = Math.max(0, (db.vault.balance || 0) - amount);
          } else {
            db.vault.balance = (db.vault.balance || 0) + amount;
          }

          db.vault.transactions = db.vault.transactions || [];
          db.vault.transactions.unshift(newTxn);
          writeDB(db);
          return sendJSON(res, 201, { success: true, transaction: newTxn, balance: db.vault.balance });
        }
      }

      // 9. Media Library (Upload File from PC / DataURL)
      if (pathname === '/api/media') {
        if (method === 'GET') return sendJSON(res, 200, db.media_library || []);
        if (method === 'POST') {
          const body = await parseBody(req);
          const newMedia = {
            id: body.id || `MED-${Date.now().toString().slice(-4)}`,
            name: body.name || 'صورة جديدة',
            category: body.category || 'site',
            target: body.target || '',
            url: body.url || 'assets/img/placeholder.png',
            size: body.size || 'ملف مرفوع من الكمبيوتر',
            created_at: new Date().toISOString()
          };
          db.media_library = db.media_library || [];
          db.media_library.unshift(newMedia);

          // If target is logo or hero, update settings/sections automatically
          if (body.target === 'logo') {
            db.settings = db.settings || {};
            db.settings.brand_logo = newMedia.url;
          } else if (body.target === 'hero') {
            db.settings = db.settings || {};
            db.settings.hero_banner = newMedia.url;
          }

          writeDB(db);
          return sendJSON(res, 201, newMedia);
        }
      }

      if (pathname.startsWith('/api/media/')) {
        const medId = pathname.replace('/api/media/', '');
        db.media_library = db.media_library || [];
        const idx = db.media_library.findIndex(m => m.id === medId);
        if (idx === -1) return sendJSON(res, 404, { error: 'الصورة غير موجودة' });

        if (method === 'PUT') {
          const body = await parseBody(req);
          db.media_library[idx] = { ...db.media_library[idx], ...body, id: medId };
          writeDB(db);
          return sendJSON(res, 200, db.media_library[idx]);
        }
        if (method === 'DELETE') {
          const deleted = db.media_library.splice(idx, 1)[0];
          writeDB(db);
          return sendJSON(res, 200, { success: true, deleted });
        }
      }

      // 10. Theme Colors & Botanical Motifs
      if (pathname === '/api/theme/colors') {
        if (method === 'GET') return sendJSON(res, 200, db.theme_colors || {});
        if (method === 'POST') {
          const body = await parseBody(req);
          db.theme_colors = { ...(db.theme_colors || {}), ...body };
          writeDB(db);
          return sendJSON(res, 200, { success: true, theme_colors: db.theme_colors });
        }
      }

      // 11. Visual Website & Store Builder
      if (pathname === '/api/builder/sections') {
        if (method === 'GET') return sendJSON(res, 200, db.website_sections || []);
        if (method === 'POST') {
          const body = await parseBody(req);
          db.website_sections = Array.isArray(body) ? body : (body.sections || []);
          writeDB(db);
          return sendJSON(res, 200, { success: true, sections: db.website_sections });
        }
      }

      // 12. Team Meetings & Real-Time Presence
      if (pathname === '/api/meetings/messages') {
        db.team_meetings = db.team_meetings || { messages: [], active_users: [] };
        if (method === 'GET') {
          const users = (db.users || []).map(u => ({
            id: u.id,
            name: u.name,
            role_ar: u.role_ar || (u.is_master ? 'المالك والمدير العام' : 'مساعد'),
            avatar: u.avatar || (u.is_master ? '👑' : '👤'),
            status: (db.team_meetings.active_users || []).includes(u.id) ? 'online' : 'offline',
            last_seen: u.last_login || new Date().toISOString()
          }));
          return sendJSON(res, 200, {
            messages: db.team_meetings.messages || [],
            participants: users
          });
        }

        if (method === 'POST') {
          const body = await parseBody(req);
          const newMsg = {
            id: `MSG-${Date.now()}`,
            sender_id: body.sender_id || 'USR-001',
            sender_name: body.sender_name || 'المدير العام',
            sender_role: body.sender_role || 'المدير العام',
            sender_avatar: body.sender_avatar || '👑',
            text: body.text || '',
            timestamp: new Date().toISOString()
          };
          db.team_meetings.messages = db.team_meetings.messages || [];
          db.team_meetings.messages.push(newMsg);
          // Keep active user present
          db.team_meetings.active_users = Array.from(new Set([...(db.team_meetings.active_users || []), newMsg.sender_id]));
          writeDB(db);
          return sendJSON(res, 201, newMsg);
        }
      }

      if (pathname === '/api/meetings/heartbeat' && method === 'POST') {
        const body = await parseBody(req);
        const userId = body.user_id;
        if (userId) {
          db.team_meetings = db.team_meetings || { messages: [], active_users: [] };
          db.team_meetings.active_users = Array.from(new Set([...(db.team_meetings.active_users || []), userId]));
          writeDB(db);
        }
        return sendJSON(res, 200, { success: true });
      }

      // 13. AI Executive Assistant (Admin AI with dialect NLP & reminders)
      if (pathname === '/api/ai/admin' && method === 'POST') {
        const body = await parseBody(req);
        const user = body.user || { name: 'عبدالرحمن' };
        const response = handleAdminAIChat(body.message, db, user);
        return sendJSON(res, 200, response);
      }

      // 14. Customer Chatbot
      if (pathname === '/api/ai/chat' && method === 'POST') {
        const body = await parseBody(req);
        const aiResponse = handleAIChat(body.message, db);
        return sendJSON(res, 200, aiResponse);
      }

      // 15. Authentication (Abdelrahman / Aboudi / Admin & Assistants)
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const userEntered = (body.username || '').trim().toLowerCase();
        const passEntered = (body.password || '').trim();

        const users = db.users || [];
        const isMasterAlias = ['admin', 'المدير', 'مدير', 'manager', 'owner', '01227208589'].includes(userEntered);
        const isMasterPass = ['Admin@2026', 'admin', '123456', 'Admin123', '01227208589'].includes(passEntered);

        // Find matching account
        let matched = users.find(u => {
          const uName = (u.username || '').toLowerCase();
          const uPhone = (u.phone || '').trim();
          if (u.is_master && isMasterAlias && (u.password === passEntered || isMasterPass)) return true;
          return (uName === userEntered || uPhone === userEntered) && (u.password === passEntered || (u.is_master && isMasterPass));
        });

        // Direct guarantee for master owner
        if (!matched && isMasterAlias && isMasterPass) {
          matched = users.find(u => u.is_master) || {
            id: 'USR-001',
            name: 'المدير العام',
            username: 'admin',
            role: 'Owner',
            role_ar: 'المدير العام',
            phone: '01227208589',
            is_master: true,
            permissions: ['all']
          };
        }

        if (!matched) {
          return sendJSON(res, 401, { error: 'اسم المستخدم أو كلمة المرور غير صحيحة!' });
        }

        if (matched.status === 'Inactive') {
          return sendJSON(res, 403, { error: 'هذا الحساب تم إيقافه مؤقتاً من قبل المالك.' });
        }

        // Update last login
        matched.last_login = new Date().toISOString();
        writeDB(db);

        const token = `rooh_auth_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        return sendJSON(res, 200, {
          success: true,
          token: token,
          user: {
            id: matched.id,
            name: matched.name,
            username: matched.username,
            role: matched.role,
            role_ar: matched.role_ar || (matched.is_master ? 'المدير العام' : 'مساعد'),
            avatar: matched.avatar || (matched.is_master ? '👑' : '👤'),
            phone: matched.phone || '',
            is_master: !!matched.is_master,
            permissions: matched.permissions || ['all']
          }
        });
      }

      // 16. Users Management (Assistants)
      if (pathname === '/api/users') {
        if (method === 'GET') {
          const users = (db.users || []).map(u => ({
            ...u,
            password: u.is_master ? '******' : u.password
          }));
          return sendJSON(res, 200, users);
        }

        if (method === 'POST') {
          const body = await parseBody(req);
          const uname = (body.username || '').trim().toLowerCase();
          if (!uname || !body.password) {
            return sendJSON(res, 400, { error: 'اسم المستخدم وكلمة المرور مطلوبان.' });
          }

          db.users = db.users || [];
          if (db.users.some(u => u.username.toLowerCase() === uname)) {
            return sendJSON(res, 400, { error: 'اسم المستخدم مسجل بالفعل.' });
          }

          const newUser = {
            id: `USR-${Date.now().toString().slice(-4)}`,
            name: body.name || 'مساعد جديد',
            username: uname,
            password: body.password.trim(),
            role: body.role || 'Assistant',
            role_ar: body.role_ar || 'مساعد فريق العمل',
            avatar: body.avatar || '👤',
            phone: body.phone || '',
            is_master: false,
            permissions: body.permissions || ['orders', 'shipping'],
            status: 'Active',
            created_at: new Date().toISOString()
          };

          db.users.push(newUser);
          writeDB(db);
          return sendJSON(res, 201, newUser);
        }
      }

      if (pathname.startsWith('/api/users/')) {
        const uid = pathname.replace('/api/users/', '');
        db.users = db.users || [];
        const idx = db.users.findIndex(u => u.id === uid);
        if (idx === -1) return sendJSON(res, 404, { error: 'المستخدم غير موجود' });

        if (method === 'PUT') {
          const body = await parseBody(req);
          const target = db.users[idx];
          if (target.is_master && body.status === 'Inactive') {
            return sendJSON(res, 400, { error: 'لا يمكن تعطيل حساب المالك الرئيسي!' });
          }
          if (body.name) target.name = body.name;
          if (body.phone) target.phone = body.phone;
          if (body.avatar) target.avatar = body.avatar;
          if (body.password) target.password = body.password.trim();
          if (body.role_ar) target.role_ar = body.role_ar;
          if (body.status) target.status = body.status;
          if (body.permissions && !target.is_master) target.permissions = body.permissions;
          writeDB(db);
          return sendJSON(res, 200, target);
        }

        if (method === 'DELETE') {
          if (db.users[idx].is_master) {
            return sendJSON(res, 400, { error: 'لا يمكن حذف حساب المالك الرئيسي!' });
          }
          const deleted = db.users.splice(idx, 1)[0];
          writeDB(db);
          return sendJSON(res, 200, { success: true, deleted });
        }
      }

      // If no API matched
      return sendJSON(res, 404, { error: 'API endpoint not found' });

    } catch (err) {
      console.error('API Error:', err);
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // =======================================================================
  // STATIC FILE SERVING & CLEAN URL ROUTING (/admin, /login, /store, /)
  // =======================================================================
  let reqPath = pathname;

  // Clean URL Rewrites:
  if (reqPath === '/' || reqPath === '/store' || reqPath === '/home') {
    reqPath = '/index.html';
  } else if (reqPath === '/admin' || reqPath === '/admin/') {
    reqPath = '/admin.html';
  } else if (reqPath === '/login' || reqPath === '/login/') {
    reqPath = '/login.html';
  }

  let filePath = path.join(__dirname, reqPath);

  // Security check to avoid path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    // If not found as exact file, test if adding .html exists (e.g. /admin -> /admin.html)
    if (err || !stats.isFile()) {
      const htmlCandidate = filePath + '.html';
      if (fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
        filePath = htmlCandidate;
      } else {
        // Fallback to index.html for store SPA
        filePath = path.join(__dirname, 'index.html');
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Error loading file');
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    });
  });
});

// Start listening on 0.0.0.0 (all network adapters) so mobile and laptops can connect
server.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  console.log(`=======================================================================`);
  console.log(`  👑 منظومة روح المتكاملة لمستحضرات التجميل تعمل بنجاح! ROOH Live Engine `);
  console.log(`  المدير العام: إدارة روح لمستحضرات التجميل (01227208589)                           `);
  console.log(`=======================================================================`);
  console.log(`  [1] الدخول من الكمبيوتر (Desktop):                                   `);
  console.log(`      • المتجر والموقع:  http://localhost:${PORT}                      `);
  console.log(`      • لوحة التحكم:    http://localhost:${PORT}/admin                `);
  console.log(`      • تسجيل الدخول:   http://localhost:${PORT}/login                `);
  console.log(`-----------------------------------------------------------------------`);
  console.log(`  [2] الدخول من الهاتف المحمول (Mobile Wi-Fi):                         `);
  localIPs.forEach(ip => {
    console.log(`      • رابط المتجر:    http://${ip}:${PORT}                           `);
    console.log(`      • رابط لوحة التحكم: http://${ip}:${PORT}/admin                     `);
    console.log(`      • رابط تسجيل الدخول: http://${ip}:${PORT}/login                    `);
  });
  console.log(`=======================================================================`);
});
