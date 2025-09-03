const express = require('express');
const { query } = require('express-validator');
const db = require('../config/database');
const { verifyToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Sales reports
router.get('/sales', [
  verifyToken,
  requireManager,
  query('start_date').optional().isDate().withMessage('Invalid start date'),
  query('end_date').optional().isDate().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const { start_date, end_date, report_type = 'summary' } = req.query;

    let dateFilter = '';
    let queryParams = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(s.sale_date) BETWEEN ? AND ?';
      queryParams = [start_date, end_date];
    } else if (start_date) {
      dateFilter = 'WHERE DATE(s.sale_date) >= ?';
      queryParams = [start_date];
    } else if (end_date) {
      dateFilter = 'WHERE DATE(s.sale_date) <= ?';
      queryParams = [end_date];
    } else {
      // Default to today
      dateFilter = 'WHERE DATE(s.sale_date) = CURDATE()';
    }

    if (report_type === 'summary') {
      // Sales summary report
      const [summary] = await db.execute(`
        SELECT 
          COUNT(*) as total_sales,
          COALESCE(SUM(s.total_amount), 0) as total_revenue,
          COALESCE(SUM(s.tax_amount), 0) as total_tax,
          COALESCE(AVG(s.total_amount), 0) as average_sale,
          COALESCE(SUM(s.discount_amount), 0) as total_discount
        FROM sales s
        ${dateFilter}
      `, queryParams);

      // Payment method breakdown
      const [paymentBreakdown] = await db.execute(`
        SELECT 
          s.payment_method,
          COUNT(*) as count,
          SUM(s.total_amount) as amount
        FROM sales s
        ${dateFilter}
        GROUP BY s.payment_method
      `, queryParams);

      res.json({
        summary: summary[0],
        paymentBreakdown
      });

    } else if (report_type === 'detailed') {
      // Detailed sales report
      const [sales] = await db.execute(`
        SELECT 
          s.*,
          u.username as biller_name,
          COUNT(si.id) as items_count
        FROM sales s
        LEFT JOIN users u ON s.biller_id = u.id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        ${dateFilter}
        GROUP BY s.id
        ORDER BY s.sale_date DESC
      `, queryParams);

      res.json({ sales });
    }

  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Inventory reports
router.get('/inventory', [verifyToken, requireManager], async (req, res) => {
  try {
    const { report_type = 'current_stock' } = req.query;

    if (report_type === 'current_stock') {
      const [products] = await db.execute(`
        SELECT 
          p.*,
          c.name as category_name,
          CASE 
            WHEN p.stock_quantity <= p.min_stock_level THEN 'Low Stock'
            WHEN p.stock_quantity = 0 THEN 'Out of Stock'
            ELSE 'In Stock'
          END as stock_status
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active'
        ORDER BY p.stock_quantity ASC
      `);

      res.json({ products });

    } else if (report_type === 'low_stock') {
      const [lowStockProducts] = await db.execute(`
        SELECT 
          p.*,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.stock_quantity <= p.min_stock_level AND p.status = 'active'
        ORDER BY (p.stock_quantity / p.min_stock_level) ASC
      `);

      res.json({ lowStockProducts });

    } else if (report_type === 'stock_movement') {
      // Stock movement report
      const [movements] = await db.execute(`
        SELECT 
          'Sale' as type,
          si.product_id,
          p.name as product_name,
          -si.quantity as quantity_change,
          s.sale_date as date,
          CONCAT('Sale: ', s.invoice_no) as reference
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE DATE(s.sale_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        
        UNION ALL
        
        SELECT 
          'Stock Intake' as type,
          sint.product_id,
          p.name as product_name,
          sint.quantity_received as quantity_change,
          sint.received_date as date,
          CONCAT('Intake from: ', COALESCE(sint.supplier_name, 'Unknown')) as reference
        FROM stock_intake sint
        LEFT JOIN products p ON sint.product_id = p.id
        WHERE DATE(sint.received_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        
        ORDER BY date DESC
      `);

      res.json({ movements });
    }

  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Top selling products report
router.get('/top-products', [verifyToken, requireManager], async (req, res) => {
  try {
    const { start_date, end_date, limit = 10 } = req.query;

    let dateFilter = '';
    let queryParams = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(s.sale_date) BETWEEN ? AND ?';
      queryParams = [start_date, end_date];
    } else {
      // Default to last 30 days
      dateFilter = 'WHERE DATE(s.sale_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }

    queryParams.push(parseInt(limit));

    const [topProducts] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.brand,
        c.name as category_name,
        SUM(si.quantity) as total_quantity_sold,
        SUM(si.line_total) as total_revenue,
        COUNT(DISTINCT s.id) as times_sold,
        AVG(si.unit_price) as average_price
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN sales s ON si.sale_id = s.id
      ${dateFilter}
      GROUP BY p.id, p.name, p.brand, c.name
      ORDER BY total_quantity_sold DESC
      LIMIT ?
    `, queryParams);

    res.json({ topProducts });

  } catch (error) {
    console.error('Top products report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Financial summary report
router.get('/financial', [verifyToken, requireManager], async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    let queryParams = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(s.sale_date) BETWEEN ? AND ?';
      queryParams = [start_date, end_date];
    } else {
      // Default to current month
      dateFilter = 'WHERE MONTH(s.sale_date) = MONTH(CURDATE()) AND YEAR(s.sale_date) = YEAR(CURDATE())';
    }

    // Revenue summary
    const [revenue] = await db.execute(`
      SELECT 
        COALESCE(SUM(s.subtotal), 0) as gross_revenue,
        COALESCE(SUM(s.tax_amount), 0) as total_tax,
        COALESCE(SUM(s.discount_amount), 0) as total_discount,
        COALESCE(SUM(s.total_amount), 0) as net_revenue,
        COUNT(*) as total_transactions
      FROM sales s
      ${dateFilter}
    `, queryParams);

    // Daily revenue trend (last 30 days)
    const [dailyTrend] = await db.execute(`
      SELECT 
        DATE(s.sale_date) as date,
        COALESCE(SUM(s.total_amount), 0) as daily_revenue,
        COUNT(*) as daily_transactions
      FROM sales s
      WHERE DATE(s.sale_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(s.sale_date)
      ORDER BY date ASC
    `);

    res.json({
      summary: revenue[0],
      dailyTrend
    });

  } catch (error) {
    console.error('Financial report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Generic endpoint to support frontend report keys like /api/reports/daily-sales
router.get('/:reportId', [verifyToken, requireManager], async (req, res) => {
  try {
    const { reportId } = req.params;
    const { start_date, end_date, limit = 10 } = req.query;

    // Helper to build date filter similar to /sales
    const buildDateFilter = () => {
      let dateFilter = '';
      const params = [];
      if (start_date && end_date) {
        dateFilter = 'WHERE DATE(s.sale_date) BETWEEN ? AND ?';
        params.push(start_date, end_date);
      } else if (start_date) {
        dateFilter = 'WHERE DATE(s.sale_date) >= ?';
        params.push(start_date);
      } else if (end_date) {
        dateFilter = 'WHERE DATE(s.sale_date) <= ?';
        params.push(end_date);
      } else {
        dateFilter = 'WHERE DATE(s.sale_date) = CURDATE()';
      }
      return { dateFilter, params };
    };

    switch (reportId) {
      case 'daily-sales': {
        // Build date filter using helper so it respects start_date/end_date or defaults to today
        const { dateFilter, params } = buildDateFilter();

        // Aggregate quantity per product (grouped by category)
        const [rows] = await db.execute(
          `SELECT 
             c.name AS category,
             p.name AS product,
             COALESCE(p.unit_price, 0) AS unit_price,
             SUM(si.quantity) AS quantity,
             ROUND(SUM(si.quantity) * COALESCE(p.unit_price, 0), 2) AS total_amount
           FROM sale_items si
           JOIN sales s ON si.sale_id = s.id
           JOIN products p ON si.product_id = p.id
           LEFT JOIN categories c ON p.category_id = c.id
           ${dateFilter}
           GROUP BY c.id, p.id
           ORDER BY c.name, p.name
          `,
          params
        );

        // Totals for the range
        const [totalsRes] = await db.execute(
          `SELECT 
             COALESCE(SUM(si.quantity), 0) AS total_quantity,
             ROUND(COALESCE(SUM(si.quantity * COALESCE(p.unit_price,0)), 0), 2) AS total_amount
           FROM sale_items si
           JOIN sales s ON si.sale_id = s.id
           JOIN products p ON si.product_id = p.id
           ${dateFilter}
          `,
          params
        );

        const totals = totalsRes[0] || { total_quantity: 0, total_amount: 0 };

        return res.json({ message: 'Daily sales report (category-wise)', data: { range: { start_date: req.query.start_date, end_date: req.query.end_date }, rows, totals } });
      }

      case 'current-stock': {
        const [products] = await db.execute(`
          SELECT p.*, c.name as category_name,
            CASE WHEN p.stock_quantity <= p.min_stock_level THEN 'Low Stock' WHEN p.stock_quantity = 0 THEN 'Out of Stock' ELSE 'In Stock' END as stock_status
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.status = 'active'
          ORDER BY p.stock_quantity ASC
        `);

        return res.json({ message: 'Current stock report', data: { products } });
      }

      case 'revenue-summary': {
        const { dateFilter, params } = buildDateFilter();

        const [revenue] = await db.execute(
          `SELECT COALESCE(SUM(s.subtotal), 0) as gross_revenue, COALESCE(SUM(s.tax_amount), 0) as total_tax, COALESCE(SUM(s.discount_amount),0) as total_discount, COALESCE(SUM(s.total_amount),0) as net_revenue, COUNT(*) as total_transactions FROM sales s ${dateFilter}`,
          params
        );

        const [dailyTrend] = await db.execute(`
          SELECT DATE(s.sale_date) as date, COALESCE(SUM(s.total_amount),0) as daily_revenue, COUNT(*) as daily_transactions
          FROM sales s
          WHERE DATE(s.sale_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          GROUP BY DATE(s.sale_date)
          ORDER BY date ASC
        `);

        return res.json({ message: 'Revenue summary', data: { summary: revenue[0], dailyTrend } });
      }

      case 'top-products': {
        const paramsArr = [];
        let dateFilter = '';
        if (start_date && end_date) {
          dateFilter = 'WHERE DATE(s.sale_date) BETWEEN ? AND ?';
          paramsArr.push(start_date, end_date);
        } else {
          dateFilter = 'WHERE DATE(s.sale_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        }
        paramsArr.push(parseInt(limit));

        const [topProducts] = await db.execute(`
          SELECT p.id, p.name, p.brand, c.name as category_name, SUM(si.quantity) as total_quantity_sold, SUM(si.line_total) as total_revenue, COUNT(DISTINCT s.id) as times_sold, AVG(si.unit_price) as average_price
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN sales s ON si.sale_id = s.id
          ${dateFilter}
          GROUP BY p.id, p.name, p.brand, c.name
          ORDER BY total_quantity_sold DESC
          LIMIT ?
        `, paramsArr);

        return res.json({ message: 'Top products', data: { topProducts } });
      }

      default:
        return res.status(404).json({ message: 'Report not found' });
    }
  } catch (error) {
    console.error('Report generic handler error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
