const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory users for testing (when MySQL is not available)
const testUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@liquorpos.com',
    password: '$2a$10$ko6MtDtRhju6/doxJE8mg.VqGQF7iWvtygcLw6nTxVj38/Uxrhuyu', // admin123
    role: 'admin',
    status: 'active'
  },
  {
    id: 2,
    username: 'manager',
    email: 'manager@liquorpos.com',
    password: '$2a$10$ko6MtDtRhju6/doxJE8mg.VqGQF7iWvtygcLw6nTxVj38/Uxrhuyu', // manager123 (for now, same hash)
    role: 'manager',
    status: 'active'
  },
  {
    id: 3,
    username: 'biller',
    email: 'biller@liquorpos.com',
    password: '$2a$10$ko6MtDtRhju6/doxJE8mg.VqGQF7iWvtygcLw6nTxVj38/Uxrhuyu', // biller123 (for now, same hash)
    role: 'biller',
    status: 'active'
  },
  {
    id: 4,
    username: 'reconciler',
    email: 'reconciler@liquorpos.com',
    password: '$2a$10$ko6MtDtRhju6/doxJE8mg.VqGQF7iWvtygcLw6nTxVj38/Uxrhuyu', // reconciler123 (for now, same hash)
    role: 'stock_reconciler',
    status: 'active'
  }
];

// In-memory categories data
const categories = [
  { id: 1, name: 'Whiskey', description: 'Premium whiskeys and bourbons', status: 'active' },
  { id: 2, name: 'Vodka', description: 'Premium and standard vodkas', status: 'active' },
  { id: 3, name: 'Rum', description: 'Light, dark, and spiced rums', status: 'active' },
  { id: 4, name: 'Gin', description: 'Classic and flavored gins', status: 'active' },
  { id: 5, name: 'Tequila', description: 'Blanco, reposado, and añejo tequilas', status: 'active' },
  { id: 6, name: 'Brandy', description: 'Cognac and other brandies', status: 'active' },
  { id: 7, name: 'Beer', description: 'Domestic and imported beers', status: 'active' },
  { id: 8, name: 'Wine', description: 'Red, white, and sparkling wines', status: 'active' },
  { id: 9, name: 'Liqueurs', description: 'Flavored spirits and liqueurs', status: 'active' },
  { id: 10, name: 'Mixers', description: 'Non-alcoholic mixers and sodas', status: 'active' }
];

// In-memory sales history to track transactions
let salesHistory = [];

// In-memory products data with various volumes
const products = [
  // Whiskey Category (8 products)
  { id: 1, name: 'Royal Stag Reserve', category_id: 1, barcode: '8901234500011', volume: '750ml', alcohol_content: 42.0, price: 950, cost: 650, stock_quantity: 50, min_stock_level: 10, status: 'active' },
  { id: 2, name: 'Royal Stag Reserve', category_id: 1, barcode: '8901234500028', volume: '1L', alcohol_content: 42.0, price: 1200, cost: 820, stock_quantity: 30, min_stock_level: 8, status: 'active' },
  { id: 3, name: "McDowell's No.1", category_id: 1, barcode: '8901234500035', volume: '750ml', alcohol_content: 42.8, price: 850, cost: 600, stock_quantity: 60, min_stock_level: 12, status: 'active' },
  { id: 4, name: "McDowell's No.1", category_id: 1, barcode: '8901234500042', volume: '1L', alcohol_content: 42.8, price: 1100, cost: 780, stock_quantity: 40, min_stock_level: 10, status: 'active' },
  { id: 5, name: 'Johnnie Walker Red Label (Imported)', category_id: 1, barcode: '8901234500059', volume: '750ml', alcohol_content: 40.0, price: 1500, cost: 1100, stock_quantity: 35, min_stock_level: 8, status: 'active' },
  { id: 6, name: 'Johnnie Walker Black Label (Imported)', category_id: 1, barcode: '8901234500066', volume: '750ml', alcohol_content: 40.0, price: 3500, cost: 2500, stock_quantity: 20, min_stock_level: 6, status: 'active' },
  { id: 7, name: 'Amrut Fusion Single Malt', category_id: 1, barcode: '8901234500073', volume: '750ml', alcohol_content: 50.0, price: 9000, cost: 6500, stock_quantity: 10, min_stock_level: 2, status: 'active' },
  { id: 8, name: 'Paul John Brilliance', category_id: 1, barcode: '8901234500080', volume: '750ml', alcohol_content: 46.0, price: 7000, cost: 5000, stock_quantity: 8, min_stock_level: 2, status: 'active' },

  // Vodka Category (8 products)
  { id: 9, name: 'Magic Moments Vodka', category_id: 2, barcode: '8901234500097', volume: '750ml', alcohol_content: 42.8, price: 1200, cost: 820, stock_quantity: 45, min_stock_level: 10, status: 'active' },
  { id: 10, name: 'Magic Moments Vodka', category_id: 2, barcode: '8901234500103', volume: '1L', alcohol_content: 42.8, price: 1600, cost: 1100, stock_quantity: 28, min_stock_level: 8, status: 'active' },
  { id: 11, name: 'Romanov Vodka', category_id: 2, barcode: '8901234500110', volume: '750ml', alcohol_content: 40.0, price: 800, cost: 580, stock_quantity: 60, min_stock_level: 12, status: 'active' },
  { id: 12, name: 'Romanov Vodka', category_id: 2, barcode: '8901234500127', volume: '1L', alcohol_content: 40.0, price: 1100, cost: 800, stock_quantity: 35, min_stock_level: 10, status: 'active' },
  { id: 13, name: 'Smirnoff Red (Imported)', category_id: 2, barcode: '8901234500134', volume: '750ml', alcohol_content: 37.5, price: 1500, cost: 1100, stock_quantity: 30, min_stock_level: 8, status: 'active' },
  { id: 14, name: 'White Mischief Vodka', category_id: 2, barcode: '8901234500141', volume: '750ml', alcohol_content: 42.8, price: 900, cost: 650, stock_quantity: 55, min_stock_level: 15, status: 'active' },
  { id: 15, name: 'White Mischief Vodka', category_id: 2, barcode: '8901234500158', volume: '375ml', alcohol_content: 42.8, price: 500, cost: 350, stock_quantity: 80, min_stock_level: 20, status: 'active' },
  { id: 16, name: 'Absolut Vodka (Imported)', category_id: 2, barcode: '8901234500165', volume: '750ml', alcohol_content: 40.0, price: 3000, cost: 2200, stock_quantity: 18, min_stock_level: 6, status: 'active' },

  // Rum Category (8 products)
  { id: 17, name: 'Old Monk Supreme', category_id: 3, barcode: '8901234500172', volume: '750ml', alcohol_content: 42.8, price: 850, cost: 580, stock_quantity: 90, min_stock_level: 20, status: 'active' },
  { id: 18, name: 'Old Monk Supreme', category_id: 3, barcode: '8901234500189', volume: '1L', alcohol_content: 42.8, price: 1100, cost: 760, stock_quantity: 60, min_stock_level: 15, status: 'active' },
  { id: 19, name: 'McDowell\'s No.1 Celebration Rum', category_id: 3, barcode: '8901234500196', volume: '750ml', alcohol_content: 42.8, price: 900, cost: 620, stock_quantity: 70, min_stock_level: 18, status: 'active' },
  { id: 20, name: 'Bacardi Superior (Imported)', category_id: 3, barcode: '8901234500202', volume: '750ml', alcohol_content: 40.0, price: 2200, cost: 1600, stock_quantity: 35, min_stock_level: 8, status: 'active' },
  { id: 21, name: 'Bacardi Carta Blanca (Imported)', category_id: 3, barcode: '8901234500219', volume: '1L', alcohol_content: 40.0, price: 3000, cost: 2200, stock_quantity: 20, min_stock_level: 6, status: 'active' },
  { id: 22, name: 'Captain Morgan Spiced (Imported)', category_id: 3, barcode: '8901234500226', volume: '750ml', alcohol_content: 35.0, price: 1600, cost: 1150, stock_quantity: 40, min_stock_level: 10, status: 'active' },
  { id: 23, name: 'Old Port Rum (Local)', category_id: 3, barcode: '8901234500233', volume: '750ml', alcohol_content: 42.0, price: 950, cost: 680, stock_quantity: 50, min_stock_level: 12, status: 'active' },
  { id: 24, name: 'Diplomatico Reserva (Imported)', category_id: 3, barcode: '8901234500240', volume: '750ml', alcohol_content: 40.0, price: 6000, cost: 4500, stock_quantity: 10, min_stock_level: 3, status: 'active' },

  // Gin Category (8 products)
  { id: 25, name: 'Stranger & Sons Gin', category_id: 4, barcode: '8901234500257', volume: '750ml', alcohol_content: 45.0, price: 2400, cost: 1700, stock_quantity: 28, min_stock_level: 8, status: 'active' },
  { id: 26, name: 'Greater Than Wonder Mint Gin', category_id: 4, barcode: '8901234500264', volume: '750ml', alcohol_content: 43.0, price: 1800, cost: 1250, stock_quantity: 30, min_stock_level: 8, status: 'active' },
  { id: 27, name: 'Bombay Sapphire (Imported)', category_id: 4, barcode: '8901234500271', volume: '750ml', alcohol_content: 40.0, price: 3200, cost: 2300, stock_quantity: 20, min_stock_level: 6, status: 'active' },
  { id: 28, name: "Gordon's London Dry (Imported)", category_id: 4, barcode: '8901234500288', volume: '750ml', alcohol_content: 37.5, price: 1800, cost: 1300, stock_quantity: 40, min_stock_level: 10, status: 'active' },
  { id: 29, name: 'Stranger & Sons Gin', category_id: 4, barcode: '8901234500295', volume: '1L', alcohol_content: 45.0, price: 3200, cost: 2250, stock_quantity: 12, min_stock_level: 4, status: 'active' },
  { id: 30, name: 'Greater Than Gin', category_id: 4, barcode: '8901234500301', volume: '1L', alcohol_content: 43.0, price: 2300, cost: 1600, stock_quantity: 10, min_stock_level: 4, status: 'active' },
  { id: 31, name: 'Tonic & Botanical Gin (Local Craft)', category_id: 4, barcode: '8901234500318', volume: '750ml', alcohol_content: 42.0, price: 2000, cost: 1400, stock_quantity: 16, min_stock_level: 5, status: 'active' },
  { id: 32, name: 'The Botanist (Imported)', category_id: 4, barcode: '8901234500325', volume: '750ml', alcohol_content: 46.0, price: 3800, cost: 2700, stock_quantity: 8, min_stock_level: 2, status: 'active' },

  // Tequila Category (8 products - mostly imported available in India)
  { id: 33, name: 'Jose Cuervo Especial (Imported)', category_id: 5, barcode: '8901234500332', volume: '750ml', alcohol_content: 40.0, price: 3500, cost: 2500, stock_quantity: 20, min_stock_level: 5, status: 'active' },
  { id: 34, name: 'Olmeca Altos (Imported)', category_id: 5, barcode: '8901234500349', volume: '750ml', alcohol_content: 40.0, price: 3200, cost: 2300, stock_quantity: 18, min_stock_level: 5, status: 'active' },
  { id: 35, name: 'Don Julio Blanco (Imported)', category_id: 5, barcode: '8901234500356', volume: '750ml', alcohol_content: 40.0, price: 9000, cost: 6500, stock_quantity: 6, min_stock_level: 2, status: 'active' },
  { id: 36, name: 'Patrón Silver (Imported)', category_id: 5, barcode: '8901234500363', volume: '750ml', alcohol_content: 40.0, price: 12000, cost: 8500, stock_quantity: 4, min_stock_level: 1, status: 'active' },
  { id: 37, name: 'Casamigos Blanco (Imported)', category_id: 5, barcode: '8901234500370', volume: '750ml', alcohol_content: 40.0, price: 9500, cost: 6800, stock_quantity: 6, min_stock_level: 2, status: 'active' },
  { id: 38, name: 'Espolòn Blanco (Imported)', category_id: 5, barcode: '8901234500387', volume: '750ml', alcohol_content: 40.0, price: 4000, cost: 2900, stock_quantity: 12, min_stock_level: 4, status: 'active' },
  { id: 39, name: 'El Jimador Reposado (Imported)', category_id: 5, barcode: '8901234500394', volume: '750ml', alcohol_content: 38.0, price: 3200, cost: 2300, stock_quantity: 10, min_stock_level: 3, status: 'active' },
  { id: 40, name: 'Sauza Silver (Imported)', category_id: 5, barcode: '8901234500400', volume: '750ml', alcohol_content: 40.0, price: 2800, cost: 2000, stock_quantity: 22, min_stock_level: 6, status: 'active' },

  // Brandy Category (8 products)
  { id: 41, name: "McDowell's No.1 Brandy", category_id: 6, barcode: '8901234500417', volume: '750ml', alcohol_content: 42.8, price: 700, cost: 480, stock_quantity: 80, min_stock_level: 20, status: 'active' },
  { id: 42, name: "McDowell's No.1 Brandy", category_id: 6, barcode: '8901234500424', volume: '1L', alcohol_content: 42.8, price: 950, cost: 680, stock_quantity: 50, min_stock_level: 12, status: 'active' },
  { id: 43, name: 'Mansion House Brandy', category_id: 6, barcode: '8901234500431', volume: '750ml', alcohol_content: 42.0, price: 750, cost: 520, stock_quantity: 60, min_stock_level: 15, status: 'active' },
  { id: 44, name: 'Hennessy VS (Imported)', category_id: 6, barcode: '8901234500448', volume: '750ml', alcohol_content: 40.0, price: 12000, cost: 8500, stock_quantity: 6, min_stock_level: 2, status: 'active' },
  { id: 45, name: 'Remy Martin VSOP (Imported)', category_id: 6, barcode: '8901234500455', volume: '750ml', alcohol_content: 40.0, price: 15000, cost: 10500, stock_quantity: 4, min_stock_level: 1, status: 'active' },
  { id: 46, name: 'E&J Brandy (Imported)', category_id: 6, barcode: '8901234500462', volume: '750ml', alcohol_content: 40.0, price: 1200, cost: 850, stock_quantity: 40, min_stock_level: 8, status: 'active' },
  { id: 47, name: 'Christian Brothers Brandy', category_id: 6, barcode: '8901234500479', volume: '750ml', alcohol_content: 40.0, price: 1400, cost: 980, stock_quantity: 30, min_stock_level: 8, status: 'active' },
  { id: 48, name: 'Torres 10 Brandy (Imported)', category_id: 6, barcode: '8901234500486', volume: '750ml', alcohol_content: 38.0, price: 4500, cost: 3300, stock_quantity: 10, min_stock_level: 3, status: 'active' },

  // Beer Category (8 products with various sizes)
  { id: 49, name: 'Kingfisher Premium', category_id: 7, barcode: '8901234500493', volume: '330ml Bottle', alcohol_content: 4.8, price: 120, cost: 75, stock_quantity: 240, min_stock_level: 60, status: 'active' },
  { id: 50, name: 'Kingfisher Strong', category_id: 7, barcode: '8901234500509', volume: '650ml Bottle', alcohol_content: 8.0, price: 220, cost: 160, stock_quantity: 160, min_stock_level: 40, status: 'active' },
  { id: 51, name: 'Heineken (Imported)', category_id: 7, barcode: '8901234500516', volume: '330ml Bottle', alcohol_content: 5.0, price: 220, cost: 165, stock_quantity: 120, min_stock_level: 30, status: 'active' },
  { id: 52, name: 'Budweiser (Imported)', category_id: 7, barcode: '8901234500523', volume: '330ml Bottle', alcohol_content: 4.5, price: 200, cost: 150, stock_quantity: 100, min_stock_level: 25, status: 'active' },
  { id: 53, name: 'Corona Extra (Imported)', category_id: 7, barcode: '8901234500530', volume: '330ml Bottle', alcohol_content: 4.6, price: 250, cost: 185, stock_quantity: 80, min_stock_level: 20, status: 'active' },
  { id: 54, name: 'Kingfisher 6-Pack', category_id: 7, barcode: '8901234500547', volume: '6x330ml', alcohol_content: 4.8, price: 700, cost: 520, stock_quantity: 40, min_stock_level: 10, status: 'active' },
  { id: 55, name: 'Bira 91 White', category_id: 7, barcode: '8901234500554', volume: '330ml Bottle', alcohol_content: 5.0, price: 210, cost: 155, stock_quantity: 90, min_stock_level: 22, status: 'active' },
  { id: 56, name: 'Bira 91 Blonde', category_id: 7, barcode: '8901234500561', volume: '330ml Bottle', alcohol_content: 4.9, price: 200, cost: 150, stock_quantity: 80, min_stock_level: 20, status: 'active' },

  // Wine Category (8 products)
  { id: 57, name: 'Sula Rasa Shiraz', category_id: 8, barcode: '8901234500578', volume: '750ml', alcohol_content: 13.5, price: 1500, cost: 1050, stock_quantity: 40, min_stock_level: 10, status: 'active' },
  { id: 58, name: 'Sula Sauvignon Blanc', category_id: 8, barcode: '8901234500585', volume: '750ml', alcohol_content: 12.5, price: 1200, cost: 840, stock_quantity: 50, min_stock_level: 12, status: 'active' },
  { id: 59, name: 'Grover La Réserve', category_id: 8, barcode: '8901234500592', volume: '750ml', alcohol_content: 14.0, price: 2200, cost: 1540, stock_quantity: 20, min_stock_level: 6, status: 'active' },
  { id: 60, name: 'Fratelli Sette (Imported)', category_id: 8, barcode: '8901234500608', volume: '750ml', alcohol_content: 13.5, price: 1600, cost: 1120, stock_quantity: 30, min_stock_level: 8, status: 'active' },
  { id: 61, name: "Jacob's Creek (Imported)", category_id: 8, barcode: '8901234500615', volume: '750ml', alcohol_content: 13.5, price: 1800, cost: 1260, stock_quantity: 25, min_stock_level: 6, status: 'active' },
  { id: 62, name: 'Zampa Soirée Chenin Blanc', category_id: 8, barcode: '8901234500622', volume: '750ml', alcohol_content: 12.0, price: 950, cost: 650, stock_quantity: 60, min_stock_level: 18, status: 'active' },
  { id: 63, name: 'Chandon Brut', category_id: 8, barcode: '8901234500639', volume: '750ml', alcohol_content: 12.0, price: 3500, cost: 2450, stock_quantity: 12, min_stock_level: 4, status: 'active' },
  { id: 64, name: 'Grover Art Collection (Imported)', category_id: 8, barcode: '8901234500646', volume: '750ml', alcohol_content: 14.5, price: 3200, cost: 2250, stock_quantity: 10, min_stock_level: 3, status: 'active' },

  // Liqueurs Category (8 products)
  { id: 65, name: "Bailey's Irish Cream (Imported)", category_id: 9, barcode: '8901234500653', volume: '750ml', alcohol_content: 17.0, price: 3200, cost: 2300, stock_quantity: 20, min_stock_level: 6, status: 'active' },
  { id: 66, name: 'Kahlúa Coffee Liqueur (Imported)', category_id: 9, barcode: '8901234500660', volume: '750ml', alcohol_content: 20.0, price: 3000, cost: 2100, stock_quantity: 18, min_stock_level: 6, status: 'active' },
  { id: 67, name: 'Disaronno Amaretto (Imported)', category_id: 9, barcode: '8901234500677', volume: '750ml', alcohol_content: 28.0, price: 3800, cost: 2700, stock_quantity: 15, min_stock_level: 4, status: 'active' },
  { id: 68, name: 'Cointreau (Imported)', category_id: 9, barcode: '8901234500684', volume: '750ml', alcohol_content: 40.0, price: 3500, cost: 2500, stock_quantity: 12, min_stock_level: 4, status: 'active' },
  { id: 69, name: 'Aperol (Imported)', category_id: 9, barcode: '8901234500691', volume: '750ml', alcohol_content: 11.0, price: 2500, cost: 1750, stock_quantity: 14, min_stock_level: 4, status: 'active' },
  { id: 70, name: 'Tia Maria (Imported)', category_id: 9, barcode: '8901234500707', volume: '750ml', alcohol_content: 20.0, price: 2800, cost: 1950, stock_quantity: 12, min_stock_level: 4, status: 'active' },
  { id: 71, name: 'Southern Comfort (Imported)', category_id: 9, barcode: '8901234500714', volume: '750ml', alcohol_content: 35.0, price: 2200, cost: 1600, stock_quantity: 18, min_stock_level: 6, status: 'active' },
  { id: 72, name: 'Grand Marnier (Imported)', category_id: 9, barcode: '8901234500721', volume: '750ml', alcohol_content: 40.0, price: 4200, cost: 3000, stock_quantity: 8, min_stock_level: 2, status: 'active' },

  // Mixers Category (8 products)
  { id: 73, name: 'Coca-Cola Classic (Can)', category_id: 10, barcode: '8901234500738', volume: '330ml Can', alcohol_content: 0.0, price: 40, cost: 20, stock_quantity: 200, min_stock_level: 50, status: 'active' },
  { id: 74, name: 'Tonic Water', category_id: 10, barcode: '8901234500745', volume: '200ml Bottle', alcohol_content: 0.0, price: 60, cost: 35, stock_quantity: 150, min_stock_level: 40, status: 'active' },
  { id: 75, name: 'Club Soda', category_id: 10, barcode: '8901234500752', volume: '200ml Bottle', alcohol_content: 0.0, price: 50, cost: 30, stock_quantity: 160, min_stock_level: 40, status: 'active' },
  { id: 76, name: 'Ginger Beer', category_id: 10, barcode: '8901234500769', volume: '300ml Bottle', alcohol_content: 0.0, price: 90, cost: 60, stock_quantity: 120, min_stock_level: 30, status: 'active' },
  { id: 77, name: 'Orange Juice (Fresh)', category_id: 10, barcode: '8901234500776', volume: '1L Bottle', alcohol_content: 0.0, price: 150, cost: 100, stock_quantity: 60, min_stock_level: 15, status: 'active' },
  { id: 78, name: 'Cranberry Juice', category_id: 10, barcode: '8901234500783', volume: '1L Bottle', alcohol_content: 0.0, price: 180, cost: 120, stock_quantity: 50, min_stock_level: 12, status: 'active' },
  { id: 79, name: 'Lime Juice', category_id: 10, barcode: '8901234500790', volume: '200ml Bottle', alcohol_content: 0.0, price: 120, cost: 80, stock_quantity: 90, min_stock_level: 20, status: 'active' },
  { id: 80, name: 'Simple Syrup', category_id: 10, barcode: '8901234500806', volume: '250ml Bottle', alcohol_content: 0.0, price: 180, cost: 120, stock_quantity: 40, min_stock_level: 10, status: 'active' }
];

// Login endpoint for testing
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt:', { username });

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find user in testUsers array
    const user = testUsers.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // For demo purposes, accept any password (manager123, biller123, reconciler123)
    // In production, you would hash these properly
    const validPasswords = ['admin123', 'manager123', 'biller123', 'reconciler123'];
    
    if (!validPasswords.includes(password)) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      'fallback_secret',
      { expiresIn: '8h' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    console.log('Login successful for user:', username, 'with role:', user.role);

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user profile
app.get('/api/auth/profile', (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!authHeader || !token || token === authHeader) {
      return res.status(401).json({ message: 'Access denied. No valid token provided.' });
    }

    const decoded = jwt.verify(token, 'fallback_secret');
    const { password: _, ...userWithoutPassword } = testUser;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.log('Profile error:', error.message);
    res.status(401).json({ message: 'Invalid token.' });
  }
});

// Verify token endpoint
app.get('/api/auth/verify', (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!authHeader || !token || token === authHeader) {
      return res.status(401).json({ message: 'Access denied. No valid token provided.' });
    }

    const decoded = jwt.verify(token, 'fallback_secret');
    
    // Find user from testUsers array
    const user = testUsers.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ 
      message: 'Token is valid',
      user: userWithoutPassword
    });
  } catch (error) {
    console.log('Verify error:', error.message);
    res.status(401).json({ message: 'Invalid token.' });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Liquor POS API Server is running! (Test Mode - No Database)',
    status: 'Ready for testing',
    data_summary: {
      categories: categories.length,
      products: products.length,
      total_inventory_value: products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0).toFixed(2)
    }
  });
});

// Categories endpoints (read-only in test mode)
app.get('/api/categories', (req, res) => {
  res.json({
    message: 'Categories retrieved successfully',
    data: categories,
    count: categories.length
  });
});

app.get('/api/categories/:id', (req, res) => {
  const categoryId = parseInt(req.params.id);
  const category = categories.find(c => c.id === categoryId);
  
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }
  
  const categoryProducts = products.filter(p => p.category_id === categoryId);
  
  res.json({
    message: 'Category retrieved successfully',
    data: {
      ...category,
      products: categoryProducts,
      product_count: categoryProducts.length
    }
  });
});

// Products endpoints
app.get('/api/products', (req, res) => {
  const { category_id, search, page = 1, limit = 20 } = req.query;
  let filteredProducts = [...products];
  
  // Filter by category
  if (category_id) {
    filteredProducts = filteredProducts.filter(p => p.category_id === parseInt(category_id));
  }
  
  // Search functionality
  if (search) {
    const searchTerm = search.toLowerCase();
    filteredProducts = filteredProducts.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.barcode.includes(searchTerm)
    );
  }
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  // Add category name to each product
  const productsWithCategory = paginatedProducts.map(product => ({
    ...product,
    category_name: categories.find(c => c.id === product.category_id)?.name || 'Unknown'
  }));
  
  res.json({
    message: 'Products retrieved successfully',
    data: productsWithCategory,
    pagination: {
      current_page: parseInt(page),
      total_pages: Math.ceil(filteredProducts.length / limit),
      total_items: filteredProducts.length,
      items_per_page: parseInt(limit)
    }
  });
});

app.get('/api/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  
  const category = categories.find(c => c.id === product.category_id);
  
  res.json({
    message: 'Product retrieved successfully',
    data: {
      ...product,
      category_name: category?.name || 'Unknown',
      category_description: category?.description || ''
    }
  });
});

// Search products by barcode
app.get('/api/products/barcode/:barcode', (req, res) => {
  const barcode = req.params.barcode;
  const product = products.find(p => p.barcode === barcode);
  
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  
  const category = categories.find(c => c.id === product.category_id);
  
  res.json({
    message: 'Product found',
    data: {
      ...product,
      category_name: category?.name || 'Unknown'
    }
  });
});

// Low stock products
app.get('/api/products/low-stock', (req, res) => {
  const lowStockProducts = products
    .filter(p => p.stock_quantity <= p.min_stock_level)
    .map(product => ({
      ...product,
      category_name: categories.find(c => c.id === product.category_id)?.name || 'Unknown'
    }));
  
  res.json({
    message: 'Low stock products retrieved',
    data: lowStockProducts,
    count: lowStockProducts.length
  });
});

// Inventory summary
app.get('/api/inventory/summary', (req, res) => {
  const summary = {
    total_products: products.length,
    total_categories: categories.length,
    total_inventory_value: products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0),
    total_cost_value: products.reduce((sum, p) => sum + (p.cost * p.stock_quantity), 0),
    low_stock_items: products.filter(p => p.stock_quantity <= p.min_stock_level).length,
    out_of_stock_items: products.filter(p => p.stock_quantity === 0).length,
    category_breakdown: categories.map(category => {
      const categoryProducts = products.filter(p => p.category_id === category.id);
      return {
        category_id: category.id,
        category_name: category.name,
        product_count: categoryProducts.length,
        total_value: categoryProducts.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0),
        low_stock_count: categoryProducts.filter(p => p.stock_quantity <= p.min_stock_level).length
      };
    })
  };
  
  res.json({
    message: 'Inventory summary retrieved',
    data: summary
  });
});

// Process a sale (decrease stock quantities)
app.post('/api/sales', (req, res) => {
  try {
    const { items } = req.body; // items: [{ id, quantity }]
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No sale items provided' });
    }

    // Validate and apply sale
    const soldItems = [];
    for (const it of items) {
      const productId = parseInt(it.id);
      const qty = parseInt(it.quantity);
      if (Number.isNaN(productId) || Number.isNaN(qty) || qty <= 0) {
        return res.status(400).json({ message: 'Invalid item format' });
      }

      const product = products.find(p => p.id === productId);
      if (!product) {
        return res.status(404).json({ message: `Product with id ${productId} not found` });
      }

      if (product.stock_quantity < qty) {
        return res.status(400).json({ message: `Insufficient stock for product ${product.name}` });
      }

    // Decrement stock
    product.stock_quantity -= qty;

    soldItems.push({ id: productId, name: product.name, quantity: qty, price: product.price, subtotal: product.price * qty });
  }

  // Store the sale in salesHistory for reporting
  const saleRecord = {
    id: Date.now(), // Simple ID generation
    sale_date: new Date().toISOString(),
    total_amount: soldItems.reduce((sum, item) => sum + item.subtotal, 0),
    items: soldItems.map(item => ({
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.subtotal
    }))
  };
  
  salesHistory.push(saleRecord);
  console.log('Sale recorded:', saleRecord.id, 'Total sales in history:', salesHistory.length);

    // Recalculate summary
    const summary = {
      total_products: products.length,
      total_categories: categories.length,
      total_inventory_value: products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0),
      total_cost_value: products.reduce((sum, p) => sum + (p.cost * p.stock_quantity), 0),
      low_stock_items: products.filter(p => p.stock_quantity <= p.min_stock_level).length,
      out_of_stock_items: products.filter(p => p.stock_quantity === 0).length
    };

    res.json({
      message: 'Sale processed successfully',
      soldItems,
      data: {
        summary
      }
    });
  } catch (err) {
    console.error('Sale processing error:', err);
    res.status(500).json({ message: 'Internal server error processing sale' });
  }
});

// Mock report endpoints
app.get('/api/reports/:reportId', (req, res) => {
  const { reportId } = req.params;
  const { range = 'today' } = req.query;

  // Simple mock responses for selected report types
  switch (reportId) {
    case 'daily-sales': {
      const qsStart = req.query.start_date;
      const qsEnd = req.query.end_date;

      // New category-wise daily sales format
      try {
        if (Array.isArray(salesHistory) && salesHistory.length > 0) {
          const parseDate = (d) => d ? new Date(d) : null;
          const startDate = parseDate(qsStart);
          const endDate = parseDate(qsEnd);
          const inRange = (d) => {
            const t = new Date(d);
            if (startDate && endDate) return t >= startDate && t <= endDate;
            if (startDate) return t >= startDate;
            if (endDate) return t <= endDate;
            const today = new Date();
            return t.toDateString() === today.toDateString();
          };

          const filtered = salesHistory.filter(s => inRange(s.sale_date));
          
          // Create category-wise aggregated rows
          const rows = [];
          
          filtered.forEach(sale => {
            sale.items.forEach(item => {
              // Find product to get category
              const product = products.find(p => p.id === item.product_id);
              const category = product ? categories.find(c => c.id === product.category_id) : null;
              
              rows.push({
                category: category ? category.name : 'Unknown',
                product: item.product_name,
                unit_price: item.unit_price,
                quantity: item.quantity,
                total_amount: item.subtotal
              });
            });
          });

          const totals = {
            total_quantity: rows.reduce((sum, r) => sum + r.quantity, 0),
            total_amount: rows.reduce((sum, r) => sum + r.total_amount, 0)
          };

          return res.json({ 
            message: 'Daily sales report (category-wise)', 
            data: { 
              range: { start_date: qsStart, end_date: qsEnd }, 
              rows, 
              totals 
            } 
          });
        }
      } catch (e) {
        console.error('Error aggregating salesHistory for daily-sales:', e);
      }

      // Fallback mock data with category-wise format
      const rows = [
        { category: 'Whiskey', product: 'Royal Stag Reserve 750ml', unit_price: 950, quantity: 3, total_amount: 2850 },
        { category: 'Beer', product: 'Kingfisher Premium 330ml', unit_price: 120, quantity: 10, total_amount: 1200 },
        { category: 'Vodka', product: 'Romanov Vodka 750ml', unit_price: 800, quantity: 2, total_amount: 1600 },
        { category: 'Rum', product: 'Old Monk 750ml', unit_price: 550, quantity: 4, total_amount: 2200 }
      ];
      
      const totals = {
        total_quantity: rows.reduce((sum, r) => sum + r.quantity, 0),
        total_amount: rows.reduce((sum, r) => sum + r.total_amount, 0)
      };

      return res.json({ 
        message: 'Daily sales report (category-wise)', 
        data: { 
          range: { start_date: qsStart, end_date: qsEnd }, 
          rows, 
          totals 
        } 
      });
    }

    case 'monthly-sales': {
      const qsStart = req.query.start_date;
      const qsEnd = req.query.end_date;
      // Mock monthly summary and a few transactions
      const summary = { totalSales: 950000, totalTransactions: 420, averageTicket: 2261 };
      const topDays = [
        { date: '2025-08-15', revenue: 45000 },
        { date: '2025-08-22', revenue: 52000 },
        { date: '2025-08-29', revenue: 48000 }
      ];
      return res.json({ message: 'Monthly sales report (mock)', data: { range: { start_date: qsStart, end_date: qsEnd }, summary, topDays } });
    }

    case 'top-products': {
      const qsStart = req.query.start_date;
      const qsEnd = req.query.end_date;
      // Return mock top selling products
      const topProducts = [
        { id: 11, name: 'Romanov Vodka 750ml', total_quantity_sold: 320, total_revenue: 256000 },
        { id: 1, name: 'Royal Stag Reserve 750ml', total_quantity_sold: 280, total_revenue: 266000 },
        { id: 49, name: 'Kingfisher Premium 330ml', total_quantity_sold: 1200, total_revenue: 144000 }
      ];
      return res.json({ message: 'Top products (mock)', data: { range: { start_date: qsStart, end_date: qsEnd }, topProducts } });
    }

    case 'biller-performance': {
      const qsStart = req.query.start_date;
      const qsEnd = req.query.end_date;
      // Mock performance per biller/staff
      const performance = [
        { biller: 'biller', salesCount: 120, totalSales: 250000 },
        { biller: 'manager', salesCount: 80, totalSales: 200000 },
        { biller: 'admin', salesCount: 25, totalSales: 75000 }
      ];
      return res.json({ message: 'Biller performance (mock)', data: { range: { start_date: qsStart, end_date: qsEnd }, performance } });
    }

    case 'current-stock': {
      const summary = {
        total_products: products.length,
        total_categories: categories.length,
        total_inventory_value: products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0),
        total_cost_value: products.reduce((sum, p) => sum + (p.cost * p.stock_quantity), 0),
        low_stock_items: products.filter(p => p.stock_quantity <= p.min_stock_level).length,
      };
      return res.json({ message: 'Current stock report', data: summary });
    }

    case 'revenue-summary': {
      const revenue = products.reduce((sum, p) => sum + (p.price * (p.stock_quantity * 0.05)), 0); // mock 5% sold
      return res.json({ message: 'Revenue summary (mock)', data: { range: { start_date, end_date }, revenue } });
    }

    default:
      return res.status(404).json({ message: 'Report not found', data: null });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test Server is running on port ${PORT}`);
  console.log(`📝 Login with: admin / admin123`);
  console.log(`⚠️  Note: This is test mode without database`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
});

module.exports = app;
