import React from 'react';
import { FaCalendarAlt, FaChartBar, FaHome, FaSignOutAlt, FaList, FaTable, FaUsers } from 'react-icons/fa';

const Navbar = ({ user, currentView, onViewChange, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FaHome },
    { id: 'pendentes', label: 'Agendamentos Pendentes', icon: FaCalendarAlt },
    { id: 'lista', label: 'Lista Completa', icon: FaTable },
    { id: 'status', label: 'Status Dashboard', icon: FaChartBar },
    ...(user.role === 'admin' ? [{ id: 'admin', label: 'Gerenciar Usuários', icon: FaUsers }] : [])
  ];

  const handleNavClick = (viewId) => {
    if (onViewChange) {
      onViewChange(viewId);
    } else {
      // Fallback: usar navegação direta do HashRouter
      window.location.hash = `#/${viewId}`;
    }
  };

  return (
    <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg">
              <FaCalendarAlt className="text-white text-sm sm:text-xl" />
            </div>
            <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-white">Agenda Medição</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 text-sm ${
                    currentView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="text-base" />
                  <span className="hidden xl:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tablet Navigation */}
          <div className="hidden md:flex lg:hidden items-center space-x-1">
            {navItems.slice(0, 4).map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
                    currentView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title={item.label}
                >
                  <Icon className="text-base" />
                </button>
              );
            })}
            {navItems.length > 4 && (
              <div className="relative group">
                <button
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
                    navItems.slice(4).some(item => currentView === item.id)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title="Mais opções"
                >
                  <FaList className="text-base" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {navItems.slice(4).map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-left transition-colors duration-200 ${
                          currentView === item.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <Icon className="text-base" />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-xs sm:text-sm font-medium truncate max-w-24 sm:max-w-none">{user.email}</p>
              <p className="text-slate-400 text-xs">
                {user.role === 'admin' ? 'Administrador' : 'Usuário'}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 sm:space-x-2 bg-red-600 hover:bg-red-700 text-white px-2 sm:px-4 py-2 rounded-lg transition-colors duration-200 text-xs sm:text-sm"
            >
              <FaSignOutAlt className="text-sm sm:text-base" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden border-t border-white/10 py-2">
          <div className="grid grid-cols-4 gap-1">
            {navItems.slice(0, 4).map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors duration-200 ${
                    currentView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="text-base mb-1" />
                  <span className="text-xs text-center leading-tight">{item.label.split(' ')[0]}</span>
                </button>
              );
            })}
            {navItems.length > 4 && (
              <div className="relative group">
                <button
                  className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors duration-200 w-full ${
                    navItems.slice(4).some(item => currentView === item.id)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <FaList className="text-base mb-1" />
                  <span className="text-xs text-center leading-tight">Mais</span>
                </button>
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {navItems.slice(4).map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-left transition-colors duration-200 ${
                          currentView === item.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <Icon className="text-base" />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
