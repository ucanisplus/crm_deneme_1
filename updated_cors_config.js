/* 
 * CORS Configuration for backend
 * Add this to the beginning of your temporary_index.js file to fix CORS issues
 */

// Configure the CORS middleware
app.use(cors({
  origin: ['https://crm-deneme-1.vercel.app', 'http://localhost:3000', '*'],  // Allow production domain, localhost and all origins for testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));

// Add specific CORS headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// CORS Preflight response for OPTIONS requests
app.options('*', cors());