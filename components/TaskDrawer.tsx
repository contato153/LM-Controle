

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckSquare, Plus, Trash2, Save, Loader2, AlignLeft, History, CalendarClock, User, MessageSquare, Send, Calendar, MoreVertical, Edit2, Check, Image as ImageIcon, Eye, EyeOff, Paperclip, ChevronDown } from 'lucide-react';
import { CompanyTask, TaskDetail, ChecklistItem, TaskComment, getEffectivePriority, Collaborator } from '../types';
import { saveTaskDetail, fetchTaskDetail, fetchLogs, fetchComments, saveComment, updateComment, deleteComment, sendNotification } from '../services/sheetService';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';

interface TaskDrawerProps {
  task: CompanyTask;
  isOpen: boolean;
  onClose: () => void;
  onNotify: (title: string, message: string) => void;
}

interface LogEntry {
    timestamp: string;
    description: string;
    user: string;
}

// --- HELPER: Compress Image to Base64 (To fit in Sheets Cell) ---
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Reduzido para 450px e qualidade 0.5 para garantir < 50k caracteres (Limite Célula Sheets)
                const MAX_WIDTH = 450; 
                const scaleSize = MAX_WIDTH / img.width;
                const width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
                const height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Qualidade 0.5 para reduzir caracteres
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5); 
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

// --- HELPER: Get Initials ---
const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// --- HELPER: Rich Text Renderer (Markdown Images + Mentions) ---
const RichTextRenderer: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;

    // Regex para capturar Imagens Markdown: ![alt](url)
    // Regex para capturar Menções: @Nome
    // Dividimos o texto em partes para renderizar
    const parts = text.split(/(!\[.*?\]\(.*?\)|@[\wÀ-ÿ]+(?: [\wÀ-ÿ]+)?)/g);

    return (
        <span className="whitespace-pre-wrap break-words break-all md:break-word leading-relaxed text-gray-800 dark:text-gray-200">
            {parts.map((part, i) => {
                // Render Image
                const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
                if (imgMatch) {
                    return (
                        <div key={i} className="my-3 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-black/20 shadow-sm inline-block max-w-full">
                            <img 
                                src={imgMatch[2]} 
                                alt={imgMatch[1] || 'Imagem anexa'} 
                                className="max-w-full h-auto max-h-[300px] object-contain mx-auto block"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </div>
                    );
                }

                // Render Mention (Estilo Aprimorado)
                const mentionMatch = part.match(/^@([\wÀ-ÿ]+(?: [\wÀ-ÿ]+)?)/);
                if (mentionMatch) {
                    return (
                        <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 align-middle select-none">
                            {part}
                        </span>
                    );
                }

                // Render URLs (Simple Link detection)
                const urlMatch = part.match(/^(https?:\/\/[^\s]+)/);
                 if (urlMatch) {
                     return (
                         <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all font-medium">
                             {part}
                         </a>
                     )
                 }

                return part;
            })}
        </span>
    );
};

// --- HELPER: Date Conversion ---
const toIsoDate = (brDate?: string) => {
    if (!brDate || brDate.length !== 10) return '';
    const [day, month, year] = brDate.split('/');
    return `${year}-${month}-${day}`;
};

const toBrDate = (isoDate: string) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
};

const formatLogDescription = (description: string) => {
  const regex = /Alteração em \[.*?\]:\s*(\w+)\s*->\s*(.*)/;
  const match = description.match(regex);

  if (!match) return <RichTextRenderer text={description} />;

  const [, field, value] = match;
  const fieldMap: Record<string, string> = {
    respFiscal: 'Responsável Fiscal', statusFiscal: 'Status Fiscal',
    respContabil: 'Responsável Contábil', statusContabil: 'Status Contábil',
    statusLucro: 'Distribuição de Lucro', statusReinf: 'Status Reinf',
    statusECD: 'Status ECD', statusECF: 'Status ECF', respECF: 'Resp. ECD/ECF',
    prioridade: 'Prioridade', regime: 'Regime', cnpj: 'CNPJ',
    dueDate: 'Data de Vencimento', name: 'Nome da Empresa'
  };

  const friendlyField = fieldMap[field] || field;
  const friendlyValue = value.trim() === '' ? 'Vazio' : value;

  return (
    <span>
      Alterou <strong className="text-gray-900 dark:text-white font-semibold">{friendlyField}</strong> para 
      <span className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 whitespace-normal break-all">
        {friendlyValue}
      </span>
    </span>
  );
};

const TaskDrawer: React.FC<TaskDrawerProps> = ({ task: propTask, isOpen, onClose, onNotify }) => {
  const { currentUser, isAdmin } = useAuth();
  const { updateTask, collaborators, tasks } = useTasks();
  
  // Use a versão mais recente da tarefa do contexto, se disponível
  const task = tasks.find(t => t.id === propTask.id) || propTask;
  
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('comments');
  
  // Details State
  const [description, setDescription] = useState('');
  const [isDescPreviewMode, setIsDescPreviewMode] = useState(false); // Toggle View/Edit
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newItemText, setNewItemText] = useState('');

  // History State
  const [historyLogs, setHistoryLogs] = useState<LogEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Comments State
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  
  // UI Helpers
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [deleteConfirmMode, setDeleteConfirmMode] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef(description);
  
  // File Input Refs
  const fileInputCommentRef = useRef<HTMLInputElement>(null);
  const fileInputDescRef = useRef<HTMLInputElement>(null);
  
  // --- MENTION SYSTEM STATE ---
  const [mentionQuery, setMentionQuery] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionTarget, setMentionTarget] = useState<'comment' | 'description' | null>(null);
  const [mentionCursorIndex, setMentionCursorIndex] = useState(0);
  
  // Refs para inputs para posicionar o menu
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);

  const effectivePriority = getEffectivePriority(task);

  // --- MENTION LOGIC ---
  const filteredCollaborators = useMemo(() => {
      if (!mentionQuery) return collaborators;
      return collaborators.filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase()));
  }, [collaborators, mentionQuery]);

  const handleInputKeyUp = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, target: 'comment' | 'description') => {
      const { value, selectionStart } = e.currentTarget;
      
      const lastAt = value.lastIndexOf('@', selectionStart || 0);
      
      if (lastAt !== -1) {
          const textAfterAt = value.substring(lastAt + 1, selectionStart || 0);
          if (!textAfterAt.includes('\n')) {
              setMentionQuery(textAfterAt);
              setIsMentionOpen(true);
              setMentionTarget(target);
              setMentionCursorIndex(lastAt);
              return;
          }
      }
      setIsMentionOpen(false);
  };

  const insertMention = (collaborator: Collaborator) => {
      const nameToInsert = `${collaborator.name} `;
      
      if (mentionTarget === 'comment') {
          const before = newComment.substring(0, mentionCursorIndex + 1); // Inclui o @
          const after = newComment.substring(mentionCursorIndex + 1 + mentionQuery.length);
          const newValue = newComment.substring(0, mentionCursorIndex) + '@' + nameToInsert + after;
          
          setNewComment(newValue);
          setTimeout(() => {
              if (commentInputRef.current) {
                  commentInputRef.current.focus();
                  const newCursorPos = mentionCursorIndex + 1 + nameToInsert.length;
                  commentInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
              }
          }, 0);
      } else if (mentionTarget === 'description') {
          const before = description.substring(0, mentionCursorIndex);
          const after = description.substring(mentionCursorIndex + 1 + mentionQuery.length);
          const newValue = before + '@' + nameToInsert + after;
          
          setDescription(newValue);
          setTimeout(() => {
            if (descInputRef.current) {
                descInputRef.current.focus();
                const newCursorPos = mentionCursorIndex + 1 + nameToInsert.length;
                descInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
          }, 0);
      }
      
      setIsMentionOpen(false);
      setMentionQuery('');
  };

  // --- IMAGE UPLOAD LOGIC ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'comment' | 'description') => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          try {
              onNotify('Processando...', 'Comprimindo imagem para envio...');
              const base64 = await compressImage(file);
              
              if (base64.length > 50000) {
                  onNotify('Erro', 'A imagem é muito grande. Tente uma menor ou reduza a qualidade.');
                  return;
              }

              const markdownImg = `![Imagem](${base64})`;
              
              if (target === 'comment') {
                  setNewComment(prev => prev + (prev ? '\n' : '') + markdownImg);
              } else {
                  setDescription(prev => prev + (prev ? '\n' : '') + markdownImg);
              }
          } catch (error) {
              onNotify('Erro', 'Falha ao processar imagem. Tente uma menor.');
          }
      }
      // Reset input
      e.target.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent, target: 'comment' | 'description') => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
              e.preventDefault();
              const file = items[i].getAsFile();
              if (file) {
                  try {
                      onNotify('Processando...', 'Comprimindo imagem colada...');
                      const base64 = await compressImage(file);
                      
                      if (base64.length > 50000) {
                          onNotify('Erro', 'Imagem colada muito grande.');
                          return;
                      }

                      const markdownImg = `![Print](${base64})`;
                      
                      if (target === 'comment') {
                          setNewComment(prev => prev + (prev ? '\n' : '') + markdownImg);
                      } else {
                          setDescription(prev => prev + (prev ? '\n' : '') + markdownImg);
                      }
                  } catch (error) {
                      onNotify('Erro', 'Falha ao colar imagem.');
                  }
              }
              return; // Stop after finding an image
          }
      }
  };

  // --- EFFECTS ---

  useEffect(() => {
    if (isOpen) {
        setActiveTab('comments'); 
        loadDetails(); 
    } else {
        setDescription('');
        setChecklist([]);
        setHistoryLogs([]);
        setComments([]);
        setIsDescPreviewMode(false);
    }
  }, [task.id, isOpen]);

  useEffect(() => {
      if (isOpen) {
          if (activeTab === 'history') loadHistory();
          if (activeTab === 'comments') loadComments();
      }
  }, [activeTab, isOpen, task.id]);
  
  useEffect(() => {
      if (activeTab === 'comments' && commentsEndRef.current) {
          commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [comments, activeTab]);

  // Auto-resize textarea for comments
  useEffect(() => {
      if (commentInputRef.current) {
          commentInputRef.current.style.height = 'auto';
          commentInputRef.current.style.height = `${Math.min(commentInputRef.current.scrollHeight, 120)}px`;
      }
  }, [newComment]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          const target = event.target as Element;
          if (target.closest('.comment-menu-dropdown') || target.closest('.comment-menu-trigger')) return;
          setActiveMenuId(null);
      };
      if (activeMenuId) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);


  // --- DATA LOADING ---

  const loadDetails = async () => {
    setIsLoadingDetails(true);
    const details = await fetchTaskDetail(task.id);
    if (details) {
        setDescription(details.description);
        setChecklist(details.checklist);
        descriptionRef.current = details.description;
    } else {
        setDescription('');
        setChecklist([]);
    }
    setIsLoadingDetails(false);
  };

  const loadHistory = async () => {
      setIsLoadingHistory(true);
      const allLogs = await fetchLogs();
      const filteredLogs = allLogs
          .filter(row => row[3] === task.id)
          .map(row => ({
              timestamp: row[0],
              description: row[1],
              user: row[2]
          }))
          .reverse();

      setHistoryLogs(filteredLogs);
      setIsLoadingHistory(false);
  }

  const loadComments = async (silent = false) => {
      if (!silent) setIsLoadingComments(true);
      const data = await fetchComments(task.id);
      setComments(data);
      if (!silent) setIsLoadingComments(false);
  }

  const checkAndSendMentions = async (text: string, context: 'comment' | 'description') => {
      if (!currentUser) return;
      
      const mentionedCollaborators = collaborators.filter(c => {
          const regex = new RegExp(`@${c.name}`, 'i');
          return regex.test(text) && c.id !== currentUser.id;
      });

      if (mentionedCollaborators.length > 0) {
          const timestamp = new Date().toLocaleString('pt-BR');
          const promises = mentionedCollaborators.map(recipient => 
              sendNotification({
                  id: Date.now().toString() + Math.random().toString().slice(2, 5),
                  recipient: recipient.name,
                  sender: currentUser.name,
                  taskId: task.id,
                  message: context === 'comment' 
                      ? `Mencionou você num comentário em: ${task.name}`
                      : `Mencionou você na descrição de: ${task.name}`,
                  isRead: false,
                  timestamp: timestamp
              })
          );
          await Promise.all(promises);
      }
  };

  const handleSaveDetails = async (newDesc?: string, newChecklist?: ChecklistItem[]) => {
      setIsSaving(true);
      const descToSave = newDesc !== undefined ? newDesc : description;
      const detail: TaskDetail = {
          id: task.id,
          name: task.name,
          description: descToSave,
          checklist: newChecklist !== undefined ? newChecklist : checklist
      };
      await saveTaskDetail(detail);

      if (newDesc !== undefined && newDesc !== descriptionRef.current) {
          await checkAndSendMentions(newDesc, 'description');
      }

      setIsSaving(false);
  };

  const handleSendComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim() || !currentUser) return;

      setIsSendingComment(true);
      try {
          await saveComment(task.id, currentUser.name, newComment);
          await checkAndSendMentions(newComment, 'comment');
          setNewComment('');
          await loadComments(true); 
      } catch (error) {
          onNotify('Erro', 'Não foi possível enviar o comentário');
      }
      setIsSendingComment(false);
  };

  const handleDeleteComment = async (comment: TaskComment) => {
      setActiveMenuId(null);
      if (!comment.rowIndex) return;
      try {
          await deleteComment(comment.rowIndex);
          await loadComments(true); 
          onNotify('Sucesso', 'Comentário removido.');
      } catch (e) {
          onNotify('Erro', 'Falha ao remover comentário.');
      }
  };

  const startEditing = (comment: TaskComment) => {
      const cleanText = comment.text.replace(' (editado)', '');
      setEditingCommentId(comment.id);
      setEditingText(cleanText);
      setActiveMenuId(null);
  };

  const saveEditComment = async (comment: TaskComment) => {
      if (!comment.rowIndex || !editingText.trim()) return;
      try {
          const finalText = editingText.trim() + ' (editado)';
          await updateComment(comment.rowIndex, finalText);
          await checkAndSendMentions(finalText, 'comment');
          await loadComments(true);
          setEditingCommentId(null);
          onNotify('Sucesso', 'Comentário atualizado.');
      } catch (e) {
          onNotify('Erro', 'Falha ao atualizar comentário.');
      }
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isoDate = e.target.value;
      const brDate = toBrDate(isoDate);
      updateTask(task, 'dueDate', brDate);
  };

  const handleDescriptionBlur = () => {
      if (description !== descriptionRef.current) {
          handleSaveDetails(description);
          descriptionRef.current = description;
          onNotify("Descrição Salva", "As notas da tarefa foram atualizadas com sucesso.");
      }
  };

  const addChecklistItem = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemText.trim()) return;
      
      const newItem: ChecklistItem = {
          id: Date.now().toString(),
          text: newItemText,
          isDone: false
      };
      
      const updatedList = [...checklist, newItem];
      setChecklist(updatedList);
      setNewItemText('');
      await handleSaveDetails(undefined, updatedList);
      onNotify("Item Adicionado", "Novo item incluído no checklist.");
  };

  const toggleCheckitem = async (itemId: string) => {
      const item = checklist.find(i => i.id === itemId);
      const willComplete = item && !item.isDone;

      const updatedList = checklist.map(item => 
          item.id === itemId ? { ...item, isDone: !item.isDone } : item
      );
      setChecklist(updatedList);
      await handleSaveDetails(undefined, updatedList);

      if (willComplete) {
          onNotify("Item Concluído", "Parabéns por finalizar mais uma etapa!");
      }
  };

  const deleteCheckitem = async (itemId: string) => {
      const updatedList = checklist.filter(item => item.id !== itemId);
      setChecklist(updatedList);
      await handleSaveDetails(undefined, updatedList);
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-transparent backdrop-blur-[2px] z-40 transition-all duration-300"
        onClick={onClose}
      ></div>

      <div className={`fixed top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-[#09090b] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) border-l border-gray-200 dark:border-zinc-800 animate-slide-in-right`}>
        
        {/* Header */}
        <div className="flex flex-col bg-white dark:bg-[#09090b] z-10 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-start justify-between p-6 pb-2">
                <div className="flex-1 pr-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">#{task.id}</span>
                        
                        <div className="relative">
                            <select 
                                value={task.prioridade || ''}
                                onChange={(e) => updateTask(task, 'prioridade', e.target.value)}
                                className={`appearance-none pl-2 pr-5 py-0.5 rounded text-[10px] font-bold uppercase outline-none border transition-colors cursor-pointer ${
                                    effectivePriority === 'ALTA' 
                                        ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50' 
                                        : effectivePriority === 'MÉDIA' 
                                        ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/50'
                                        : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:border-zinc-700'
                                }`}
                            >
                                <option value="">Auto</option>
                                <option value="BAIXA">Baixa</option>
                                <option value="MÉDIA">Média</option>
                                <option value="ALTA">Alta</option>
                            </select>
                            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        
                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 rounded-md px-2 py-0.5 border border-gray-200 dark:border-zinc-700 hover:border-gray-400 transition-colors">
                            <Calendar size={12} className="text-gray-500" />
                            <input 
                                type="date" 
                                value={toIsoDate(task.dueDate)}
                                onChange={handleDueDateChange}
                                className="bg-transparent text-[10px] font-bold text-gray-700 dark:text-gray-300 outline-none uppercase"
                            />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">{task.name}</h2>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>CNPJ: {task.cnpj}</span>
                        <span>•</span>
                        <span>{task.regime}</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="flex px-6 gap-6 mt-2 overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setActiveTab('comments')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'comments' ? 'border-lm-yellow text-gray-900 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                    <MessageSquare size={16} />
                    Comentários
                </button>
                <button 
                    onClick={() => setActiveTab('details')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'details' ? 'border-lm-yellow text-gray-900 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                    <AlignLeft size={16} />
                    Detalhes
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'history' ? 'border-lm-yellow text-gray-900 dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                    <History size={16} />
                    Histórico
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#FAFAFA] dark:bg-[#09090b]" key={activeTab}>
            
            {/* --- TAB: COMMENTS (CHAT) --- */}
            {activeTab === 'comments' && (
                <div className="flex flex-col h-full animate-enter">
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0 flex flex-col" onScroll={() => setActiveMenuId(null)}>
                        {isLoadingComments ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-10"><Loader2 size={32} className="animate-spin" /><span className="text-sm">Carregando comentários...</span></div>
                        ) : comments.length === 0 ? (
                             <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 py-10"><MessageSquare size={32} className="opacity-20" /><span className="text-sm">Nenhum comentário ainda. Use @Nome para notificar.</span></div>
                        ) : (
                            comments.map((msg) => {
                                const isMe = currentUser && msg.author === currentUser.name;
                                const isEditing = editingCommentId === msg.id;
                                const hasEdited = msg.text.endsWith('(editado)');
                                return (
                                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 self-end mb-5">{getInitials(msg.author)}</div>
                                        <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'} group relative`}>
                                            {isEditing ? (
                                                <div className="flex flex-col gap-2 w-full min-w-[200px]">
                                                    <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-zinc-800 dark:text-white border-gray-300 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-lm-yellow" rows={2} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditComment(msg); } }} />
                                                    <div className="flex gap-2 justify-end"><button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Cancelar</button><button onClick={() => saveEditComment(msg)} className="text-xs bg-lm-yellow text-gray-900 px-3 py-1 rounded-md font-bold">Salvar</button></div>
                                                </div>
                                            ) : (
                                                <div className={`relative px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-lm-yellow text-gray-900 rounded-br-none' : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-zinc-700 rounded-bl-none'}`}>
                                                    <RichTextRenderer text={msg.text.replace(' (editado)', '')} />
                                                    {hasEdited && <span className="text-[9px] opacity-60 ml-2 italic">(editado)</span>}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-1 px-1 mb-2"><span className="text-[10px] text-gray-400 flex items-center gap-1"><span className="font-bold">{msg.author}</span><span>•</span><span>{msg.timestamp}</span></span>
                                                {!isEditing && isMe && (
                                                    <button onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setMenuPos({ top: rect.bottom + 4, left: rect.right }); setActiveMenuId(activeMenuId === msg.id ? null : msg.id); setDeleteConfirmMode(false); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 p-0.5 comment-menu-trigger"><MoreVertical size={12} /></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    <form onSubmit={handleSendComment} className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 relative flex-shrink-0 bg-[#FAFAFA] dark:bg-[#09090b]">
                        <div className="relative">
                            {isMentionOpen && mentionTarget === 'comment' && filteredCollaborators.length > 0 && (
                                <div className="absolute left-0 bottom-full mb-2 w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 z-50 animate-pop-in overflow-hidden">
                                    <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                        Mencionar Colaborador
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {filteredCollaborators.map(c => (
                                            <button 
                                                key={c.id}
                                                type="button"
                                                onClick={() => insertMention(c)}
                                                className="w-full text-left px-3 py-2.5 text-xs hover:bg-lm-yellow/10 dark:hover:bg-zinc-700 flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors border-b border-gray-50 dark:border-zinc-800 last:border-0"
                                            >
                                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-bold">
                                                    {c.name.charAt(0)}
                                                </div>
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <textarea
                                ref={commentInputRef}
                                value={newComment}
                                onChange={(e) => { setNewComment(e.target.value); }}
                                onKeyUp={(e) => handleInputKeyUp(e, 'comment')}
                                onPaste={(e) => handlePaste(e, 'comment')}
                                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(e); } }}
                                placeholder="Escreva... Use @ para mencionar, Cole (Ctrl+V) ou Anexe."
                                className="w-full pl-10 pr-12 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lm-yellow/50 shadow-sm resize-none custom-scrollbar overflow-y-auto"
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                                rows={1}
                                disabled={isSendingComment}
                            />
                            
                            {/* File Upload Button (Hidden Input) */}
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                ref={fileInputCommentRef}
                                onChange={(e) => handleFileUpload(e, 'comment')}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputCommentRef.current?.click()}
                                className="absolute left-2 bottom-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
                                title="Anexar Imagem"
                            >
                                <Paperclip size={18} />
                            </button>

                            <button 
                                type="submit"
                                disabled={!newComment.trim() || isSendingComment}
                                className="absolute right-2 bottom-2.5 p-1.5 text-lm-dark dark:text-lm-yellow hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSendingComment ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- TAB: DETAILS --- */}
            {activeTab === 'details' && (
                <div className="animate-enter pb-10">
                    {isLoadingDetails ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400"><Loader2 size={32} className="animate-spin" /><span className="text-sm">Carregando detalhes...</span></div>
                    ) : (
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-gray-900 dark:text-white font-bold text-sm">
                                    <div className="flex items-center gap-2"><AlignLeft size={18} /><h3>Descrição / Notas</h3></div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setIsDescPreviewMode(!isDescPreviewMode)} 
                                            className="text-xs flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-gray-600 dark:text-gray-300"
                                            title="Alternar entre edição e visualização"
                                        >
                                            {isDescPreviewMode ? <EyeOff size={12}/> : <Eye size={12}/>}
                                            {isDescPreviewMode ? 'Editar' : 'Visualizar'}
                                        </button>
                                        {!isDescPreviewMode && (
                                            <>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    ref={fileInputDescRef}
                                                    onChange={(e) => handleFileUpload(e, 'description')}
                                                />
                                                <button 
                                                    onClick={() => fileInputDescRef.current?.click()} 
                                                    className="text-xs flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-gray-600 dark:text-gray-300"
                                                    title="Anexar imagem"
                                                >
                                                    <Paperclip size={12} /> Anexar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                {isDescPreviewMode ? (
                                    <div className="w-full min-h-[150px] p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 shadow-sm cursor-text" onClick={() => setIsDescPreviewMode(false)}>
                                        <RichTextRenderer text={description || 'Nenhuma descrição.'} />
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {isMentionOpen && mentionTarget === 'description' && filteredCollaborators.length > 0 && (
                                            <div className="absolute left-0 bottom-full mb-1 w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 z-50 animate-pop-in overflow-hidden">
                                                <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                    Mencionar Colaborador
                                                </div>
                                                <div className="max-h-48 overflow-y-auto">
                                                    {filteredCollaborators.map(c => (
                                                        <button 
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => insertMention(c)}
                                                            className="w-full text-left px-3 py-2.5 text-xs hover:bg-lm-yellow/10 dark:hover:bg-zinc-700 flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors border-b border-gray-50 dark:border-zinc-800 last:border-0"
                                                        >
                                                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-bold">
                                                                {c.name.charAt(0)}
                                                            </div>
                                                            {c.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <textarea 
                                            ref={descInputRef}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            onKeyUp={(e) => handleInputKeyUp(e, 'description')}
                                            onPaste={(e) => handlePaste(e, 'description')}
                                            onBlur={handleDescriptionBlur}
                                            placeholder="Use @Nome para mencionar. Cole prints (Ctrl+V) ou anexe imagens."
                                            className="w-full min-h-[150px] p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-lm-yellow/50 focus:border-lm-yellow resize-y transition-shadow placeholder-gray-400 shadow-sm"
                                        />
                                    </div>
                                )}
                                
                                <p className="text-[10px] text-gray-400 text-right">{isSaving ? 'Salvando...' : 'Salvo automaticamente ao sair do campo.'}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-sm"><CheckSquare size={18} /><h3>Checklist / Pendências</h3></div>
                                    <span className="text-xs font-mono text-gray-400">{checklist.filter(i => i.isDone).length}/{checklist.length}</span>
                                </div>
                                {checklist.length > 0 && (<div className="w-full h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(checklist.filter(i => i.isDone).length / checklist.length) * 100}%` }}></div></div>)}
                                <div className="space-y-2">
                                    {checklist.map((item, idx) => (
                                        <div key={item.id} className="group flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl hover:shadow-sm transition-all animate-enter" style={{ animationDelay: `${idx * 50}ms` }}>
                                            <button onClick={() => toggleCheckitem(item.id)} className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${item.isDone ? 'bg-lm-yellow border-lm-yellow text-gray-900' : 'bg-transparent dark:bg-black border-gray-300 dark:border-zinc-600 hover:border-lm-yellow'}`}>{item.isDone && <CheckSquare size={12} />}</button>
                                            <span className={`flex-1 text-sm break-words ${item.isDone ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>{item.text}</span>
                                            <button onClick={() => deleteCheckitem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={addChecklistItem} className="flex items-center gap-2 mt-2">
                                    <div className="relative flex-1">
                                        <Plus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="Adicionar novo item..." className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lm-yellow/30 shadow-sm" />
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- TAB: HISTORY --- */}
            {activeTab === 'history' && (
                <div className="animate-enter pb-10">
                    {isLoadingHistory ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400"><Loader2 size={32} className="animate-spin" /><span className="text-sm">Carregando histórico...</span></div>
                    ) : (
                        <div className="pl-2">
                            {historyLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400"><History size={32} className="opacity-20" /><span className="text-sm">Nenhum registro encontrado.</span></div>
                            ) : (
                                <div className="relative border-l border-gray-200 dark:border-zinc-800 ml-3 space-y-8 pb-4">
                                    {historyLogs.map((log, index) => (
                                        <div key={index} className="relative ml-6 animate-enter" style={{ animationDelay: `${index * 50}ms` }}>
                                            <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-gray-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900"></div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md"><User size={10} className="text-gray-500" /><span className="text-xs font-bold text-gray-700 dark:text-gray-200">{log.user}</span></div>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono flex items-center gap-1"><CalendarClock size={10} />{log.timestamp}</span>
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-zinc-900 p-3 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-sm">
                                                    {formatLogDescription(log.description)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* PORTAL FOR MENU */}
      {activeMenuId && createPortal(
          <div 
              className="fixed z-[9999] bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-gray-100 dark:border-zinc-700 py-1 w-32 animate-pop-in comment-menu-dropdown"
              style={{ top: menuPos.top, left: menuPos.left - 128 }}
              onClick={(e) => e.stopPropagation()}
          >
              {deleteConfirmMode ? (
                  <div className="flex flex-col px-2 py-2 gap-2 animate-fade-in"><span className="text-[10px] text-gray-500 dark:text-gray-400 text-center font-bold">Confirmar exclusão?</span><div className="flex gap-2"><button onClick={() => { const msg = comments.find(c => c.id === activeMenuId); if (msg) handleDeleteComment(msg); }} className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold py-1.5 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">Sim</button><button onClick={() => setDeleteConfirmMode(false)} className="flex-1 bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold py-1.5 rounded hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors">Não</button></div></div>
              ) : (
                  <>
                      <button onClick={() => { const msg = comments.find(c => c.id === activeMenuId); if (msg) startEditing(msg); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors"><Edit2 size={12} /> Editar</button>
                      <button onClick={() => setDeleteConfirmMode(true)} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400 transition-colors"><Trash2 size={12} /> Excluir</button>
                  </>
              )}
          </div>,
          document.body
      )}
    </>
  );
};

export default TaskDrawer;
