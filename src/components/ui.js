import React, { useEffect, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';

// ============= Dados compartilhados =============

export const LOJAS = [
  'Diana D1', 'Diana D2', 'Diana D3', 'Diana D4',
  'Marquise Planejados', 'By Estilo', 'Anfelle',
  'Planejados', 'Rassul Planejados', 'Miralli Móveis', 'Outros'
];

const AMBIENTES_CASA = [
  'Sala de Estar', 'Sala de Jantar', 'Cozinha', 'Quarto Principal',
  'Quarto Secundário', 'Banheiro Social', 'Banheiro Suíte',
  'Área de Serviço', 'Garagem', 'Jardim', 'Varanda'
];

const AMBIENTES_APARTAMENTO = [
  'Sala de Estar', 'Sala de Jantar', 'Cozinha', 'Quarto Principal',
  'Quarto Secundário', 'Banheiro Social', 'Banheiro Suíte',
  'Área de Serviço', 'Varanda Gourmet', 'Sacada', 'Dormitório'
];

export const ambientesPorTipo = (tipoImovel) =>
  tipoImovel === 'casa' ? AMBIENTES_CASA : AMBIENTES_APARTAMENTO;

const STATUS = {
  pendente: { label: 'Pendente', badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  confirmado: { label: 'Confirmado', badge: 'bg-green-500/15 text-green-300 border-green-500/30' },
  cancelado: { label: 'Cancelado', badge: 'bg-red-500/15 text-red-300 border-red-500/30' },
  concluido: { label: 'Concluído', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  agendar: { label: 'A agendar', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }
};

export const statusLabel = (status) => (STATUS[status] ? STATUS[status].label : status || 'Sem status');

// ============= Formatação =============

// A API devolve a data como texto "AAAA-MM-DD". Converter com new Date()
// trataria como UTC e mostraria o dia anterior no fuso do Brasil.
const partesDaData = (valor) => /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor || ''));

export const formatDate = (valor) => {
  if (!valor) return 'Sem data';
  const p = partesDaData(valor);
  if (p) return `${p[3]}/${p[2]}/${p[1]}`;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? 'Sem data' : d.toLocaleDateString('pt-BR');
};

// Valor para <input type="date">
export const dateInputValue = (valor) => {
  const p = partesDaData(valor);
  return p ? `${p[1]}-${p[2]}-${p[3]}` : '';
};

export const hojeISO = () => {
  const d = new Date();
  const dois = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
};

export const formatEndereco = (endereco) => {
  if (!endereco) return '';
  const rua = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ');
  const regiao = [endereco.bairro, endereco.cidade].filter(Boolean).join(' - ');
  return [rua, regiao].filter(Boolean).join(' · ');
};

// ============= Componentes =============

export const StatusBadge = ({ status, className = '' }) => {
  const info = STATUS[status];
  const cores = info ? info.badge : 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border whitespace-nowrap ${cores} ${className}`}>
      {statusLabel(status)}
    </span>
  );
};

export const PageHeader = ({ icon: Icon, title, subtitle, children }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 sm:mb-6">
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 bg-blue-600 rounded-xl shrink-0">
          <Icon className="text-white text-lg" />
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

export const Spinner = ({ label = 'Carregando...' }) => (
  <div className="py-12 text-center">
    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400" />
    <p className="text-slate-300 mt-4">{label}</p>
  </div>
);

export const EmptyState = ({ icon: Icon, children }) => (
  <div className="py-10 px-4 text-center">
    {Icon && <Icon className="text-3xl text-slate-500 mx-auto mb-3" />}
    <p className="text-slate-300">{children}</p>
  </div>
);

export const Alert = ({ type = 'error', children }) => (
  <div
    role="status"
    className={`p-3 sm:p-4 rounded-lg border text-sm sm:text-base ${
      type === 'success'
        ? 'bg-green-600/20 text-green-300 border-green-600/30'
        : 'bg-red-600/20 text-red-300 border-red-600/30'
    }`}
  >
    {children}
  </div>
);

// Janela modal: no celular sobe como painel colado na base da tela, com o
// conteúdo rolando por dentro e o rodapé (botões) sempre visível.
export const Modal = ({ title, icon: Icon, onClose, footer, size = 'sm:max-w-3xl', children }) => {
  const painel = useRef(null);

  useEffect(() => {
    const aoTeclar = (e) => {
      if (e.key !== 'Escape') return;
      // Com janelas empilhadas (ex.: edição + confirmação), só a de cima fecha
      const abertas = document.querySelectorAll('[role="dialog"]');
      if (abertas[abertas.length - 1] === painel.current) onClose();
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', aoTeclar);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [onClose]);

  return (
    <div
      ref={painel}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`modal-panel w-full ${size} flex flex-col bg-slate-800 border border-slate-600 shadow-2xl rounded-t-2xl sm:rounded-2xl`}>
        <div className="flex items-center justify-between gap-3 pl-4 pr-2 sm:pl-6 sm:pr-4 py-2 border-b border-slate-700 shrink-0">
          <h2 className="flex items-center gap-2.5 text-lg font-semibold text-white min-w-0">
            {Icon && <Icon className="text-blue-400 shrink-0" />}
            <span className="truncate">{title}</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="btn-icon text-slate-300 hover:bg-white/10 hover:text-white shrink-0">
            <FaTimes />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 px-4 sm:px-6 pt-3 border-t border-slate-700" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
