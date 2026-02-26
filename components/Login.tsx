
import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, Clock, Eye, EyeOff } from 'lucide-react';
import { APP_INFO } from '../config/app';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { login, loginAlert } = useAuth();
  const [inputID, setInputID] = useState('');
  const [internalError, setInternalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalError('');
    
    const trimmedID = inputID.trim();
    if (!trimmedID) {
      setInternalError('Por favor, insira seu ID.');
      return;
    }

    setIsLoading(true);
    try {
        const success = await login(trimmedID);
        if (!success) {
            setInternalError('ID não encontrado.');
            setIsLoading(false);
        }
    } catch (err: any) {
        setInternalError(err.message || 'Erro de conexão. Tente novamente.');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-lm-yellow/20 dark:bg-lm-yellow/10 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/40 dark:bg-blue-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-soft border border-white/50 dark:border-zinc-800 p-8 md:p-10 transition-colors">
            
            <div className="text-center mb-10">
                <div className="flex justify-center mb-6">
                    <img 
                        src="https://i.imgur.com/jLQaW2W.png" 
                        alt="L&M Logo" 
                        className="h-20 w-auto object-contain drop-shadow-md dark:hidden"
                    />
                    <img 
                        src="https://i.imgur.com/65bHdqS.png" 
                        alt="L&M Logo Dark" 
                        className="h-20 w-auto object-contain drop-shadow-md hidden dark:block"
                    />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{APP_INFO.name}</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Gestão de Obrigações Fiscais & Contábeis</p>
            </div>

            {loginAlert && !internalError && (
                <div className={`flex items-start gap-3 text-sm p-4 rounded-xl border animate-fade-in mb-6 ${
                    loginAlert.type === 'warning' 
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/50 text-orange-800 dark:text-orange-200'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-200'
                }`}>
                    <Clock size={20} className="shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold block mb-0.5">{loginAlert.type === 'warning' ? 'Sessão Expirada' : 'Aviso'}</span>
                        <span className="leading-snug opacity-90">{loginAlert.message}</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label htmlFor="id" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 ml-1">
                        ID de Acesso
                    </label>
                    <div className="relative group">
                        <input
                            id="id"
                            type={showPassword ? "text" : "password"}
                            value={inputID}
                            onChange={(e) => setInputID(e.target.value)}
                            placeholder="Insira seu ID de entrada"
                            className="w-full pl-5 pr-12 py-4 bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-700 rounded-xl text-lg font-mono text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-lm-yellow/50 focus:border-lm-yellow transition-all shadow-sm group-hover:bg-white dark:group-hover:bg-zinc-900"
                            autoFocus
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {internalError && (
                    <div className="flex items-center gap-3 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50 animate-fade-in">
                        <AlertCircle size={18} className="shrink-0" />
                        <span className="font-semibold">{internalError}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full bg-lm-dark dark:bg-lm-yellow text-white dark:text-gray-900 font-bold py-4 rounded-xl hover:bg-black dark:hover:bg-yellow-400 transition-all transform flex items-center justify-center gap-2 shadow-lg shadow-gray-200 dark:shadow-none group ${isLoading ? 'opacity-80 cursor-wait' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                             <Loader2 size={20} className="animate-spin" />
                             <span>Verificando Acesso...</span>
                        </div>
                    ) : (
                        <>
                            <span>Entrar no Sistema</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800 text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    &copy; 2026 L&M Assessoria Contábil
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
