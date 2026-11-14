import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCalendarAlt, FaChartBar, FaHome, FaSignOutAlt, FaTable, FaUsers, FaClock } from 'react-icons/fa';

const Navbar = ({ user, currentView, onLogout }) => {
  const navigate = useNavigate();

  const navItems = [
    { id: 'dashboard', label: 'Início', title: 'Dashboard', icon: FaHome },
    { id: 'pendentes', label: 'Pendentes', title: 'Agendamentos Pendentes', icon: FaClock },
    { id: 'lista', label: 'Lista', title: 'Lista Completa', icon: FaTable },
    { id: 'status', label: 'Status', title: 'Status dos Agendamentos', icon: FaChartBar },
    ...(user.role === 'admin' ? [{ id: 'admin', label: 'Usuários', title: 'Gerenciar Usuários', icon: FaUsers }] : [])
  ];

  // O formulário é aberto a partir de Pendentes, então destaca essa aba
  const ativo = currentView === 'formulario' ? 'pendentes' : currentView;
  const nomeUsuario = user.nome || user.email;

  return (
    <>
      {/* Barra superior */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 h-14 md:h-16">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 min-h-[44px] shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Agenda Medição - ir para o início"
          >
            <span className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg">
              <FaCalendarAlt className="text-white" />
            </span>
            <span className="text-base lg:text-lg font-bold text-white whitespace-nowrap md:hidden lg:inline">Agenda Medição</span>
          </button>

          {/* Navegação no topo: tablet e desktop */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selecionado = ativo === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/${item.id}`)}
                  title={item.title}
                  aria-current={selecionado ? 'page' : undefined}
                  className={`flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    selecionado ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 min-w-0">
            <div className="text-right min-w-0 hidden sm:block md:hidden xl:block">
              <p className="text-white text-sm font-medium truncate max-w-[14rem]">{nomeUsuario}</p>
              <p className="text-slate-400 text-xs">{user.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sair"
              title="Sair"
              className="btn btn-danger px-3 shrink-0"
            >
              <FaSignOutAlt />
              <span className="hidden lg:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Barra inferior: celular */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 safe-bottom"
        aria-label="Navegação principal"
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const selecionado = ativo === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/${item.id}`)}
                aria-current={selecionado ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-[56px] px-1 text-[11px] font-medium transition-colors focus:outline-none focus-visible:bg-white/10 ${
                  selecionado ? 'text-blue-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${selecionado ? 'bg-blue-600/25' : ''}`}>
                  <Icon className="text-lg" />
                </span>
                <span className="truncate max-w-full">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
