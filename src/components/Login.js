import React, { useState } from 'react';
import { FaUser, FaLock, FaCalendarAlt, FaUserShield } from 'react-icons/fa';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await onLogin(email, password);
      // O authService retorna direto os dados, não um objeto com success
      if (result) {
        // Login bem-sucedido, o componente pai vai tratar
      } else {
        setError('Credenciais inválidas');
      }
    } catch (error) {
      setError(error.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
            {isAdminMode ? (
              <FaUserShield className="text-white text-3xl" />
            ) : (
              <FaCalendarAlt className="text-white text-3xl" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isAdminMode ? 'Área Administrativa' : 'Agenda Medição'}
          </h1>
          <p className="text-slate-300 text-sm">
            {isAdminMode ? 'Acesso restrito a administradores' : 'Sistema de Agendamento Profissional'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-600/20 border border-red-600/30 rounded-lg">
            <p className="text-red-300 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo Email */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaUser className="text-slate-400" />
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              placeholder={isAdminMode ? "admin@agenda.com" : "E-mail profissional"}
              required
            />
          </div>

          {/* Campo Senha */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaLock className="text-slate-400" />
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              placeholder={isAdminMode ? "admin123" : "Senha"}
              required
            />
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Autenticando...
              </span>
            ) : (
              isAdminMode ? 'Acessar Admin' : 'Entrar'
            )}
          </button>
        </form>

        {/* Modo Administrativo */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsAdminMode(!isAdminMode);
              setError('');
              setEmail('');
              setPassword('');
            }}
            className="text-slate-300 hover:text-white text-sm transition-colors duration-200"
          >
            {isAdminMode ? '← Voltar para Login' : '→ Acesso Administrativo'}
          </button>
        </div>

        {/* Informações de Rodapé */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-slate-400 text-xs">
            © 2026 Agenda Medição. Todos os direitos reservados.
          </p>
          {isAdminMode && (
            <p className="text-slate-500 text-xs mt-2">
              Admin padrão: admin@agenda.com / admin123
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
