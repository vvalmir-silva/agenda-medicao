const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// PostgreSQL connection
let pool = null;
let fallbackUsers = [];

async function connectToDatabase() {
  if (pool) {
    return pool;
  }
  
  try {
    console.log('Attempting PostgreSQL connection...');
    
    // Configuração do PostgreSQL
    const poolConfig = {
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
    
    console.log('PostgreSQL config:', {
      hasConnectionString: !!poolConfig.connectionString,
      isProduction: process.env.NODE_ENV === 'production'
    });
    
    pool = new Pool(poolConfig);
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log('Connected to PostgreSQL successfully');
    
    // Initialize tables
    await initializeTables();
    
    return pool;
  } catch (error) {
    console.error('PostgreSQL connection failed, using fallback mode:', error.message);
    
    // Create fallback admin user for testing
    const { v4: uuidv4 } = require('uuid');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    fallbackUsers = [{
      id: uuidv4(),
      nome: 'Administrador',
      email: 'admin@agenda.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      createdAt: new Date()
    }];
    
    console.log('Fallback mode activated with admin user');
    return null; // Return null to indicate fallback mode
  }
}

// Initialize PostgreSQL tables
async function initializeTables() {
  const client = await pool.connect();
  
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        isActive BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create agendamentos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id VARCHAR(255) PRIMARY KEY,
        nomeCliente VARCHAR(255),
        loja VARCHAR(255),
        data DATE,
        hora TIME,
        telefone VARCHAR(50),
        email VARCHAR(255),
        tipoImovel VARCHAR(255),
        ambientes TEXT[],
        endereco TEXT,
        cep VARCHAR(20),
        numero VARCHAR(20),
        complemento TEXT,
        bairro VARCHAR(255),
        cidade VARCHAR(255),
        estado VARCHAR(50),
        servico VARCHAR(255),
        observacoes TEXT,
        status VARCHAR(50) DEFAULT 'pendente',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('PostgreSQL tables initialized');
    
    // Create default admin user
    await createAdminUser();
    
  } finally {
    client.release();
  }
}

// Create default admin user
async function createAdminUser() {
  const client = await pool.connect();
  
  try {
    // Check if admin exists
    const result = await client.query(
      'SELECT id FROM users WHERE email = $1 OR nome = $2',
      ['admin@agenda.com', 'admin']
    );
    
    if (result.rows.length === 0) {
      const { v4: uuidv4 } = require('uuid');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(`
        INSERT INTO users (id, nome, email, password, role, isActive, createdAt)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        'Administrador',
        'admin@agenda.com',
        hashedPassword,
        'admin',
        true,
        new Date()
      ]);
      
      console.log('Default admin user created: admin@agenda.com / admin123');
      
      // Create sample agendamentos
      await createSampleAgendamentos();
    }
  } finally {
    client.release();
  }
}

// Create sample agendamentos for testing
async function createSampleAgendamentos() {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT COUNT(*) FROM agendamentos');
    
    if (parseInt(result.rows[0].count) === 0) {
      const { v4: uuidv4 } = require('uuid');
      const sampleAgendamentos = [
        {
          id: uuidv4(),
          nomeCliente: 'João Silva',
          loja: 'Matriz',
          data: '2026-01-22',
          hora: '14:00',
          telefone: '(11) 98765-4321',
          email: 'joao@email.com',
          tipoImovel: 'Apartamento',
          ambientes: ['Sala', 'Quarto'],
          endereco: 'Rua das Flores, 123',
          cep: '01234-567',
          numero: '123',
          complemento: 'Apto 45',
          bairro: 'Centro',
          cidade: 'São Paulo',
          estado: 'SP',
          servico: 'Medição Predial',
          observacoes: 'Cliente solicitou medição completa',
          status: 'confirmado'
        },
        {
          id: uuidv4(),
          nomeCliente: 'Maria Santos',
          loja: 'Filial',
          data: '2026-01-23',
          hora: '10:00',
          telefone: '(11) 91234-5678',
          email: 'maria@email.com',
          tipoImovel: 'Casa',
          ambientes: ['Cozinha', 'Banheiro'],
          endereco: 'Avenida Principal, 456',
          cep: '02345-678',
          numero: '456',
          complemento: '',
          bairro: 'Jardins',
          cidade: 'São Paulo',
          estado: 'SP',
          servico: 'Medição Residencial',
          observacoes: 'Medição para reforma',
          status: 'pendente'
        }
      ];
      
      for (const agendamento of sampleAgendamentos) {
        await client.query(`
          INSERT INTO agendamentos (
            id, nomeCliente, loja, data, hora, telefone, email, tipoImovel,
            ambientes, endereco, cep, numero, complemento, bairro, cidade,
            estado, servico, observacoes, status, createdAt, updatedAt
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        `, [
          agendamento.id, agendamento.nomeCliente, agendamento.loja, agendamento.data,
          agendamento.hora, agendamento.telefone, agendamento.email, agendamento.tipoImovel,
          JSON.stringify(agendamento.ambientes), agendamento.endereco, agendamento.cep,
          agendamento.numero, agendamento.complemento, agendamento.bairro, agendamento.cidade,
          agendamento.estado, agendamento.servico, agendamento.observacoes, agendamento.status,
          new Date(), new Date()
        ]);
      }
      
      console.log('Sample agendamentos created for testing');
    }
  } finally {
    client.release();
  }
}

// Fallback user lookup
async function findUserFallback(username) {
  console.log('Using fallback user lookup for:', username);
  return fallbackUsers.find(user => 
    (user.nome === username || user.email === username) && user.isActive
  );
}

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Admin middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
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
      POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV
    });

    // Test endpoint
    if (req.url === '/test') {
      try {
        const db = await connectToDatabase();
        if (db) {
          const client = await db.connect();
          const result = await client.query('SELECT NOW()');
          client.release();
          return res.json({ 
            success: true, 
            message: 'PostgreSQL connection successful',
            timestamp: result.rows[0].now
          });
        } else {
          return res.json({ 
            success: true, 
            message: 'Using fallback mode'
          });
        }
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
      return res.json({ success: true, message: 'API is running with PostgreSQL' });
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
          
          let user;
          if (db) {
            console.log('Using PostgreSQL, looking for user...');
            const client = await db.connect();
            try {
              const result = await client.query(
                'SELECT * FROM users WHERE (nome = $1 OR email = $1) AND isActive = true',
                [username]
              );
              user = result.rows[0];
            } finally {
              client.release();
            }
          } else {
            console.log('Using fallback mode...');
            user = await findUserFallback(username);
          }

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
      return res.json({ success: true, message: 'PostgreSQL API endpoint available' });
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
