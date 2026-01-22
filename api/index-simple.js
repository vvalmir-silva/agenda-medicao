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
          const db = await connectToDatabase();
          await createAdminUser();
          
          const usersCollection = db.collection('users');
          const user = await usersCollection.findOne({ 
            $or: [
              { nome: username, isActive: true },
              { email: username, isActive: true }
            ]
          });

          console.log('User found:', !!user);

          if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }

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
          return res.status(500).json({ error: 'Login process failed', details: loginError.message });
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
