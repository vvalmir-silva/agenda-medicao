const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedDb = client.db('agenda-medicao');
    console.log('Connected to MongoDB successfully');
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Create default admin user
async function createAdminUser() {
  try {
    const usersCollection = cachedDb.collection('users');
    const existingAdmin = await usersCollection.findOne({ 
      $or: [
        { email: 'admin@agenda.com' },
        { nome: 'admin' }
      ]
    });
    
    if (!existingAdmin) {
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await usersCollection.insertOne({
        id: uuidv4(),
        nome: 'Administrador',
        email: 'admin@agenda.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        createdAt: new Date()
      });
      
      console.log('Default admin user created: admin@agenda.com / admin123');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

// Main handler
module.exports = async (req, res) => {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    console.log('Request received:', req.method, req.url);
    console.log('Environment variables:', {
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV
    });

    // Test endpoint
    if (req.url === '/test') {
      try {
        const db = await connectToDatabase();
        return res.json({ 
          success: true, 
          message: 'Database connection successful',
          database: db.databaseName
        });
      } catch (dbError) {
        return res.status(500).json({ 
          error: 'Database connection failed', 
          details: dbError.message 
        });
      }
    }

    // Handle empty or root requests
    if (!req.url || req.url === '/' || req.url === '') {
      if (req.method === 'HEAD') {
        return res.status(200).end();
      }
      return res.json({ success: true, message: 'API is running' });
    }

    // Parse body for POST requests
    if (req.method === 'POST') {
      try {
        if (typeof req.body === 'string') {
          req.body = JSON.parse(req.body);
        } else if (!req.body) {
          req.body = {};
        }
      } catch (parseError) {
        console.error('Body parse error:', parseError);
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }
    }

    console.log('Request body:', req.body);

    // Handle auth/login
    if (req.url === '/auth/login' || req.url === '/login') {
      if (req.method === 'POST') {
        const { username, password } = req.body;
        
        console.log('Login attempt:', { username, passwordProvided: !!password });
        
        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }

        try {
          console.log('Attempting to connect to database...');
          const db = await connectToDatabase();
          console.log('Database connected, creating admin user...');
          await createAdminUser();
          console.log('Admin user created/verified, looking for user...');
          
          const usersCollection = db.collection('users');
          const user = await usersCollection.findOne({ 
            $or: [
              { nome: username, isActive: true },
              { email: username, isActive: true }
            ]
          });

          console.log('User found:', !!user, user ? user.email : 'null');

          if (!user) {
            console.log('User not found, returning 401');
            return res.status(401).json({ error: 'Invalid credentials - user not found' });
          }

          console.log('Comparing password...');
          const isPasswordValid = await bcrypt.compare(password, user.password);
          console.log('Password valid:', isPasswordValid);
          
          if (!isPasswordValid) {
            console.log('Password invalid, returning 401');
            return res.status(401).json({ error: 'Invalid credentials - wrong password' });
          }

          console.log('Creating JWT token...');
          const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '24h' }
          );

          console.log('Login successful for:', user.nome);

          return res.json({
            token,
            user: {
              id: user.id,
              email: user.email,
              nome: user.nome,
              role: user.role
            }
          });
        } catch (loginError) {
          console.error('Login process error:', loginError);
          console.error('Error details:', loginError.message);
          console.error('Error stack:', loginError.stack);
          return res.status(500).json({ 
            error: 'Login process failed', 
            details: loginError.message,
            stack: loginError.stack 
          });
        }
      }
    }

    // Handle other routes
    if (req.method === 'GET') {
      return res.json({ success: true, message: 'API endpoint available' });
    }

    res.status(404).json({ error: 'Route not found' });
  } catch (error) {
    console.error('Unhandled API error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack 
    });
  }
};
