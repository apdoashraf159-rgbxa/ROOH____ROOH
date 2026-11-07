/**
 * ROOH Visual Website Developer (مطور الموقع المرئي)
 * Full drag-and-drop live website builder with real database persistence.
 */

class RoohVisualBuilder {
  constructor() {
    this.sections = [];
    this.activeSectionIndex = 0;
    this.history = [];
    this.historyIndex = -1;
  }

  async init() {
    this.sections = await window.roohDB.getBuilderSections();
    if (!this.sections || !this.sections.length) {
      this.sections = [
        {
          id: 'hero_banner',
          type: 'hero',
          title_ar: 'فخامة الطبيعة.. وإشراقة تدوم في روحك',
          subtitle_ar: 'مستحضرات تجميل ملكية طبيعية مصممة بعناية فائقة',
          cta_text_ar: 'تسوقي في سوق روح',
          cta_link: '#store',
          bg_color: '#FAF6EE',
          active: true
        }
      ];
    }
    this.saveStateToHistory();
    this.render();
  }

  saveStateToHistory() {
    // Slice off any redo branch
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(JSON.parse(JSON.stringify(this.sections)));
    this.historyIndex++;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.sections = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.render();
      window.RoohUtil.showToast('تم التراجع عن آخر تعديل', 'info');
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.sections = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.render();
      window.RoohUtil.showToast('تمت إعادة التعديل', 'info');
    }
  }

  render() {
    const container = document.getElementById('visualBuilderRoot');
    if (!container) return;

    const activeSec = this.sections[this.activeSectionIndex] || this.sections[0];

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; background:#FFF; padding:16px 24px; border-radius:12px; border:1px solid var(--admin-border);">
        <div style="display:flex; align-items:center; gap:16px;">
          <h2 style="font-size:1.25rem; font-weight:700; color:var(--rooh-dark); margin:0;">مطور الموقع المرئي (Live Visual Builder)</h2>
          <span class="status-pill status-ready">● وضع التحرير المباشر</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohBuilder.undo()" ${this.historyIndex <= 0 ? 'disabled style="opacity:0.5;"' : ''}>↶ تراجع</button>
          <button class="btn-rooh btn-rooh-outline btn-rooh-sm" onclick="window.roohBuilder.redo()" ${this.historyIndex >= this.history.length - 1 ? 'disabled style="opacity:0.5;"' : ''}>↷ إعادة</button>
          <button class="btn-rooh btn-rooh-primary btn-rooh-sm" onclick="window.roohBuilder.publishLive()">
            <span>نشر التعديلات على الموقع المباشر</span>
            <span>🚀</span>
          </button>
        </div>
      </div>

      <div class="builder-layout">
        <!-- Sidebar Controls & Section Inspector -->
        <div class="builder-sidebar">
          <div>
            <h4 style="font-size:0.95rem; font-weight:700; color:var(--rooh-gold); margin-bottom:12px;">أقسام الموقع الحالية:</h4>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${this.sections.map((sec, idx) => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-radius:8px; border:1px solid ${this.activeSectionIndex === idx ? 'var(--rooh-gold)' : 'var(--admin-border)'}; background:${this.activeSectionIndex === idx ? 'var(--rooh-sand-light)' : '#FFF'}; cursor:pointer;" onclick="window.roohBuilder.setActiveSection(${idx})">
                  <span style="font-weight:600; font-size:0.85rem;">${idx + 1}. ${this.getSectionLabel(sec)}</span>
                  <div style="display:flex; gap:4px;" onclick="event.stopPropagation()">
                    <button onclick="window.roohBuilder.moveSection(${idx}, -1)" title="تحريك لأعلى" style="font-size:0.8rem; padding:2px 6px;">▲</button>
                    <button onclick="window.roohBuilder.moveSection(${idx}, 1)" title="تحريك لأسفل" style="font-size:0.8rem; padding:2px 6px;">▼</button>
                    <button onclick="window.roohBuilder.deleteSection(${idx})" title="حذف القسم" style="color:var(--rooh-danger); font-size:0.8rem; padding:2px 6px;">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>

            <div style="margin-top:16px;">
              <button class="btn-rooh btn-rooh-outline btn-rooh-sm" style="width:100%; border-style:dashed;" onclick="window.roohBuilder.showAddSectionModal()">
                <span>+ إضافة قسم جديد للموقع</span>
              </button>
            </div>
          </div>

          <!-- Section Property Inspector -->
          ${activeSec ? `
            <div style="border-top:1px solid var(--admin-border); padding-top:20px;">
              <h4 style="font-size:0.95rem; font-weight:700; color:var(--rooh-gold); margin-bottom:14px;">خصائص القسم المحدد:</h4>
              
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div>
                  <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px;">العنوان الرئيسي:</label>
                  <input type="text" class="ai-chat-input" style="width:100%; border-radius:6px;" value="${activeSec.title_ar || ''}" oninput="window.roohBuilder.updateActiveProp('title_ar', this.value)" />
                </div>

                ${activeSec.subtitle_ar !== undefined ? `
                  <div>
                    <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px;">العنوان الفرعي:</label>
                    <input type="text" class="ai-chat-input" style="width:100%; border-radius:6px;" value="${activeSec.subtitle_ar || ''}" oninput="window.roohBuilder.updateActiveProp('subtitle_ar', this.value)" />
                  </div>
                ` : ''}

                ${activeSec.desc_ar !== undefined ? `
                  <div>
                    <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px;">النص الوصفي:</label>
                    <textarea class="ai-chat-input" style="width:100%; height:80px; border-radius:6px;" oninput="window.roohBuilder.updateActiveProp('desc_ar', this.value)">${activeSec.desc_ar || ''}</textarea>
                  </div>
                ` : ''}

                ${activeSec.cta_text_ar !== undefined ? `
                  <div>
                    <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px;">نص الزر (CTA):</label>
                    <input type="text" class="ai-chat-input" style="width:100%; border-radius:6px;" value="${activeSec.cta_text_ar || ''}" oninput="window.roohBuilder.updateActiveProp('cta_text_ar', this.value)" />
                  </div>
                ` : ''}

                <div>
                  <label style="font-size:0.8rem; font-weight:600; display:block; margin-bottom:4px;">لون الخلفية (Background):</label>
                  <input type="color" value="${activeSec.bg_color || '#FAF6EE'}" onchange="window.roohBuilder.updateActiveProp('bg_color', this.value)" style="width:100%; height:36px; border:1px solid var(--admin-border); border-radius:6px; cursor:pointer;" />
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Live Canvas Preview Frame -->
        <div class="builder-canvas">
          <div style="text-align:center; margin-bottom:12px; font-size:0.85rem; color:var(--rooh-muted);">
            👁️ معاينة مباشرة: التعديلات تظهر هنا لحظياً أثناء الكتابة
          </div>

          ${this.sections.map((sec, idx) => `
            <div class="builder-block ${this.activeSectionIndex === idx ? 'active' : ''}" style="background:${sec.bg_color || '#FFF'};" onclick="window.roohBuilder.setActiveSection(${idx})">
              <div class="builder-block-toolbar">
                <span style="font-size:0.75rem; font-weight:700;">قسم: ${this.getSectionLabel(sec)}</span>
              </div>
              <div style="text-align:center; padding:30px 20px;">
                <h2 style="font-family:var(--rooh-font-serif); font-size:2rem; color:var(--rooh-dark); margin-bottom:10px;">${sec.title_ar || 'عنوان القسم'}</h2>
                ${sec.subtitle_ar ? `<p style="font-size:1.1rem; color:var(--rooh-muted); margin-bottom:16px;">${sec.subtitle_ar}</p>` : ''}
                ${sec.desc_ar ? `<p style="font-size:0.95rem; color:var(--rooh-muted); max-width:600px; margin:0 auto 16px; line-height:1.7;">${sec.desc_ar}</p>` : ''}
                ${sec.cta_text_ar ? `<button class="btn-rooh btn-rooh-primary">${sec.cta_text_ar}</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  getSectionLabel(sec) {
    if (sec.type === 'hero') return 'البانر الترحيبي الرئيسي (Hero)';
    if (sec.type === 'features') return 'مميزات روح الملكية (Features)';
    if (sec.type === 'story') return 'قصة ورؤية روح (About Us)';
    return sec.title_ar || 'قسم مخصص';
  }

  setActiveSection(idx) {
    this.activeSectionIndex = idx;
    this.render();
  }

  updateActiveProp(prop, value) {
    if (!this.sections[this.activeSectionIndex]) return;
    this.sections[this.activeSectionIndex][prop] = value;
    // Don't save to undo history on every single keypress, but update live preview
    const canvas = document.querySelector('.builder-canvas');
    if (canvas) this.render();
  }

  moveSection(idx, direction) {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= this.sections.length) return;
    const temp = this.sections[idx];
    this.sections[idx] = this.sections[targetIdx];
    this.sections[targetIdx] = temp;
    this.activeSectionIndex = targetIdx;
    this.saveStateToHistory();
    this.render();
  }

  deleteSection(idx) {
    if (confirm('هل أنت متأكد من حذف هذا القسم من الموقع؟')) {
      this.sections.splice(idx, 1);
      this.activeSectionIndex = Math.max(0, idx - 1);
      this.saveStateToHistory();
      this.render();
      window.RoohUtil.showToast('تم حذف القسم بنجاح', 'info');
    }
  }

  showAddSectionModal() {
    const title = prompt('اكتب عنوان القسم الجديد:');
    if (!title) return;
    this.sections.push({
      id: `sec_${Date.now()}`,
      type: 'custom',
      title_ar: title,
      subtitle_ar: 'وصف إضافي فاخر',
      cta_text_ar: 'اكتشفي المزيد',
      bg_color: '#FFFFFF',
      active: true
    });
    this.activeSectionIndex = this.sections.length - 1;
    this.saveStateToHistory();
    this.render();
    window.RoohUtil.showToast('تمت إضافة القسم الجديد بنجاح', 'success');
  }

  async publishLive() {
    await window.roohDB.saveBuilderSections(this.sections);
    window.RoohUtil.showToast('تم نشر التعديلات بنجاح وظهرت فوراً على الموقع المباشر!', 'success');
  }
}

window.roohBuilder = new RoohVisualBuilder();
