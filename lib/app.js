// Aplicação Express única, usada tanto pelo servidor local (server.js)
// quanto pela função serverless do Vercel (api/index.js).
const express = require('express');
const cors = require('cors');
const { Pool, types } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// DATE (1082) e TIME (1083) chegam como texto puro ("2026-01-22", "14:00:00"),
// evitando deslocamento de fuso horário ao converter para Date.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1083, (v) => v);

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const DEV_JWT_SECRET = 'dev-only-jwt-secret';

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (IS_PRODUCTION) {
    throw new Error('JWT_SECRET não configurado no ambiente');
  }
  return DEV_JWT_SECRET;
}

// ============= BANCO DE DADOS =============

function buildPoolConfig() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    'postgresql://localhost:5432/agenda-medicao';

  let host = '';
  try {
    host = new URL(connectionString).hostname;
  } catch (e) {
    // string de conexão em outro formato: mantém host vazio
  }
  const isLocal = ['localhost', '127.0.0.1', '::1', ''].includes(host);
  const sslDisabled = process.env.DATABASE_SSL === 'false';

  return {
    connectionString,
    ssl: isLocal || sslDisabled ? false : { rejectUnauthorized: false },
    max: process.env.VERCEL ? 1 : 10
  };
}

let pool = null;
let initPromise = null;

function getPool() {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
    pool.on('error', (err) => console.error('Erro inesperado no pool PostgreSQL:', err.message));
  }
  return pool;
}

// Inicializa tabelas e dados padrão uma única vez por instância.
function ensureDatabase() {
  if (!initPromise) {
    initPromise = initializeDatabase().catch((err) => {
      initPromise = null; // permite nova tentativa na próxima requisição
      throw err;
    });
  }
  return initPromise;
}

async function initializeDatabase() {
  const db = getPool();

  // Nomes sem aspas: o PostgreSQL guarda em minúsculas (nomecliente, isactive...).
  // Mantido assim para continuar compatível com tabelas já existentes.
  await db.query(`
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

  await db.query(`
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

  await createAdminUser(db);
  await createSampleAgendamentos(db);
}

async function createAdminUser(db) {
  const { rows } = await db.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
  if (rows.length > 0) return;

  const email = process.env.ADMIN_EMAIL || 'admin@agenda.com';
  const senha = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(senha, 10);

  await db.query(
    `INSERT INTO users (id, nome, email, password, role, isActive, createdAt)
     VALUES ($1, $2, $3, $4, 'admin', true, NOW())
     ON CONFLICT (email) DO NOTHING`,
    [uuidv4(), 'Administrador', email, hashedPassword]
  );
  console.log(`Usuário admin padrão criado: ${email}`);
}

async function createSampleAgendamentos(db) {
  if (process.env.SEED_SAMPLE_DATA === 'false') return;

  const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM agendamentos');
  if (rows[0].total > 0) return;

  const samples = [
    {
      nomeCliente: 'João Silva', loja: 'Matriz', data: '2026-01-22', hora: '14:00',
      telefone: '(11) 98765-4321', email: 'joao@email.com', tipoImovel: 'Apartamento',
      ambientes: ['Sala', 'Quarto'],
      endereco: { logradouro: 'Rua das Flores', cep: '01234567', numero: '123', complemento: 'Apto 45', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP' },
      servico: 'Medição Predial', observacoes: 'Cliente solicitou medição completa', status: 'confirmado'
    },
    {
      nomeCliente: 'Maria Santos', loja: 'Filial', data: '2026-01-23', hora: '10:00',
      telefone: '(11) 91234-5678', email: 'maria@email.com', tipoImovel: 'Casa',
      ambientes: ['Cozinha', 'Banheiro'],
      endereco: { logradouro: 'Avenida Principal', cep: '02345678', numero: '456', complemento: '', bairro: 'Jardins', cidade: 'São Paulo', estado: 'SP' },
      servico: 'Medição Residencial', observacoes: 'Medição para reforma', status: 'pendente'
    }
  ];

  for (const sample of samples) {
    await insertAgendamento(db, sample);
  }
  console.log('Agendamentos de exemplo criados');
}

// ============= CONVERSÃO DE DADOS =============

// Colunas da tabela agendamentos -> nome do campo usado pelo frontend.
const AGENDAMENTO_FIELDS = {
  nomecliente: 'nomeCliente',
  loja: 'loja',
  data: 'data',
  hora: 'hora',
  telefone: 'telefone',
  email: 'email',
  tipoimovel: 'tipoImovel',
  ambientes: 'ambientes',
  servico: 'servico',
  observacoes: 'observacoes',
  status: 'status'
};

// Campos de endereço: o frontend usa um objeto `endereco`, o banco usa colunas.
const ENDERECO_FIELDS = {
  endereco: 'logradouro',
  cep: 'cep',
  numero: 'numero',
  complemento: 'complemento',
  bairro: 'bairro',
  cidade: 'cidade',
  estado: 'estado'
};

function normalizeAmbientes(value) {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {
      // não é JSON: trata como lista separada por vírgula
    }
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

// Converte uma linha do banco no formato esperado pelo frontend.
function toAgendamento(row) {
  const result = { id: row.id };
  for (const [column, field] of Object.entries(AGENDAMENTO_FIELDS)) {
    result[field] = row[column] ?? '';
  }
  result.hora = result.hora ? String(result.hora).slice(0, 5) : '';
  result.ambientes = normalizeAmbientes(row.ambientes) || [];

  result.endereco = {};
  for (const [column, field] of Object.entries(ENDERECO_FIELDS)) {
    result.endereco[field] = row[column] ?? '';
  }
  result.createdAt = row.createdat;
  result.updatedAt = row.updatedat;
  return result;
}

// Converte o corpo da requisição em { coluna: valor } (apenas campos enviados).
function fromAgendamentoBody(body) {
  const values = {};
  for (const [column, field] of Object.entries(AGENDAMENTO_FIELDS)) {
    if (body[field] !== undefined) values[column] = body[field];
  }
  if (values.ambientes !== undefined) values.ambientes = normalizeAmbientes(values.ambientes);
  if (values.data === '') values.data = null;
  if (values.hora === '') values.hora = null;

  // Endereço pode vir como objeto (frontend) ou como campos soltos.
  const endereco = body.endereco;
  if (endereco && typeof endereco === 'object') {
    for (const [column, field] of Object.entries(ENDERECO_FIELDS)) {
      if (endereco[field] !== undefined) values[column] = endereco[field];
    }
  } else if (typeof endereco === 'string') {
    values.endereco = endereco;
  }
  for (const column of ['cep', 'numero', 'complemento', 'bairro', 'cidade', 'estado']) {
    if (body[column] !== undefined && values[column] === undefined) values[column] = body[column];
  }
  return values;
}

async function insertAgendamento(db, body) {
  const values = {
    status: 'pendente',
    servico: 'Medição Padrão',
    ...fromAgendamentoBody(body)
  };
  const columns = ['id', ...Object.keys(values), 'createdat', 'updatedat'];
  const params = [uuidv4(), ...Object.values(values)];
  const placeholders = params.map((_, i) => `$${i + 1}`);

  const { rows } = await db.query(
    `INSERT INTO agendamentos (${columns.join(', ')})
     VALUES (${placeholders.join(', ')}, NOW(), NOW())
     RETURNING *`,
    params
  );
  return toAgendamento(rows[0]);
}

function toUser(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    role: row.role,
    ativo: row.isactive,
    createdAt: row.createdat
  };
}

// ============= MIDDLEWARES =============

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token de acesso obrigatório' });
  }

  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}

// Encapsula handlers assíncronos para enviar erros ao tratador central.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ============= APLICAÇÃO =============

const app = express();
app.use(cors());
app.use(express.json());

// No Vercel as rotas podem chegar sem o prefixo /api (ex.: rewrites antigos).
app.use((req, res, next) => {
  if (!req.url.startsWith('/api')) req.url = '/api' + (req.url === '/' ? '' : req.url);
  next();
});

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'API Agenda Medição em execução' });
});

router.get('/health', asyncHandler(async (req, res) => {
  await ensureDatabase();
  await getPool().query('SELECT 1');
  res.json({ success: true, database: 'ok' });
}));

// Todas as rotas abaixo precisam do banco inicializado.
router.use(asyncHandler(async (req, res, next) => {
  await ensureDatabase();
  next();
}));

// ----- Autenticação -----

router.post('/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  const { rows } = await getPool().query(
    'SELECT * FROM users WHERE (nome = $1 OR email = $1) AND isActive = true',
    [username]
  );
  const user = rows[0];
  const valid = user && (await bcrypt.compare(password, user.password));
  if (!valid) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: '24h' }
  );

  res.json({ token, user: toUser(user) });
}));

router.get('/auth/me', authenticateToken, asyncHandler(async (req, res) => {
  const { rows } = await getPool().query('SELECT * FROM users WHERE id = $1 AND isActive = true', [req.user.id]);
  if (!rows[0]) return res.status(401).json({ error: 'Usuário não encontrado' });
  res.json(toUser(rows[0]));
}));

// ----- Usuários (admin) -----

router.get('/users', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { rows } = await getPool().query('SELECT * FROM users ORDER BY createdAt DESC');
  res.json(rows.map(toUser));
}));

async function createUser(req, res) {
  const { nome, email, senha, role, ativo } = req.body || {};
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const hashedPassword = await bcrypt.hash(senha, 10);
  try {
    const { rows } = await getPool().query(
      `INSERT INTO users (id, nome, email, password, role, isActive, createdAt)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [uuidv4(), nome, email, hashedPassword, role === 'admin' ? 'admin' : 'user', ativo !== false]
    );
    res.status(201).json({ success: true, message: 'Usuário criado com sucesso', data: toUser(rows[0]) });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Email já cadastrado' });
    throw error;
  }
}

router.post('/users', authenticateToken, requireAdmin, asyncHandler(createUser));
router.post('/users/register', authenticateToken, requireAdmin, asyncHandler(createUser));

router.put('/users/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { nome, email, senha, role, ativo } = req.body || {};
  const sets = [];
  const params = [];
  const add = (column, value) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (nome !== undefined) add('nome', nome);
  if (email !== undefined) add('email', email);
  if (role !== undefined) add('role', role === 'admin' ? 'admin' : 'user');
  if (ativo !== undefined) add('isActive', !!ativo);
  if (senha && senha.trim() !== '') add('password', await bcrypt.hash(senha, 10));
  add('updatedAt', new Date());

  params.push(req.params.id);
  try {
    const result = await getPool().query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`,
      params
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ success: true, message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Email já cadastrado' });
    throw error;
  }
}));

router.delete('/users/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode excluir o próprio usuário' });
  }
  const result = await getPool().query('DELETE FROM users WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ success: true, message: 'Usuário excluído com sucesso' });
}));

// ----- Agendamentos -----

router.get('/agendamentos', authenticateToken, asyncHandler(async (req, res) => {
  const { rows } = await getPool().query('SELECT * FROM agendamentos ORDER BY createdAt DESC');
  res.json(rows.map(toAgendamento));
}));

router.post('/agendamentos', authenticateToken, asyncHandler(async (req, res) => {
  const agendamento = await insertAgendamento(getPool(), req.body || {});
  res.status(201).json({ success: true, message: 'Agendamento criado com sucesso', data: agendamento });
}));

// Atualização parcial: só altera os campos enviados (ex.: apenas { status }).
router.put('/agendamentos/:id', authenticateToken, asyncHandler(async (req, res) => {
  const values = fromAgendamentoBody(req.body || {});
  const columns = Object.keys(values);
  const params = Object.values(values);

  const sets = columns.map((column, i) => `${column} = $${i + 1}`);
  sets.push('updatedAt = NOW()');
  params.push(req.params.id);

  const { rows } = await getPool().query(
    `UPDATE agendamentos SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!rows[0]) return res.status(404).json({ error: 'Agendamento não encontrado' });
  res.json({ success: true, message: 'Agendamento atualizado com sucesso', data: toAgendamento(rows[0]) });
}));

router.delete('/agendamentos/:id', authenticateToken, asyncHandler(async (req, res) => {
  const result = await getPool().query('DELETE FROM agendamentos WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
  res.json({ success: true, message: 'Agendamento excluído com sucesso' });
}));

app.use('/api', router);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Tratador central de erros: registra o detalhe no log, sem expor stack ao cliente.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`Erro em ${req.method} ${req.originalUrl}:`, err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }
  if (err.code === '22P02' || err.code === '22007' || err.code === '22008') {
    return res.status(400).json({ error: 'Dados inválidos' });
  }
  res.status(500).json({ error: 'Erro interno do servidor' });
});

module.exports = app;
module.exports.ensureDatabase = ensureDatabase;
