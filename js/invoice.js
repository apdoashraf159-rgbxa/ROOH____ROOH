/**
 * ROOH Documents, Invoices, and Export Engine
 * Generates luxury branded printable invoices, delivery notes, and CSV exports.
 */

window.RoohDocumentManager = {
  // Generate & Print Luxury Branded Customer Invoice
  printInvoice(order) {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة لطباعة الفاتورة.');
      return;
    }

    const itemsHtml = order.items.map((item, idx) => `
      <tr>
        <td style="padding:12px; border-bottom:1px solid #E8E2D8; text-align:center;">${idx + 1}</td>
        <td style="padding:12px; border-bottom:1px solid #E8E2D8;">
          <strong>${item.name}</strong>
          <div style="font-size:0.75rem; color:#6E685F;">كود المنتج: ${item.sku}</div>
          ${item.customization ? `
            <div style="font-size:0.75rem; color:#9E7D47; background:#FBF9F5; padding:4px 8px; border-radius:4px; margin-top:4px;">
              تركيبة مخصصة: ${item.customization.type} | الحجم: ${item.customization.size || ''} | المطبوع: "${item.customization.custom_label || ''}"
            </div>
          ` : ''}
        </td>
        <td style="padding:12px; border-bottom:1px solid #E8E2D8; text-align:center;">${item.qty}</td>
        <td style="padding:12px; border-bottom:1px solid #E8E2D8; text-align:center;">${item.unit_price} ج.م</td>
        <td style="padding:12px; border-bottom:1px solid #E8E2D8; text-align:left; font-weight:700;">${item.total_price} ج.م</td>
      </tr>
    `).join('');

    const invoiceHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>فاتورة ضريبية - ROOH #${order.order_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Playfair+Display:wght@700&display=swap');
          body {
            font-family: 'Cairo', sans-serif;
            color: #24211E;
            margin: 0;
            padding: 30px;
            background: #FFF;
          }
          .invoice-box {
            max-width: 800px;
            margin: auto;
            border: 1.5px solid #DDD4C5;
            padding: 30px;
            border-radius: 12px;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #BFA15F;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .brand-name {
            font-family: 'Playfair Display', serif;
            font-size: 2.2rem;
            color: #BFA15F;
            letter-spacing: 2px;
            margin: 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }
          .info-card {
            background: #FBF9F5;
            border: 1px solid #E8E2D8;
            padding: 14px;
            border-radius: 8px;
            font-size: 0.88rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background: #F4EEDF;
            color: #24211E;
            padding: 10px;
            font-size: 0.85rem;
            border-bottom: 2px solid #BFA15F;
          }
          .summary-table {
            width: 320px;
            margin-right: auto;
            font-size: 0.95rem;
          }
          .total-row {
            font-size: 1.25rem;
            font-weight: 800;
            color: #BFA15F;
            border-top: 2px solid #BFA15F;
          }
          .footer-note {
            text-align: center;
            font-size: 0.78rem;
            color: #6E685F;
            margin-top: 40px;
            border-top: 1px dashed #DDD4C5;
            padding-top: 16px;
          }
          @media print {
            body { padding: 0; }
            .invoice-box { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header-row">
            <div>
              <h1 class="brand-name">ROOH – روح</h1>
              <div style="font-size:0.85rem; color:#6E685F; margin-top:4px;">سوق روح للمستحضرات التجميل الطبيعية</div>
              <div style="font-size:0.8rem; color:#6E685F;">س.ت: CR-74892-CAIRO | ب.ض: EG-893-482-109</div>
            </div>
            <div style="text-align:left;">
              <h2 style="margin:0; font-size:1.4rem; color:#24211E;">فاتورة مبيعات</h2>
              <div style="font-weight:700; color:#BFA15F; font-size:1.1rem; margin-top:4px;">#${order.order_number}</div>
              <div style="font-size:0.85rem; color:#6E685F;">التاريخ: ${new Date(order.date).toLocaleDateString('ar-EG')}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <strong style="color:#BFA15F; display:block; margin-bottom:6px;">بيانات العميل:</strong>
              <div><strong>الاسم:</strong> ${order.customer.name}</div>
              <div><strong>الهاتف:</strong> ${order.customer.phone}</div>
              <div><strong>المحافظة:</strong> ${order.customer.governorate}</div>
              <div><strong>العنوان:</strong> ${order.customer.address}</div>
            </div>
            <div class="info-card">
              <strong style="color:#BFA15F; display:block; margin-bottom:6px;">تفاصيل السداد والشحن:</strong>
              <div><strong>طريقة الدفع:</strong> ${order.payment_method}</div>
              <div><strong>حالة الدفع:</strong> ${order.payment_status === 'Paid' ? 'تم السداد بنجاح (مدفوع)' : 'مستحق الدفع عند الاستلام'}</div>
              <div><strong>الرقم المرجعي:</strong> ${order.payment_reference || '-'}</div>
              <div><strong>المسؤول:</strong> عبدالرحمن (01227208589)</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:40px;">م</th>
                <th>المستحضر والمواصفات</th>
                <th style="width:60px;">الكمية</th>
                <th style="width:100px;">سعر الوحدة</th>
                <th style="width:110px; text-align:left;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <table class="summary-table">
            <tr>
              <td style="padding:6px 0;">المجموع الفرعي:</td>
              <td style="text-align:left; font-weight:600;">${order.subtotal} ج.م</td>
            </tr>
            <tr>
              <td style="padding:6px 0;">الخصم:</td>
              <td style="text-align:left; color:#C62828;">- ${order.discount || 0} ج.م</td>
            </tr>
            <tr>
              <td style="padding:6px 0;">مصاريف الشحن:</td>
              <td style="text-align:left; font-weight:600;">${order.shipping_fee} ج.م</td>
            </tr>
            <tr class="total-row">
              <td style="padding:10px 0;">المبلغ الإجمالي المستحق:</td>
              <td style="text-align:left;">${order.total_amount} ج.م</td>
            </tr>
          </table>

          <div class="footer-note">
            <div>شكراً لثقتكم في منتجات شركة روح (ROOH Cosmetics) الملكية.</div>
            <div>لأي استفسار أو شكوى يرجى الاتصال بإدارة خدمة العملاء مباشرة على: <strong>01227208589</strong></div>
            <div>التجمع الخامس، شارع التسعين الشمالي، القاهرة الجديدة، مصر.</div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  },

  // Export any array of objects into downloadable CSV file
  exportCSV(filename, rows) {
    if (!rows || !rows.length) {
      alert('لا توجد بيانات متاحة للتصدير حالياً.');
      return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      '\uFEFF' + // UTF-8 BOM for Arabic support in Excel
      keys.join(separator) +
      '\n' +
      rows.map(row => {
        return keys.map(k => {
          let cell = row[k] === null || row[k] === undefined ? '' : row[k];
          cell = cell instanceof Date
            ? cell.toLocaleString()
            : cell.toString().replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) {
            cell = `"${cell}"`;
          }
          return cell;
        }).join(separator);
      }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};
