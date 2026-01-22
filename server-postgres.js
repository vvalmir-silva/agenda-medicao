const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const postgresConfig = {
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/agenda-medicao',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

let pool;

async function connectToDatabase() {
  try {
    pool = new Pool(postgresConfig);
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log('Connected to PostgreSQL successfully');
    
    // Initialize tables
    await initializeTables();
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    process.exit(1);
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
    
    // Create sample agendamentos
    await createSampleAgendamentos();
    
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
      'SELECT id FROM users WHERE email = $1',
      ['admin@agenda.com']
    );
    
    if (result.rows.length === 0) {
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

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'your-fallback-jwt-secret-key-change-in-production';
  
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

// Routes
app.get('/api', (req, res) => {
  res.json({ success: true, message: 'PostgreSQL API is running' });
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE (nome = $1 OR email = $1) AND isActive = true',
        [username]
      );
      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-fallback-jwt-secret-key-change-in-production',
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          role: user.role
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users routes (protected)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, nome, email, role, isActive, createdAt FROM users WHERE isActive = true ORDER BY createdAt DESC'
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nome, email, senha, role } = req.body;
    
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);
    
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO users (id, nome, email, password, role, isActive, createdAt)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, nome, email, role, isActive, createdAt
      `, [uuidv4(), nome, email, hashedPassword, role || 'user', true, new Date()]);
      
      res.json({ 
        success: true, 
        message: 'Usuário criado com sucesso',
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Email já existe' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, senha, role, ativo } = req.body;
    
    const client = await pool.connect();
    try {
      let query = `
        UPDATE users 
        SET nome = $1, email = $2, role = $3, isActive = $4, updatedAt = $5
      `;
      let params = [nome, email, role || 'user', ativo, new Date()];
      
      if (senha && senha.trim() !== '') {
        const hashedPassword = await bcrypt.hash(senha, 10);
        query += ', password = $6';
        params.push(hashedPassword);
      }
      
      query += ' WHERE id = $' + (params.length + 1);
      params.push(id);
      
      const result = await client.query(query, params);
      
      if (result.rowCount > 0) {
        res.json({ 
          success: true, 
          message: 'Usuário atualizado com sucesso' 
        });
      } else {
        res.status(404).json({ error: 'Usuário não encontrado' });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Email já existe' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM users WHERE id = $1', [id]);
      
      if (result.rowCount > 0) {
        res.json({ 
          success: true, 
          message: 'Usuário excluído com sucesso' 
        });
      } else {
        res.status(404).json({ error: 'Usuário não encontrado' });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Agendamentos routes (protected)
app.get('/api/agendamentos', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM agendamentos ORDER BY createdAt DESC');
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get agendamentos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/agendamentos', authenticateToken, async (req, res) => {
  try {
    const agendamentoData = req.body;
    
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO agendamentos (
          id, nomeCliente, loja, data, hora, telefone, email, tipoImovel,
          ambientes, endereco, cep, numero, complemento, bairro, cidade,
          estado, servico, observacoes, status, createdAt, updatedAt
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `, [
        uuidv4(),
        agendamentoData.nomeCliente || '',
        agendamentoData.loja || '',
        agendamentoData.data || null,
        agendamentoData.hora || null,
        agendamentoData.telefone || '',
        agendamentoData.email || '',
        agendamentoData.tipoImovel || '',
        JSON.stringify(agendamentoData.ambientes || []),
        agendamentoData.endereco || '',
        agendamentoData.cep || '',
        agendamentoData.numero || '',
        agendamentoData.complemento || '',
        agendamentoData.bairro || '',
        agendamentoData.cidade || '',
        agendamentoData.estado || '',
        agendamentoData.servico || 'Medição Padrão',
        agendamentoData.observacoes || '',
        agendamentoData.status || 'pendente',
        new Date(),
        new Date()
      ]);
      
      res.json({ 
        success: true, 
        message: 'Agendamento criado com sucesso',
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create agendamento error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/agendamentos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const agendamentoData = req.body;
    
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE agendamentos SET
          nomeCliente = $1, loja = $2, data = $3, hora = $4, telefone = $5,
          email = $6, tipoImovel = $7, ambientes = $8, endereco = $9, cep = $10,
          numero = $11, complemento = $12, bairro = $13, cidade = $14,
          estado = $15, servico = $16, observacoes = $17, status = $18,
          updatedAt = $19
        WHERE id = $20
        RETURNING *
      `, [
        agendamentoData.nomeCliente,
        agendamentoData.loja,
        agendamentoData.data,
        agendamentoData.hora,
        agendamentoData.telefone,
        agendamentoData.email,
        agendamentoData.tipoImovel,
        JSON.stringify(agendamentoData.ambientes),
        agendamentoData.endereco,
        agendamentoData.cep,
        agendamentoData.numero,
        agendamentoData.complemento,
        agendamentoData.bairro,
        agendamentoData.cidade,
        agendamentoData.estado,
        agendamentoData.servico,
        agendamentoData.observacoes,
        agendamentoData.status,
        new Date(),
        id
      ]);
      
      if (result.rowCount > 0) {
        res.json({ 
          success: true, 
          message: 'Agendamento atualizado com sucesso',
          data: result.rows[0]
        });
      } else {
        res.status(404).json({ error: 'Agendamento não encontrado' });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update agendamento error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/agendamentos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await pool.connect();
    try {
      const result = await client.query('DELETE FROM agendamentos WHERE id = $1', [id]);
      
      if (result.rowCount > 0) {
        res.json({ 
          success: true, 
          message: 'Agendamento excluído com sucesso' 
        });
      } else {
        res.status(404).json({ error: 'Agendamento não encontrado' });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete agendamento error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`PostgreSQL server running on port ${PORT}`);
    console.log(`Default admin: admin@agenda.com / admin123`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
});
