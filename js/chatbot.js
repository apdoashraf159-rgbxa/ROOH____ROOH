/**
 * ROOH AI Customer Service Chatbot (روح - المساعد الذكي)
 * Intelligent bilingual AI assistant with order tracking, skin consultation, and direct owner escalation.
 */

class RoohChatbot {
  constructor() {
    this.isOpen = false;
    this.messages = [];
  }

  init() {
    this.render();
    this.appendBotMessage(
      `أهلاً بكِ في **روح (ROOH)** – لمستحضرات التجميل الملكية الطبيعية 🌸\nأنا **روح** مساعدتكِ الذكية، يسعدني تقديم المشورة لاختيار أفضل المنتجات، مساعدتكِ في ابتكار تركيبتكِ الخاصة، أو تتبع شحنتك فوراً!`
    );
  }

  render() {
    const existing = document.getElementById('aiChatWidget');
    if (existing) existing.remove();

    const widget = document.createElement('div');
    widget.id = 'aiChatWidget';
    widget.className = 'ai-chatbot-widget';
    widget.innerHTML = `
      <div class="ai-pulse-ring"></div>
      <button class="ai-chatbot-btn" id="aiChatToggleBtn" title="المساعد الذكي - روح">
        <span>💬</span>
      </button>

      <div class="ai-chat-window" id="aiChatWindow">
        <div class="ai-chat-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="ai-avatar">ر</div>
            <div>
              <h4 style="font-size:0.95rem; font-weight:700; margin:0;">روح - المساعد الذكي</h4>
              <span style="font-size:0.7rem; color:#DDD4C5;">● متصل الآن لمساعدتك</span>
            </div>
          </div>
          <button id="aiChatCloseBtn" style="color:#FFF; font-size:1.4rem; padding:4px;">&times;</button>
        </div>

        <div class="ai-chat-body" id="aiChatBody">
          <!-- Dynamic Messages -->
        </div>

        <div style="padding:8px 12px; background:var(--rooh-sand-light); border-top:1px solid var(--rooh-border); overflow-x:auto; white-space:nowrap; display:flex; gap:8px;">
          <button class="subnav-link" style="font-size:0.75rem; padding:4px 10px;" onclick="window.roohChatbot.sendQuick('روتين نضارة البشرة')">✨ روتين النضارة</button>
          <button class="subnav-link" style="font-size:0.75rem; padding:4px 10px;" onclick="window.roohChatbot.sendQuick('تفصيل منتج مخصص')">🔬 اصنع منتجك</button>
          <button class="subnav-link" style="font-size:0.75rem; padding:4px 10px;" onclick="window.roohChatbot.sendQuick('أسعار الشحن للمحافظات')">🚚 أسعار الشحن</button>
          <button class="subnav-link" style="font-size:0.75rem; padding:4px 10px;" onclick="window.roohChatbot.sendQuick('طرق الدفع وإنستاباي')">💳 طرق الدفع</button>
          <button class="subnav-link" style="font-size:0.75rem; padding:4px 10px;" onclick="window.roohChatbot.sendQuick('تتبع الطلب')">📦 تتبع الطلب</button>
          <button class="subnav-link" style="font-size:0.75rem; padding:4px 10px;" onclick="window.roohChatbot.sendQuick('التحدث مع الأستاذ عبدالرحمن')">📞 تواصل مع المالك</button>
        </div>

        <form class="ai-chat-input-row" id="aiChatForm" onsubmit="window.roohChatbot.handleSubmit(event)">
          <input type="text" id="aiChatInput" class="ai-chat-input" placeholder="اكتبي استفسارك هنا..." autocomplete="off" />
          <button type="submit" class="btn-rooh btn-rooh-primary" style="padding:8px 16px; border-radius:50px; font-size:0.85rem;">
            <span>إرسال</span>
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(widget);

    document.getElementById('aiChatToggleBtn').onclick = () => this.toggleWindow();
    document.getElementById('aiChatCloseBtn').onclick = () => this.toggleWindow(false);
  }

  toggleWindow(force) {
    this.isOpen = force !== undefined ? force : !this.isOpen;
    const win = document.getElementById('aiChatWindow');
    if (win) {
      if (this.isOpen) {
        win.classList.add('open');
        document.getElementById('aiChatInput')?.focus();
      } else {
        win.classList.remove('open');
      }
    }
  }

  appendBotMessage(text, extraHtml = '') {
    const body = document.getElementById('aiChatBody');
    if (!body) return;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bubble-bot';
    bubble.innerHTML = `<div>${text.replace(/\n/g, '<br>')}</div>${extraHtml}`;
    body.appendChild(bubble);
    body.scrollTop = body.scrollHeight;
  }

  appendUserMessage(text) {
    const body = document.getElementById('aiChatBody');
    if (!body) return;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bubble-user';
    bubble.textContent = text;
    body.appendChild(bubble);
    body.scrollTop = body.scrollHeight;
  }

  async sendQuick(text) {
    this.appendUserMessage(text);
    await this.processMessage(text);
  }

  async handleSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('aiChatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    this.appendUserMessage(text);
    await this.processMessage(text);
  }

  async processMessage(userText) {
    // Show typing indicator
    const body = document.getElementById('aiChatBody');
    const typing = document.createElement('div');
    typing.className = 'chat-bubble bubble-bot';
    typing.id = 'typingBubble';
    typing.textContent = 'روح تكتب الآن...';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    // Direct check for order tracking number in text (e.g. 1001 or 1002)
    const orderMatch = userText.match(/\b(100\d)\b/);
    if (orderMatch) {
      const orderNum = orderMatch[1];
      const orders = await window.roohDB.getOrders();
      const found = orders.find(o => o.order_number === orderNum || o.id.includes(orderNum));
      typing.remove();

      if (found) {
        const lastTimeline = found.timeline[found.timeline.length - 1];
        const statusAr = {
          'New': 'طلب جديد',
          'Confirmed': 'تم تأكيد الطلب',
          'Processing': 'قيد التجهيز والتغليف',
          'Ready for shipping': 'جاهز لتسليم شركة الشحن',
          'Shipped': 'تم الشحن وهو في الطريق إليك',
          'Delivered': 'تم التوصيل بنجاح'
        }[found.order_status] || found.order_status;

        this.appendBotMessage(
          `✅ **بيانات الطلب رقم #${found.order_number}:**\n• اسم العميل: ${found.customer.name}\n• الحالة الحالية: **${statusAr}**\n• التوصيل إلى: ${found.customer.governorate} (${found.customer.address})\n• إجمالي المبلغ: ${found.total_amount} ج.م (${found.payment_method} - ${found.payment_status === 'Paid' ? 'مدفوع' : 'دفع عند الاستلام'})\n• آخر تحديث: ${lastTimeline?.note || ''}`
        );
        return;
      }
    }

    try {
      const response = await window.roohDB.sendAIChat(userText);
      typing.remove();

      let extraHtml = '';
      if (userText.includes('عبدالرحمن') || userText.includes('مالك') || userText.includes('تواصل')) {
        extraHtml = `
          <div style="margin-top:10px; display:flex; gap:8px;">
            <a href="https://wa.me/201227208589" target="_blank" class="btn-rooh btn-rooh-primary btn-rooh-sm" style="font-size:0.75rem; background:#25D366; box-shadow:none;">
              <span>واتساب الأستاذ عبدالرحمن</span>
            </a>
            <a href="tel:01227208589" class="btn-rooh btn-rooh-outline btn-rooh-sm" style="font-size:0.75rem;">
              <span>اتصال هاتفي</span>
            </a>
          </div>
        `;
      }

      this.appendBotMessage(response.reply, extraHtml);
    } catch (err) {
      typing.remove();
      this.appendBotMessage('عذراً، حدث خطأ مؤقت في الاتصال. يمكنك دائماً التواصل هاتفياً أو واتساب على 01227208589.');
    }
  }
}

window.roohChatbot = new RoohChatbot();
