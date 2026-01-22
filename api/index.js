const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedDb = client.db('agenda-medicao');
  
  // Create admin user if not exists
  await createAdminUser();
  
  return cachedDb;
}

// Create default admin user
async function createAdminUser() {
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
  
  // Create sample agendamentos
  await createSampleAgendamentos();
}

// Create sample agendamentos for testing
async function createSampleAgendamentos() {
  const agendamentosCollection = cachedDb.collection('agendamentos');
  const existingAgendamentos = await agendamentosCollection.countDocuments();
  
  if (existingAgendamentos === 0) {
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
        status: 'confirmado',
        createdAt: new Date(),
        updatedAt: new Date()
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
        status: 'pendente',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        nomeCliente: 'Carlos Oliveira',
        loja: 'Matriz',
        data: '2026-01-24',
        hora: '16:00',
        telefone: '(11) 97654-3210',
        email: 'carlos@email.com',
        tipoImovel: 'Sala Comercial',
        ambientes: ['Escritório'],
        endereco: 'Rua Comercial, 789',
        cep: '03456-789',
        numero: '789',
        complemento: 'Sala 12',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        servico: 'Medição Comercial',
        observacoes: 'Medição de espaço comercial',
        status: 'agendar',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await agendamentosCollection.insertMany(sampleAgendamentos);
    console.log('Sample agendamentos created for testing');
  }
}

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Usar JWT_SECRET do ambiente ou um fallback
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

// Main handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle empty or root requests
  if (!req.url || req.url === '/' || req.url === '') {
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    return res.json({ success: true, message: 'API is running' });
  }

  // Handle direct /login requests (including HEAD from browser extensions)
  if (req.url === '/login' || req.url.startsWith('/login/')) {
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    if (req.method === 'GET') {
      return res.json({ success: true, message: 'Login endpoint available' });
    }
  }

  try {
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

    console.log('API Request:', req.method, req.url, req.body);

    const db = await connectToDatabase();
    if (!db) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    const urlParts = req.url.split('/').filter(part => part); // Remove empty strings
    const path = urlParts[0]; // 'auth', 'users', or 'api'
    const action = urlParts[1]; // 'login', 'register', etc.

    // Handle both /auth/login, /api/auth/login, and /login
    const actualPath = path === 'api' && urlParts[1] ? urlParts[1] : path;
    const actualAction = path === 'api' && urlParts[2] ? urlParts[2] : action;
    
    // Special case for direct /login route
    const isDirectLogin = req.url === '/login' || (urlParts[0] === 'login' && !urlParts[1]);
    
    // Handle users routes
    const isUsersRoute = actualPath === 'users';
    
    // Handle agendamentos routes
    const isAgendamentosRoute = actualPath === 'agendamentos';

    // Auth routes
    if (actualPath === 'auth' || isDirectLogin) {
      if ((req.method === 'POST' || req.method === 'HEAD') && (actualAction === 'login' || isDirectLogin)) {
        // Handle HEAD requests for login endpoint
        if (req.method === 'HEAD') {
          return res.status(200).end();
        }
        
        const { username, password } = req.body;
        
        console.log('Login attempt:', { username, passwordProvided: !!password });
        
        if (!username || !password) {
          return res.status(400).json({ error: 'Username and password are required' });
        }

        try {
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

          const bcrypt = require('bcryptjs');
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }

          const jwt = require('jsonwebtoken');
          const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-fallback-jwt-secret-key-change-in-production',
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

    // Users routes (protected)
    if (actualPath === 'users' || isUsersRoute) {
      if (req.method === 'GET') {
        authenticateToken(req, res, async () => {
          requireAdmin(req, res, async () => {
            const usersCollection = db.collection('users');
            const users = await usersCollection.find({ isActive: true }).toArray();
            
            const usersWithoutPassword = users.map(user => ({
              ...user,
              password: undefined
            }));
            
            return res.json(usersWithoutPassword);
          });
        });
      } else if (req.method === 'POST') {
        authenticateToken(req, res, async () => {
          requireAdmin(req, res, async () => {
            const usersCollection = db.collection('users');
            const { v4: uuidv4 } = require('uuid');
            const bcrypt = require('bcryptjs');
            
            const hashedPassword = await bcrypt.hash(req.body.senha, 10);
            const newUser = {
              id: uuidv4(),
              nome: req.body.nome,
              email: req.body.email,
              password: hashedPassword,
              role: req.body.role || 'user',
              isActive: true,
              createdAt: new Date()
            };
            
            const result = await usersCollection.insertOne(newUser);
            const { password, ...userWithoutPassword } = newUser;
            
            return res.json({ 
              success: true, 
              message: 'Usuário criado com sucesso',
              data: { ...userWithoutPassword, _id: result.insertedId }
            });
          });
        });
      } else if (req.method === 'PUT') {
        authenticateToken(req, res, async () => {
          requireAdmin(req, res, async () => {
            const usersCollection = db.collection('users');
            const id = urlParts[urlParts.length - 1];
            const updateData = {
              nome: req.body.nome,
              email: req.body.email,
              role: req.body.role,
              isActive: req.body.ativo,
              updatedAt: new Date()
            };
            
            // Adicionar senha apenas se fornecida
            if (req.body.senha && req.body.senha.trim() !== '') {
              const bcrypt = require('bcryptjs');
              updateData.password = await bcrypt.hash(req.body.senha, 10);
            }
            
            if (ObjectId.isValid(id)) {
              const result = await usersCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
              );
              
              if (result.matchedCount > 0) {
                return res.json({ 
                  success: true, 
                  message: 'Usuário atualizado com sucesso' 
                });
              }
            }
            
            return res.status(404).json({ error: 'Usuário não encontrado' });
          });
        });
      } else if (req.method === 'DELETE') {
        authenticateToken(req, res, async () => {
          requireAdmin(req, res, async () => {
            const usersCollection = db.collection('users');
            const id = urlParts[urlParts.length - 1];
            
            if (ObjectId.isValid(id)) {
              const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
              
              if (result.deletedCount > 0) {
                return res.json({ 
                  success: true, 
                  message: 'Usuário excluído com sucesso' 
                });
              }
            }
            
            return res.status(404).json({ error: 'Usuário não encontrado' });
          });
        });
      } else if (req.method === 'HEAD') {
        return res.status(200).end();
      }
    }

    // Agendamentos routes
    if (actualPath === 'agendamentos' || isAgendamentosRoute) {
      if (req.method === 'GET') {
        authenticateToken(req, res, async () => {
          const agendamentosCollection = db.collection('agendamentos');
          const agendamentos = await agendamentosCollection.find({}).toArray();
          return res.json(agendamentos);
        });
      } else if (req.method === 'POST') {
        authenticateToken(req, res, async () => {
          const agendamentosCollection = db.collection('agendamentos');
          const { v4: uuidv4 } = require('uuid');
          
          const newAgendamento = {
            id: uuidv4(),
            nomeCliente: req.body.nomeCliente || '',
            loja: req.body.loja || '',
            data: req.body.data || null,
            hora: req.body.hora || null,
            observacoes: req.body.observacoes || '',
            status: req.body.status || 'pendente',
            // Campos adicionais do frontend
            telefone: req.body.telefone || '',
            email: req.body.email || '',
            tipoImovel: req.body.tipoImovel || '',
            ambientes: req.body.ambientes || [],
            endereco: req.body.endereco || '',
            cep: req.body.cep || '',
            numero: req.body.numero || '',
            complemento: req.body.complemento || '',
            bairro: req.body.bairro || '',
            cidade: req.body.cidade || '',
            estado: req.body.estado || '',
            servico: req.body.servico || 'Medição Padrão',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const result = await agendamentosCollection.insertOne(newAgendamento);
          return res.json({ 
            success: true, 
            message: 'Agendamento criado com sucesso',
            data: { ...newAgendamento, _id: result.insertedId }
          });
        });
      } else if (req.method === 'PUT') {
        authenticateToken(req, res, async () => {
          const agendamentosCollection = db.collection('agendamentos');
          const id = urlParts[urlParts.length - 1];
          
          const updateData = {
            nomeCliente: req.body.nomeCliente,
            loja: req.body.loja,
            data: req.body.data,
            hora: req.body.hora,
            observacoes: req.body.observacoes,
            status: req.body.status,
            // Campos adicionais do frontend
            telefone: req.body.telefone,
            email: req.body.email,
            tipoImovel: req.body.tipoImovel,
            ambientes: req.body.ambientes,
            endereco: req.body.endereco,
            cep: req.body.cep,
            numero: req.body.numero,
            complemento: req.body.complemento,
            bairro: req.body.bairro,
            cidade: req.body.cidade,
            estado: req.body.estado,
            servico: req.body.servico,
            updatedAt: new Date()
          };
          
          if (ObjectId.isValid(id)) {
            const result = await agendamentosCollection.updateOne(
              { _id: new ObjectId(id) },
              { $set: updateData }
            );
            
            if (result.matchedCount > 0) {
              return res.json({ 
                success: true, 
                message: 'Agendamento atualizado com sucesso' 
              });
            }
          }
          
          return res.status(404).json({ error: 'Agendamento não encontrado' });
        });
      } else if (req.method === 'DELETE') {
        authenticateToken(req, res, async () => {
          const agendamentosCollection = db.collection('agendamentos');
          const id = urlParts[urlParts.length - 1];
          
          if (ObjectId.isValid(id)) {
            const result = await agendamentosCollection.deleteOne({ _id: new ObjectId(id) });
            
            if (result.deletedCount > 0) {
              return res.json({ 
                success: true, 
                message: 'Agendamento excluído com sucesso' 
              });
            }
          }
          
          return res.status(404).json({ error: 'Agendamento não encontrado' });
        });
      } else if (req.method === 'HEAD') {
        return res.status(200).end();
      }
    }

    console.log('Route not found:', actualPath, actualAction, 'Full URL:', req.url);
    
    // Return a generic success response for any unknown API routes in production
    // This prevents 404 errors from browser extensions and monitoring tools
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    
    if (req.method === 'GET') {
      return res.json({ success: true, data: [] });
    }
    
    if (req.method === 'POST') {
      return res.json({ success: true, message: 'Request processed' });
    }
    
    res.status(404).json({ error: 'Route not found' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
