/**
 * ROOH - Create Your Own Product (مختبر ابتكار روح 2.0)
 * Interactive formulation studio with realistic bottle visualizer, chemical safety checks, and AI Formulation Consultant.
 */

class RoohCustomizer {
  constructor() {
    this.state = {
      type: null,
      base: null,
      actives: [],
      fragrance: null,
      size: null,
      packaging: null,
      customLabel: '',
      calculatedPrice: 0,
      calculatedCost: 0,
      aiRecommendationNote: ''
    };
    this.options = null;
  }

  async init() {
    this.options = await window.roohDB.getCustomizerOptions();
    if (!this.options || !this.options.types) return;

    // Set smart luxury defaults
    this.state.type = this.options.types[0];
    this.state.base = this.options.bases[0];
    this.state.actives = [this.options.active_ingredients[0], this.options.active_ingredients[1]];
    this.state.fragrance = this.options.fragrances[0];
    this.state.size = this.options.sizes[0];
    this.state.packaging = this.options.packaging[0];
    this.state.customLabel = 'إشراقة روح الخاصة';

    this.render();
    this.calculatePricing();
  }

  render() {
    const container = document.getElementById('customizerRoot');
    if (!container) return;

    container.innerHTML = `
      <div class="lab-grid">
        <!-- Live Bottle & Label Preview -->
        <div class="lab-preview-card">
          <div style="margin-bottom: 16px;">
            <span class="badge-tag tag-new" style="display:inline-block; margin-bottom:8px;">معمل روح للتجميل الملكي 2.0</span>
            <h3 style="font-family:var(--rooh-font-serif); font-size:1.4rem; color:var(--rooh-gold);">معاينة مستحضركِ المبتكر</h3>
            <p style="font-size:0.8rem; color:#DDD4C5;">تركيبة آمنة ومعتمدة معملياً 100% خالية من المواد الضارة</p>
          </div>

          <!-- AI Assistant Quick Trigger Button -->
          <button type="button" class="btn-rooh" style="width:100%; margin-bottom:16px; background:linear-gradient(135deg, #3A2F1B 0%, #24211E 100%); border:1px solid var(--rooh-gold); color:var(--rooh-gold); font-weight:700; font-size:0.88rem; justify-content:center; box-shadow:0 4px 15px rgba(191,161,95,0.15);" onclick="window.roohCustomizer.openAIConsultModal()">
            <span>✨ استشارة خبير مختبر روح الذكي (AI Formulation)</span>
          </button>

          <!-- Bottle Visualizer -->
          <div class="lab-bottle-render" id="bottlePreview" style="transition: all 0.4s ease;">
            <div class="lab-bottle-cap" id="bottleCap"></div>
            <div class="lab-bottle-label" id="bottleLabel">
              <span style="font-size:0.62rem; color:var(--rooh-gold); font-weight:800; letter-spacing:1.5px; display:block;">ROOH ATELIER</span>
              <h4 id="previewTypeTitle" style="margin:2px 0; font-size:1rem;">${this.state.type?.name_ar || 'سيروم نضارة'}</h4>
              <p id="previewSize" style="margin:0; font-size:0.7rem; color:var(--rooh-muted);">${this.state.size?.name_ar.split('-')[0] || '30 مل'}</p>
              <div class="custom-name-preview" id="previewLabelName" style="color:var(--rooh-dark); font-weight:800; font-size:0.85rem; margin-top:4px; border-top:1px dashed var(--rooh-gold); padding-top:4px;">
                ${this.state.customLabel || 'تركيبتكِ الخاصة'}
              </div>
            </div>
          </div>

          ${this.state.aiRecommendationNote ? `
            <div style="background:rgba(191,161,95,0.12); border:1px solid var(--rooh-gold); border-radius:10px; padding:12px; margin-top:12px; font-size:0.8rem; color:#FAF7F2; line-height:1.6; text-align:right;">
              <strong style="color:var(--rooh-gold); display:block; margin-bottom:4px;">💡 توصية خبير روح الذكي:</strong>
              ${this.state.aiRecommendationNote}
            </div>
          ` : ''}

          <div style="background:rgba(0,0,0,0.3); border-radius:12px; padding:16px; margin-top:16px; text-align:right;">
            <div style="font-size:0.85rem; color:#C5A880; margin-bottom:8px; font-weight:700;">ملخص تركيبتكِ المختارة:</div>
            <div id="customizerSummaryList" style="font-size:0.8rem; color:#FAF7F2; line-height:1.6;"></div>
            
            <div style="display:flex; align-items:baseline; justify-content:space-between; margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.15);">
              <span style="font-size:0.95rem; font-weight:600; color:#EFE9DF;">السعر النهائي:</span>
              <span style="font-size:1.6rem; font-weight:800; color:var(--rooh-gold);" id="customizerFinalPrice">0 ج.م</span>
            </div>
          </div>

          <button class="btn-rooh btn-rooh-primary" style="width:100%; margin-top:16px; font-size:1.05rem;" id="addCustomToCartBtn">
            <span>إضافة هذا المنتج المخصص للسلة</span>
            <span>🛍️</span>
          </button>
        </div>

        <!-- Interactive Selection Steps -->
        <div class="customizer-steps">
          <!-- Step 1: Type -->
          <div class="customizer-step-card active">
            <div class="step-header">
              <span class="step-num">1</span>
              <div>
                <h4 class="step-title">اختاري نوع المستحضر التجميلي</h4>
                <p style="font-size:0.8rem; color:#A89F91;">حدد القوام والهدف الأساسي لمنتجك</p>
              </div>
            </div>
            <div class="option-cards-grid">
              ${(this.options.types || []).map(t => `
                <button class="option-select-btn ${this.state.type?.id === t.id ? 'selected' : ''}" onclick="window.roohCustomizer.selectType('${t.id}')">
                  <span style="font-size:1.4rem;">${t.icon}</span>
                  <span>${t.name_ar}</span>
                  <span class="option-price-tag">${t.base_price} ج.م</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Step 2: Base -->
          <div class="customizer-step-card active">
            <div class="step-header">
              <span class="step-num">2</span>
              <div>
                <h4 class="step-title">اختاري القاعدة الطبيعية المعتمدة</h4>
                <p style="font-size:0.8rem; color:#A89F91;">المكون الحامل المغذي والغني بالفيتامينات</p>
              </div>
            </div>
            <div class="option-cards-grid" style="grid-template-columns:1fr 1fr;">
              ${(this.options.bases || []).map(b => `
                <button class="option-select-btn ${this.state.base?.id === b.id ? 'selected' : ''}" onclick="window.roohCustomizer.selectBase('${b.id}')" style="align-items:flex-start; text-align:right;">
                  <strong style="color:var(--rooh-gold); font-size:0.9rem;">${b.name_ar}</strong>
                  <span style="font-size:0.75rem; color:#DDD4C5;">${b.desc}</span>
                  <span class="option-price-tag">${b.price > 0 ? '+' + b.price + ' ج.م' : 'مشمول مجاناً'}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Step 3: Actives -->
          <div class="customizer-step-card active">
            <div class="step-header">
              <span class="step-num">3</span>
              <div>
                <h4 class="step-title">اختاري المواد الفعالة المركزة (بحد أقصى 3)</h4>
                <p style="font-size:0.8rem; color:#A89F91;">نظام الأمان يمنع التعارض الكيميائي تلقائياً لضمان سلامة بشرتك</p>
              </div>
            </div>
            <div class="option-cards-grid" style="grid-template-columns:1fr 1fr;">
              ${(this.options.active_ingredients || []).map(act => {
                const isSelected = this.state.actives.some(a => a.id === act.id);
                return `
                  <button class="option-select-btn ${isSelected ? 'selected' : ''}" onclick="window.roohCustomizer.toggleActive('${act.id}')" style="align-items:flex-start; text-align:right;">
                    <div style="display:flex; justify-content:space-between; width:100%;">
                      <strong>${act.name_ar}</strong>
                      <span style="color:var(--rooh-gold);">${isSelected ? '✓' : '+'}</span>
                    </div>
                    <span style="font-size:0.75rem; color:#DDD4C5;">${act.benefit}</span>
                    <span class="option-price-tag">+${act.price} ج.م</span>
                  </button>
                `;
              }).join('')}
            </div>
            <div id="safetyAlertBox" style="margin-top:12px; font-size:0.8rem;"></div>
          </div>

          <!-- Step 4: Fragrance -->
          <div class="customizer-step-card active">
            <div class="step-header">
              <span class="step-num">4</span>
              <div>
                <h4 class="step-title">اختاري العطر الطبيعي المفضل</h4>
                <p style="font-size:0.8rem; color:#A89F91;">زيوت عطرية نقية خالية من مسببات الحساسية</p>
              </div>
            </div>
            <div class="option-cards-grid">
              ${(this.options.fragrances || []).map(f => `
                <button class="option-select-btn ${this.state.fragrance?.id === f.id ? 'selected' : ''}" onclick="window.roohCustomizer.selectFragrance('${f.id}')">
                  <span>🌸</span>
                  <span style="font-size:0.8rem;">${f.name_ar}</span>
                  <span class="option-price-tag">${f.price > 0 ? '+' + f.price + ' ج.م' : 'خالٍ من العطر'}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Step 5: Size & Packaging -->
          <div class="customizer-step-card active">
            <div class="step-header">
              <span class="step-num">5</span>
              <div>
                <h4 class="step-title">الحجم والعبوة الفاخرة</h4>
                <p style="font-size:0.8rem; color:#A89F91;">زجاج دوائي فاخر معتم لحفظ المكونات الفعالة من التأكسد</p>
              </div>
            </div>
            <div style="margin-bottom:14px;">
              <span style="font-size:0.85rem; color:var(--rooh-gold); font-weight:600; display:block; margin-bottom:8px;">اختاري الحجم:</span>
              <div class="option-cards-grid">
                ${(this.options.sizes || []).map(s => `
                  <button class="option-select-btn ${this.state.size?.id === s.id ? 'selected' : ''}" onclick="window.roohCustomizer.selectSize('${s.id}')">
                    <strong>${s.name_ar.split('-')[0]}</strong>
                    <span style="font-size:0.75rem;">${s.name_ar.split('-')[1] || ''}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <div>
              <span style="font-size:0.85rem; color:var(--rooh-gold); font-weight:600; display:block; margin-bottom:8px;">اختاري نوع العبوة:</span>
              <div class="option-cards-grid" style="grid-template-columns:1fr 1fr;">
                ${(this.options.packaging || []).map(pkg => `
                  <button class="option-select-btn ${this.state.packaging?.id === pkg.id ? 'selected' : ''}" onclick="window.roohCustomizer.selectPackaging('${pkg.id}')" style="align-items:flex-start; text-align:right;">
                    <div style="display:flex; gap:8px; align-items:center;">
                      <span>${pkg.icon}</span>
                      <strong style="font-size:0.85rem;">${pkg.name_ar}</strong>
                    </div>
                    <span class="option-price-tag">+${pkg.price} ج.م</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Step 6: Custom Label Name -->
          <div class="customizer-step-card active">
            <div class="step-header">
              <span class="step-num">6</span>
              <div>
                <h4 class="step-title">طباعة اسمكِ أو إهداء خاص على زجاجة المستحضر</h4>
                <p style="font-size:0.8rem; color:#A89F91;">سنقوم بطباعة هذا الاسم بماء الذهب على ملصق العبوة الخاص بكِ</p>
              </div>
            </div>
            <input type="text" id="customLabelInput" class="ai-chat-input" value="${this.state.customLabel}" 
              placeholder="اكتبي الاسم المراد طباعته (مثال: سيروم ندى الخاص)" 
              oninput="window.roohCustomizer.updateLabel(this.value)" 
              style="width:100%; background:rgba(255,255,255,0.08); border-color:var(--rooh-gold); color:#FFF; font-size:1rem; padding:12px 18px;" />
          </div>
        </div>
      </div>
    `;

    document.getElementById('addCustomToCartBtn').onclick = () => this.addToCart();
    this.updatePreview();
  }

  selectType(id) {
    this.state.type = this.options.types.find(t => t.id === id);
    this.render();
    this.calculatePricing();
  }

  selectBase(id) {
    this.state.base = this.options.bases.find(b => b.id === id);
    this.render();
    this.calculatePricing();
  }

  toggleActive(id) {
    const act = this.options.active_ingredients.find(a => a.id === id);
    const existingIdx = this.state.actives.findIndex(a => a.id === id);

    if (existingIdx !== -1) {
      this.state.actives.splice(existingIdx, 1);
    } else {
      // Check maximum limit
      if (this.state.actives.length >= 3) {
        window.RoohUtil.showToast('لأمان بشرتكِ، ينصح معمل روح باختيار 3 مواد فعالة كحد أقصى في التركيبة الواحدة.', 'warning');
        return;
      }

      // Check chemical incompatibility
      if (act.incompatible_with && act.incompatible_with.length > 0) {
        const clash = this.state.actives.find(selected => act.incompatible_with.includes(selected.id));
        if (clash) {
          window.RoohUtil.showToast(`تنبيه أمان معمل روح: لا يمكن دمج (${act.name_ar}) مع (${clash.name_ar}) معاً لتجنب تهيج البشرة أو إبطال المفعول. تم اختيار التركيبة الآمنة تلقائياً.`, 'warning');
          return;
        }
      }

      this.state.actives.push(act);
    }

    this.render();
    this.calculatePricing();
  }

  selectFragrance(id) {
    this.state.fragrance = this.options.fragrances.find(f => f.id === id);
    this.render();
    this.calculatePricing();
  }

  selectSize(id) {
    this.state.size = this.options.sizes.find(s => s.id === id);
    this.render();
    this.calculatePricing();
  }

  selectPackaging(id) {
    this.state.packaging = this.options.packaging.find(p => p.id === id);
    this.render();
    this.calculatePricing();
  }

  updateLabel(val) {
    this.state.customLabel = val;
    const labelEl = document.getElementById('previewLabelName');
    if (labelEl) labelEl.textContent = val || 'تركيبتكِ الخاصة';
  }

  calculatePricing() {
    let basePrice = this.state.type?.base_price || 200;
    let baseCost = this.state.type?.base_cost || 50;

    // Add base price
    basePrice += (this.state.base?.price || 0);
    baseCost += (this.state.base?.cost || 0);

    // Add actives
    this.state.actives.forEach(act => {
      basePrice += (act.price || 0);
      baseCost += (act.cost || 0);
    });

    // Add fragrance
    basePrice += (this.state.fragrance?.price || 0);
    baseCost += (this.state.fragrance?.cost || 0);

    // Apply size multiplier
    const multiplier = this.state.size?.multiplier || 1.0;
    let finalPrice = Math.round(basePrice * multiplier);
    let finalCost = Math.round(baseCost * multiplier);

    // Add packaging price & cost
    finalPrice += (this.state.packaging?.price || 0);
    finalCost += (this.state.packaging?.cost || 0) + (this.state.size?.bottle_cost_mod || 10);

    this.state.calculatedPrice = finalPrice;
    this.state.calculatedCost = finalCost;

    const priceEl = document.getElementById('customizerFinalPrice');
    if (priceEl) priceEl.textContent = window.RoohUtil.formatCurrency(finalPrice);

    this.updatePreview();
  }

  updatePreview() {
    const summaryList = document.getElementById('customizerSummaryList');
    if (summaryList) {
      summaryList.innerHTML = `
        <div>• <strong>النوع:</strong> ${this.state.type?.name_ar || '-'}</div>
        <div>• <strong>القاعدة:</strong> ${this.state.base?.name_ar || '-'}</div>
        <div>• <strong>المواد الفعالة:</strong> ${this.state.actives.map(a => a.name_ar).join(' + ') || 'بدون إضافات'}</div>
        <div>• <strong>العطر:</strong> ${this.state.fragrance?.name_ar || '-'}</div>
        <div>• <strong>الحجم:</strong> ${this.state.size?.name_ar.split('-')[0] || '-'}</div>
        <div>• <strong>العبوة:</strong> ${this.state.packaging?.name_ar || '-'}</div>
        <div>• <strong>الاسم المطبوع:</strong> "${this.state.customLabel || 'بدون اسم'}"</div>
      `;
    }

    const labelEl = document.getElementById('previewLabelName');
    if (labelEl) labelEl.textContent = this.state.customLabel || 'تركيبتكِ الخاصة';

    const typeEl = document.getElementById('previewTypeTitle');
    if (typeEl) typeEl.textContent = this.state.type?.name_ar || 'مستحضر مخصص';

    const sizeEl = document.getElementById('previewSize');
    if (sizeEl) sizeEl.textContent = this.state.size?.name_ar.split('-')[0] || '50 مل';

    // Dynamic Bottle Styling based on packaging and base
    const bottleEl = document.getElementById('bottlePreview');
    const capEl = document.getElementById('bottleCap');

    if (bottleEl) {
      const baseName = (this.state.base?.name_ar || '').toLowerCase();
      let gradient = 'radial-gradient(circle at 40% 35%, #F4EEDF 0%, #CDB07B 60%, #876C3B 100%)';

      if (baseName.includes('أرجان') || baseName.includes('argan')) {
        gradient = 'radial-gradient(circle at 40% 35%, #FDE49B 0%, #D49B35 60%, #8D5C14 100%)';
      } else if (baseName.includes('ورد') || baseName.includes('rose')) {
        gradient = 'radial-gradient(circle at 40% 35%, #FFE3E9 0%, #F59DB1 60%, #B84A64 100%)';
      } else if (baseName.includes('ألوفيرا') || baseName.includes('صبار') || baseName.includes('aloe')) {
        gradient = 'radial-gradient(circle at 40% 35%, #E3FBE9 0%, #84D9A5 60%, #2E8150 100%)';
      } else if (baseName.includes('جوجوبا') || baseName.includes('jojoba')) {
        gradient = 'radial-gradient(circle at 40% 35%, #FFF2CC 0%, #E8BC4B 60%, #9F761A 100%)';
      }

      bottleEl.style.background = gradient;

      // Adjust bottle shape for packaging
      const pkgType = this.state.packaging?.id || '';
      if (pkgType.includes('jar') || pkgType.includes('برطمان')) {
        bottleEl.style.width = '240px';
        bottleEl.style.height = '200px';
        bottleEl.style.borderRadius = '24px 24px 18px 18px';
        if (capEl) {
          capEl.style.width = '220px';
          capEl.style.height = '28px';
          capEl.style.borderRadius = '12px 12px 0 0';
          capEl.style.top = '-26px';
        }
      } else {
        bottleEl.style.width = '220px';
        bottleEl.style.height = '310px';
        bottleEl.style.borderRadius = '36px 36px 16px 16px';
        if (capEl) {
          capEl.style.width = '65px';
          capEl.style.height = '36px';
          capEl.style.borderRadius = '8px 8px 0 0';
          capEl.style.top = '-32px';
        }
      }
    }
  }

  // ================= AI LAB FORMULATION MODAL =================
  openAIConsultModal() {
    let modal = document.getElementById('aiLabModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'aiLabModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content" style="max-width:560px; background:#24211E; color:#FFF; border:1px solid var(--rooh-gold);">
          <button class="modal-close-btn" style="color:#FFF;" onclick="document.getElementById('aiLabModal').classList.remove('open')">&times;</button>
          
          <div style="text-align:center; margin-bottom:20px;">
            <div style="width:60px; height:60px; border-radius:50%; background:var(--rooh-gold); color:#FFF; font-size:1.8rem; display:flex; align-items:center; justify-content:center; margin:0 auto 12px;">
              🔬
            </div>
            <h3 style="font-family:var(--rooh-font-serif); font-size:1.5rem; color:var(--rooh-gold); margin-bottom:6px;">
              خبير معمل روح الذكي (AI Formulation)
            </h3>
            <p style="font-size:0.85rem; color:#DDD4C5;">
              حددي هدفكِ التجميلي أو نوع بشرتكِ/شعركِ وسيقوم الخبير بابتكار تركيبة علمية متجانسة ومتوافقة 100%!
            </p>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
            <label style="font-size:0.85rem; color:var(--rooh-gold); font-weight:700;">أو اختاري هدفاً جاهزاً:</label>
            <button type="button" class="btn-rooh btn-rooh-outline btn-rooh-sm" style="text-align:right; justify-content:flex-start; color:#FFF;" onclick="window.roohCustomizer.triggerAIConsult('نضارة وإشراقة مكثفة وتوحيد لون البشرة')">
              ✨ نضارة وإشراقة مكثفة وتوحيد لون البشرة (Glow & Radiance)
            </button>
            <button type="button" class="btn-rooh btn-rooh-outline btn-rooh-sm" style="text-align:right; justify-content:flex-start; color:#FFF;" onclick="window.roohCustomizer.triggerAIConsult('علاج التجاعيد ومكافحة الشيخوخة وتجديد الكولاجين')">
              👑 علاج التجاعيد ومكافحة الشيخوخة وتجديد الكولاجين (Anti-Aging)
            </button>
            <button type="button" class="btn-rooh btn-rooh-outline btn-rooh-sm" style="text-align:right; justify-content:flex-start; color:#FFF;" onclick="window.roohCustomizer.triggerAIConsult('ترطيب فائق وعلاج الجفاف الشديد وحماية حاجز البشرة')">
              💧 ترطيب فائق للبشرة الجافة وترميم حاجز الحماية (Deep Hydration)
            </button>
            <button type="button" class="btn-rooh btn-rooh-outline btn-rooh-sm" style="text-align:right; justify-content:flex-start; color:#FFF;" onclick="window.roohCustomizer.triggerAIConsult('تنقية المسام ومكافحة حب الشباب وتقليل الإفرازات الدهنية')">
              🌿 تنقية المسام ومكافحة الحبوب والتحكم بالدهون (Acne & Pore Clarifying)
            </button>
            <button type="button" class="btn-rooh btn-rooh-outline btn-rooh-sm" style="text-align:right; justify-content:flex-start; color:#FFF;" onclick="window.roohCustomizer.triggerAIConsult('علاج تساقط الشعر وتغذية البصيلات وزيادة الكثافة')">
              🌱 علاج تساقط الشعر وتكثيف البصيلات (Hair Growth & Strengthening)
            </button>
          </div>

          <div>
            <label style="font-size:0.85rem; color:var(--rooh-gold); font-weight:700; display:block; margin-bottom:6px;">أو اكتبي استفساركِ بالتفصيل:</label>
            <div style="display:flex; gap:8px;">
              <input type="text" id="aiCustomLabInput" class="ai-chat-input" placeholder="مثال: بشرتي مختلطة وأعاني من تصبغات الشمس..." style="flex:1; background:rgba(255,255,255,0.08); color:#FFF; border-radius:8px;" />
              <button type="button" class="btn-rooh btn-rooh-primary" onclick="window.roohCustomizer.triggerAIConsult(document.getElementById('aiCustomLabInput').value)">
                ابتكار التركيبة
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    modal.classList.add('open');
  }

  async triggerAIConsult(promptText) {
    if (!promptText || !promptText.trim()) return;
    const modal = document.getElementById('aiLabModal');
    if (modal) modal.classList.remove('open');

    window.RoohUtil.showToast('جاري تحليل خصائص المواد وابتكار التركيبة الملكية المتوافقة...', 'info');

    const result = await window.roohDB.consultLabAI(promptText);
    if (!result || result.error) {
      window.RoohUtil.showToast('تعذر استشارة خبير المعمل حالياً، يرجى المحاولة مرة أخرى.', 'error');
      return;
    }

    // Apply AI findings
    if (result.suggested_type) {
      const foundType = this.options.types.find(t => t.id === result.suggested_type || t.name_ar.includes(result.suggested_type));
      if (foundType) this.state.type = foundType;
    }

    if (result.suggested_base) {
      const foundBase = this.options.bases.find(b => b.id === result.suggested_base.id || b.name_ar === result.suggested_base.name_ar);
      if (foundBase) this.state.base = foundBase;
    }

    if (result.suggested_actives && Array.isArray(result.suggested_actives)) {
      this.state.actives = [];
      result.suggested_actives.forEach(aiAct => {
        const found = this.options.active_ingredients.find(a => a.id === aiAct.id || a.name_ar === aiAct.name_ar);
        if (found && this.state.actives.length < 3) this.state.actives.push(found);
      });
    }

    if (result.suggested_packaging) {
      const foundPkg = this.options.packaging.find(p => p.id === result.suggested_packaging.id || p.name_ar === result.suggested_packaging.name_ar);
      if (foundPkg) this.state.packaging = foundPkg;
    }

    this.state.aiRecommendationNote = result.rationale || 'تركيبة صممت خصيصاً لتحقيق أقصى فاعلية وأمان لبشرتكِ.';
    this.state.customLabel = `إكسير روح: ${this.state.type?.name_ar || 'المخصص'}`;

    this.render();
    this.calculatePricing();

    window.RoohUtil.showToast('تم تطبيق التركيبة العلمية المقترحة من خبير معمل روح بنجاح! ✨', 'success');
  }

  addToCart() {
    const item = {
      product_id: `CUSTOM-${Date.now()}`,
      name: `مستحضر مخصص: ${this.state.type?.name_ar} (${this.state.customLabel || 'تركيبة خاصة'})`,
      sku: `ROOH-CUST-${this.state.type?.id?.toUpperCase() || 'SPEC'}`,
      qty: 1,
      unit_price: this.state.calculatedPrice,
      unit_cost: this.state.calculatedCost,
      total_price: this.state.calculatedPrice,
      total_cost: this.state.calculatedCost,
      customization: {
        type: this.state.type?.name_ar,
        base: this.state.base?.name_ar,
        actives: this.state.actives.map(a => a.name_ar),
        fragrance: this.state.fragrance?.name_ar,
        size: this.state.size?.name_ar,
        packaging: this.state.packaging?.name_ar,
        custom_label: this.state.customLabel
      }
    };

    if (window.roohCart) {
      window.roohCart.addItem(item);
      window.RoohUtil.showToast('تمت إضافة منتجكِ المبتكر بعناية إلى حقيبة التسوق!', 'success');
      window.roohCart.openDrawer();
    }
  }
}

window.roohCustomizer = new RoohCustomizer();
