const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://vvalmirdevsilva_db_user:ValmirDevJunior@cluster0.1eoge7c.mongodb.net/';
let db;

async function connectToDatabase() {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db('agenda-medicao');
    console.log('Connected to MongoDB successfully');
    
    // Create admin user if not exists
    await createAdminUser();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Create default admin user
async function createAdminUser() {
  const usersCollection = db.collection('users');
  const existingAdmin = await usersCollection.findOne({ email: 'admin@agenda.com' });
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await usersCollection.insertOne({
      id: uuidv4(),
      email: 'admin@agenda.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      isActive: true
    });
    console.log('Default admin user created: admin@agenda.com / admin123');
  }
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'agenda-medicao-secret-key';

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth header:', authHeader);
  console.log('Token:', token ? 'exists' : 'missing');

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('JWT verify error:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }
    console.log('JWT verified successfully, user:', user);
    req.user = user;
    next();
  });
}

// Admin Middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Routes

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const usersCollection = db.collection('users');
    // Buscar por nome ou email (compatibilidade)
    const user = await usersCollection.findOne({ 
      $or: [
        { nome: username, isActive: true },
        { email: username, isActive: true }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create User (Admin only)
app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const usersCollection = db.collection('users');
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      role,
      createdAt: new Date(),
      isActive: true
    };

    await usersCollection.insertOne(newUser);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Users (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const users = await usersCollection.find(
      { isActive: true },
      { projection: { password: 0 } }
    ).toArray();

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update User (Admin only)
app.put('/api/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { nome, email, senha, role, ativo } = req.body;

    const usersCollection = db.collection('users');
    
    // Construir objeto de atualização
    const updateData = {
      nome,
      email,
      role,
      ativo,
      updatedAt: new Date()
    };

    // Adicionar senha apenas se fornecida
    if (senha && senha.trim() !== '') {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(senha, 10);
      updateData.senha = hashedPassword;
    }

    // Tentar buscar por ObjectId primeiro, depois por string id
    let objectId;
    let foundUser = null;
    let searchType = '';
    
    try {
      const { ObjectId } = require('mongodb');
      objectId = new ObjectId(userId);
      foundUser = await usersCollection.findOne({ 
        _id: objectId
      });
      searchType = 'ObjectId';
    } catch (error) {
      foundUser = await usersCollection.findOne({ 
        id: userId
      });
      searchType = 'string id';
    }
    
    if (!foundUser) {
      return res.status(404).json({ 
        error: 'User not found',
        details: `Nenhum usuário encontrado com ID: ${userId} (busca por ${searchType})`
      });
    }

    // Construir filtro de busca correto
    let filter;
    if (searchType === 'ObjectId') {
      filter = { _id: objectId };
    } else {
      filter = { id: userId };
    }

    const result = await usersCollection.updateOne(
      filter,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'User updated successfully',
      data: updateData,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete User (Admin only)
app.delete('/api/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const usersCollection = db.collection('users');
    const result = await usersCollection.updateOne(
      { id: userId },
      { $set: { isActive: false } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Current User Info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { id: req.user.id, isActive: true },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= AGENDAMENTOS =============

// Create Agendamento
app.post('/api/agendamentos', authenticateToken, async (req, res) => {
  try {
    const { nomeCliente, loja, data, hora, observacoes, status } = req.body;

    if (!nomeCliente || !loja) {
      return res.status(400).json({ error: 'Nome do cliente e loja são obrigatórios' });
    }

    // Validar status
    const validStatuses = ['pendente', 'confirmado', 'cancelado', 'concluido', 'agendar'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Status permitidos: pendente, confirmado, cancelado, concluido, agendar' });
    }

    const agendamentosCollection = db.collection('agendamentos');
    const newAgendamento = {
      id: uuidv4(),
      nomeCliente,
      loja,
      data: data || null,
      hora: hora || null,
      observacoes: observacoes || '',
      status: status || 'pendente',
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    await agendamentosCollection.insertOne(newAgendamento);

    res.status(201).json({
      message: 'Agendamento criado com sucesso',
      agendamento: {
        id: newAgendamento.id,
        nomeCliente: newAgendamento.nomeCliente,
        loja: newAgendamento.loja,
        data: newAgendamento.data,
        hora: newAgendamento.hora,
        status: newAgendamento.status,
        createdAt: newAgendamento.createdAt
      }
    });
  } catch (error) {
    console.error('Create agendamento error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Agendamentos
app.get('/api/agendamentos', authenticateToken, async (req, res) => {
  try {
    const agendamentosCollection = db.collection('agendamentos');
    const agendamentosList = await agendamentosCollection.find(
      { isActive: true },
      { projection: { createdBy: 0 } }
    ).sort({ createdAt: -1 }).toArray();

    res.json(agendamentosList);
  } catch (error) {
    console.error('Get agendamentos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Agendamento
app.put('/api/agendamentos/:agendamentoId', authenticateToken, async (req, res) => {
  try {
    const { agendamentoId } = req.params;
    const updateData = req.body;

    console.log('=== UPDATE AGENDAMENTO ===');
    console.log('ID recebido:', agendamentoId);
    console.log('Dados recebidos:', updateData);

    // Validar status se fornecido
    const validStatuses = ['pendente', 'confirmado', 'cancelado', 'concluido', 'agendar'];
    if (updateData.status && !validStatuses.includes(updateData.status)) {
      return res.status(400).json({ error: 'Status inválido. Status permitidos: pendente, confirmado, cancelado, concluido, agendar' });
    }

    const agendamentosCollection = db.collection('agendamentos');
    
    // Primeiro, verificar se o agendamento existe com qualquer tipo de ID
    console.log('=== VERIFICANDO AGENDAMENTO ===');
    
    // Tentar buscar por ObjectId
    let foundAgendamento = null;
    let searchType = '';
    
    try {
      objectId = new ObjectId(agendamentoId);
      foundAgendamento = await agendamentosCollection.findOne({ 
        _id: objectId, 
        isActive: true 
      });
      searchType = 'ObjectId';
      console.log('Busca por ObjectId:', objectId);
    } catch (error) {
      console.log('ID não é ObjectId válido, tentando buscar por string id');
      foundAgendamento = await agendamentosCollection.findOne({ 
        id: agendamentoId, 
        isActive: true 
      });
      searchType = 'string id';
      console.log('Busca por string id:', agendamentoId);
    }
    
    console.log('Agendamento encontrado?', !!foundAgendamento);
    if (foundAgendamento) {
      console.log('Dados do agendamento encontrado:', {
        _id: foundAgendamento._id,
        id: foundAgendamento.id,
        nomeCliente: foundAgendamento.nomeCliente
      });
    }
    
    if (!foundAgendamento) {
      return res.status(404).json({ 
        error: 'Agendamento not found',
        details: `Nenhum agendamento encontrado com ID: ${agendamentoId} (busca por ${searchType})`
      });
    }

    // Construir filtro de busca correto
    let filter;
    if (searchType === 'ObjectId') {
      filter = { _id: objectId, isActive: true };
    } else {
      filter = { id: agendamentoId, isActive: true };
    }

    // Construir dados de atualização
    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    };

    console.log('Filtro de busca:', filter);
    console.log('Campos para atualizar:', updateFields);

    const result = await agendamentosCollection.updateOne(
      filter,
      { $set: updateFields }
    );

    console.log('Resultado do update:', result);
    console.log('MatchedCount:', result.matchedCount);
    console.log('ModifiedCount:', result.modifiedCount);

    if (result.matchedCount === 0) {
      console.log('Nenhum agendamento encontrado com este ID');
      return res.status(404).json({ 
        error: 'Agendamento not found',
        details: `Nenhum agendamento encontrado com ID: ${agendamentoId}`,
        filter: filter
      });
    }

    if (result.modifiedCount === 0) {
      console.log('Agendamento encontrado mas não modificado (dados iguais)');
      return res.json({ 
        message: 'Agendamento não modificado - dados iguais', 
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      });
    }

    console.log('Agendamento atualizado com sucesso -', result.modifiedCount, 'documento(s) modificado(s)');
    res.json({ 
      message: 'Agendamento atualizado com sucesso', 
      data: updateFields,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Update agendamento error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete Agendamento
app.delete('/api/agendamentos/:agendamentoId', authenticateToken, async (req, res) => {
  try {
    const { agendamentoId } = req.params;

    const agendamentosCollection = db.collection('agendamentos');
    const result = await agendamentosCollection.updateOne(
      { id: agendamentoId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Agendamento not found' });
    }

    res.json({ message: 'Agendamento excluído com sucesso' });
  } catch (error) {
    console.error('Delete agendamento error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= LOJAS =============

// Create Loja
app.post('/api/lojas', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nome, cnpj, endereco, telefone, email, responsavel } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome da loja é obrigatório' });
    }

    const lojasCollection = db.collection('lojas');
    const existingLoja = await lojasCollection.findOne({ nome, isActive: true });

    if (existingLoja) {
      return res.status(400).json({ error: 'Loja já existe' });
    }

    const newLoja = {
      id: uuidv4(),
      nome,
      cnpj: cnpj || '',
      endereco: endereco || {},
      telefone: telefone || '',
      email: email || '',
      responsavel: responsavel || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await lojasCollection.insertOne(newLoja);

    res.status(201).json({
      message: 'Loja criada com sucesso',
      loja: {
        id: newLoja.id,
        nome: newLoja.nome,
        cnpj: newLoja.cnpj,
        telefone: newLoja.telefone,
        email: newLoja.email,
        responsavel: newLoja.responsavel,
        createdAt: newLoja.createdAt
      }
    });
  } catch (error) {
    console.error('Create loja error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Lojas
app.get('/api/lojas', authenticateToken, async (req, res) => {
  try {
    const lojasCollection = db.collection('lojas');
    const lojas = await lojas.find(
      { isActive: true },
      { projection: { endereco: 0 } }
    ).sort({ nome: 1 }).toArray();

    res.json(lojas);
  } catch (error) {
    console.error('Get lojas error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= CLIENTES =============

// Create Cliente
app.post('/api/clientes', authenticateToken, async (req, res) => {
  try {
    const { nome, email, telefone, cpf, endereco, dataNascimento } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    }

    const clientesCollection = db.collection('clientes');
    const newCliente = {
      id: uuidv4(),
      nome,
      email: email || '',
      telefone: telefone || '',
      cpf: cpf || '',
      endereco: endereco || {},
      dataNascimento: dataNascimento || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await clientesCollection.insertOne(newCliente);

    res.status(201).json({
      message: 'Cliente criado com sucesso',
      cliente: {
        id: newCliente.id,
        nome: newCliente.nome,
        email: newCliente.email,
        telefone: newCliente.telefone,
        cpf: newCliente.cpf,
        createdAt: newCliente.createdAt
      }
    });
  } catch (error) {
    console.error('Create cliente error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Clientes
app.get('/api/clientes', authenticateToken, async (req, res) => {
  try {
    const clientesCollection = db.collection('clientes');
    const clientes = await clientes.find(
      { isActive: true },
      { projection: { endereco: 0, dataNascimento: 0 } }
    ).sort({ nome: 1 }).toArray();

    res.json(clientes);
  } catch (error) {
    console.error('Get clientes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= MEDICOES =============

// Create Medicao
app.post('/api/medicoes', authenticateToken, async (req, res) => {
  try {
    const { agendamentoId, clienteId, lojaId, responsavelMedicao, dataMedicao, tipoMedicao, medidas, observacoes } = req.body;

    if (!agendamentoId || !clienteId || !lojaId) {
      return res.status(400).json({ error: 'Agendamento, cliente e loja são obrigatórios' });
    }

    const medicoesCollection = db.collection('medicoes');
    const newMedicao = {
      id: uuidv4(),
      agendamentoId,
      clienteId,
      lojaId,
      responsavelMedicao: responsavelMedicao || req.user.id,
      dataMedicao: dataMedicao || new Date(),
      tipoMedicao: tipoMedicao || 'outros',
      medidas: medidas || {},
      observacoes: observacoes || '',
      fotos: [],
      arquivos: [],
      status: 'em_andamento',
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    await medicoesCollection.insertOne(newMedicao);

    res.status(201).json({
      message: 'Medição criada com sucesso',
      medicao: {
        id: newMedicao.id,
        agendamentoId: newMedicao.agendamentoId,
        clienteId: newMedicao.clienteId,
        lojaId: newMedicao.lojaId,
        status: newMedicao.status,
        createdAt: newMedicao.createdAt
      }
    });
  } catch (error) {
    console.error('Create medicao error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Medicoes
app.get('/api/medicoes', authenticateToken, async (req, res) => {
  try {
    const medicoesCollection = db.collection('medicoes');
    const medicoes = await medicoes.find(
      { isActive: true },
      { projection: { medidas: 0, fotos: 0, arquivos: 0 } }
    ).sort({ createdAt: -1 }).toArray();

    res.json(medicoes);
  } catch (error) {
    console.error('Get medicoes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= PROJETOS =============

// Create Projeto
app.post('/api/projetos', authenticateToken, async (req, res) => {
  try {
    const { medicaoId, clienteId, lojaId, nomeProjeto, descricao, tipoProjeto, materiais, valorTotal, prazoEntrega } = req.body;

    if (!medicaoId || !clienteId || !nomeProjeto) {
      return res.status(400).json({ error: 'Medição, cliente e nome do projeto são obrigatórios' });
    }

    const projetosCollection = db.collection('projetos');
    const newProjeto = {
      id: uuidv4(),
      medicaoId,
      clienteId,
      lojaId,
      nomeProjeto,
      descricao: descricao || '',
      tipoProjeto: tipoProjeto || 'outros',
      materiais: materiais || [],
      valorTotal: valorTotal || 0,
      prazoEntrega: prazoEntrega || null,
      status: 'orcamento',
      arquivos: [],
      aprovadoPor: null,
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    await projetosCollection.insertOne(newProjeto);

    res.status(201).json({
      message: 'Projeto criado com sucesso',
      projeto: {
        id: newProjeto.id,
        medicaoId: newProjeto.medicaoId,
        clienteId: newProjeto.clienteId,
        nomeProjeto: newProjeto.nomeProjeto,
        status: newProjeto.status,
        valorTotal: newProjeto.valorTotal,
        createdAt: newProjeto.createdAt
      }
    });
  } catch (error) {
    console.error('Create projeto error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Projetos
app.get('/api/projetos', authenticateToken, async (req, res) => {
  try {
    const projetosCollection = db.collection('projetos');
    const projetos = await projetos.find(
      { isActive: true },
      { projection: { materiais: 0, arquivos: 0 } }
    ).sort({ createdAt: -1 }).toArray();

    res.json(projetos);
  } catch (error) {
    console.error('Get projetos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= FINANCEIRO =============

// Create Movimento Financeiro
app.post('/api/financeiro', authenticateToken, async (req, res) => {
  try {
    const { projetoId, clienteId, tipo, categoria, descricao, valor, dataMovimento, formaPagamento } = req.body;

    if (!tipo || !descricao || valor === undefined) {
      return res.status(400).json({ error: 'Tipo, descrição e valor são obrigatórios' });
    }

    const financeiroCollection = db.collection('financeiro');
    const newMovimento = {
      id: uuidv4(),
      projetoId: projetoId || null,
      clienteId: clienteId || null,
      tipo,
      categoria: categoria || 'outros',
      descricao,
      valor: parseFloat(valor),
      dataMovimento: dataMovimento || new Date(),
      formaPagamento: formaPagamento || 'outros',
      status: 'pendente',
      comprovante: '',
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    await financeiroCollection.insertOne(newMovimento);

    res.status(201).json({
      message: 'Movimento financeiro criado com sucesso',
      movimento: {
        id: newMovimento.id,
        tipo: newMovimento.tipo,
        descricao: newMovimento.descricao,
        valor: newMovimento.valor,
        status: newMovimento.status,
        createdAt: newMovimento.createdAt
      }
    });
  } catch (error) {
    console.error('Create financeiro error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Financeiro
app.get('/api/financeiro', authenticateToken, async (req, res) => {
  try {
    const financeiroCollection = db.collection('financeiro');
    const financeiro = await financeiro.find(
      { isActive: true }
    ).sort({ dataMovimento: -1 }).toArray();

    res.json(financeiro);
  } catch (error) {
    console.error('Get financeiro error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= NOTIFICACOES =============

// Create Notificacao
app.post('/api/notificacoes', authenticateToken, async (req, res) => {
  try {
    const { usuarioId, titulo, mensagem, tipo, origem, origemId } = req.body;

    if (!usuarioId || !titulo || !mensagem) {
      return res.status(400).json({ error: 'Usuário, título e mensagem são obrigatórios' });
    }

    const notificacoesCollection = db.collection('notificacoes');
    const newNotificacao = {
      id: uuidv4(),
      usuarioId,
      titulo,
      mensagem,
      tipo: tipo || 'info',
      origem: origem || 'sistema',
      origemId: origemId || null,
      lida: false,
      dataLeitura: null,
      createdAt: new Date(),
      isActive: true
    };

    await notificacoesCollection.insertOne(newNotificacao);

    res.status(201).json({
      message: 'Notificação criada com sucesso',
      notificacao: {
        id: newNotificacao.id,
        usuarioId: newNotificacao.usuarioId,
        titulo: newNotificacao.titulo,
        tipo: newNotificacao.tipo,
        lida: newNotificacao.lida,
        createdAt: newNotificacao.createdAt
      }
    });
  } catch (error) {
    console.error('Create notificacao error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Notificacoes do Usuário
app.get('/api/notificacoes', authenticateToken, async (req, res) => {
  try {
    const notificacoesCollection = db.collection('notificacoes');
    const notificacoes = await notificacoes.find(
      { usuarioId: req.user.id, isActive: true }
    ).sort({ createdAt: -1 }).toArray();

    res.json(notificacoes);
  } catch (error) {
    console.error('Get notificacoes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Marcar Notificação como Lida
app.put('/api/notificacoes/:notificacaoId/lida', authenticateToken, async (req, res) => {
  try {
    const { notificacaoId } = req.params;

    const notificacoesCollection = db.collection('notificacoes');
    const result = await notificacoesCollection.updateOne(
      { id: notificacaoId, usuarioId: req.user.id },
      { 
        $set: { 
          lida: true,
          dataLeitura: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Notificação not found' });
    }

    res.json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    console.error('Mark notificacao as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
connectToDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
