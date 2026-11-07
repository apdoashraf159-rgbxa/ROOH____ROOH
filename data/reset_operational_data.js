/**
 * ROOH Enterprise - Safe Operational Data Zeroing Engine
 * Resets all old test orders, transactions, customer records, and operational logs
 * while guaranteeing 100% preservation of Abdelrahman's master account,
 * product catalog, categories, site settings, and system configurations.
 */

const fs = require('fs');
const path = require('path');

function performZeroReset(options = { force: false }) {
  const dbFile = path.join(__dirname, 'rooh_db.json');
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  // 1. Mandatory Pre-Reset Backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `rooh_backup_before_zero_${timestamp}.json`);
  fs.copyFileSync(dbFile, backupPath);

  const originalSize = fs.statSync(dbFile).size;
  const backupSize = fs.statSync(backupPath).size;

  if (originalSize !== backupSize || backupSize === 0) {
    throw new Error('فشل التحقق من أمان النسخة الاحتياطية! تم إلغاء عملية التصفير فوراً.');
  }

  // 2. Read current database
  const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

  // 3. Clear Operational Data
  const statsBefore = {
    orders: db.orders ? db.orders.length : 0,
    customers: db.customers ? db.customers.length : 0,
    journal_entries: db.journal_entries ? db.journal_entries.length : 0,
    expenses: db.expenses ? db.expenses.length : 0,
    income_transactions: db.income_transactions ? db.income_transactions.length : 0,
    inventory_movements: db.inventory_movements ? db.inventory_movements.length : 0,
    purchases: db.purchases ? db.purchases.length : 0,
    complaints: db.complaints ? db.complaints.length : 0,
    reviews: db.reviews ? db.reviews.length : 0,
    customer_designs: db.customer_designs ? db.customer_designs.length : 0,
    audit_logs: db.audit_logs ? db.audit_logs.length : 0
  };

  db.orders = [];
  db.customers = [];
  db.journal_entries = [];
  db.expenses = [];
  db.income_transactions = [];
  db.inventory_movements = [];
  db.purchases = [];
  db.complaints = [];
  db.reviews = [];
  db.customer_designs = [];
  db.customer_users = [];

  // Reset chart of accounts operational balances
  if (Array.isArray(db.chart_of_accounts)) {
    db.chart_of_accounts.forEach(acc => {
      // Keep only initial asset/equity valuation or zero operational revenue/expenses
      if (acc.code.startsWith('4') || acc.code.startsWith('5') || acc.code.startsWith('6') || acc.code === '1100' || acc.code === '2010') {
        acc.balance = 0;
      }
      if (acc.code === '1010' || acc.code === '1020') {
        acc.balance = 0; // Vault starts fresh at 0
      }
    });
  }

  // Single inaugural audit entry
  db.audit_logs = [
    {
      timestamp: new Date().toISOString(),
      user: 'عبدالرحمن (المالك والمدير العام)',
      action: 'SYSTEM_ZERO_RESET',
      details: 'تم إجراء التصفير المنظم والآمن لكافة البيانات التشغيلية القديمة بنجاح، والبدء بسجل نظيف.'
    }
  ];

  // Save database
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');

  // Also sync seed.js
  const seedPath = path.join(__dirname, 'seed.js');
  const seedContent = '/**\n * ROOH Enterprise Ecosystem - Synchronized Seed Data\n */\nwindow.ROOH_SEED_DATA = ' + JSON.stringify(db, null, 2) + ';\n';
  fs.writeFileSync(seedPath, seedContent, 'utf8');

  return {
    success: true,
    backupFile: backupPath,
    statsBefore,
    message: 'تم تصفير كافة البيانات التشغيلية القديمة بنجاح والبدء من الصفر!'
  };
}

module.exports = { performZeroReset };

if (require.main === module) {
  try {
    const result = performZeroReset();
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error during zero reset:', err.message);
  }
}

