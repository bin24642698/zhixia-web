'use client';

import React, { useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/BackButton';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count'; // 导入 CharacterCount
import { getPromptsByType, Prompt as PromptType } from '@/lib/db'; // 导入Prompt类型
import { AIGenerator, MODELS, SystemPrompt, saveApiKey, ChapterFormatter } from '@/lib/AIservice'; // 导入AI服务相关
import { openDB } from 'idb'; // 导入 idb
import { resetDatabases } from '@/lib/db'; // 导入重置数据库函数

// API密钥存储键
const API_KEY_STORAGE_KEY = 'zhixia_api_key';

// 定义Modal组件的参数类型
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  splitView?: boolean; // 添加 splitView 属性
  customContent?: boolean;
}

// 弹窗组件 (保持与 works/[id]/page.tsx 中 Modal 一致或类似)
const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-6xl", splitView = false, customContent = false }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className={`bg-white rounded-2xl shadow-lg w-[56%] h-[80%] ${splitView ? "max-w-[56%]" : maxWidth} overflow-hidden flex flex-col`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex-1 flex items-center">
            {typeof title === 'string' ? (
              <h3 className="text-xl font-bold text-gray-800 hidden">{title}</h3>
            ) : (
              title // 允许传入 ReactNode 作为标题
            )}
          </div>
          <button
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        {/* 修正: 当 customContent 为 true 时，移除此处的 overflow-auto */}
        <div className={`flex-1 ${customContent ? '' : 'p-6 overflow-auto'}`} style={{ height: 'calc(100% - 70px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// 定义模态框配置类型
interface ModalConfig {
  id: keyof typeof promptTemplates; // 使用id作为类型键
  title: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
  gradientFrom: string;
  gradientTo: string;
}

// 创意地图项目类型 (修正 detailedOutline 为 detailed_outline)
const creativeMapItems = [
  { id: 'introduction', name: '导语生成器', icon: 'format_quote' },
  { id: 'outline', name: '大纲生成', icon: 'format_list_bulleted' },
  { id: 'detailed_outline', name: '细纲生成', icon: 'subject' }, // 修正为 snake_case
  { id: 'character', name: '角色设计', icon: 'person' },
  { id: 'worldbuilding', name: '世界搭建', icon: 'public' },
  { id: 'plot', name: '情节设计', icon: 'timeline' },
] as const; // 使用 as const 确报 id 类型

type CreativeMapItemId = typeof creativeMapItems[number]['id'];

// 提示词模板 (修正 detailedOutline 为 detailed_outline)
const promptTemplates: Record<CreativeMapItemId, string> = {
  'introduction': '为[类型]的故事创建一个引人入胜的开篇导语，设定[氛围]的基调，并引导读者关注[焦点]。请基于以下要求生成：\n\n',
  'outline': '为[主题]的[类型]故事创建一个大纲，包括主线规划、章节划分和核心情节点。请基于以下要求生成：\n\n',
  'detailed_outline': '基于大纲，为[章节名]创建详细的内容规划，包括场景描述、对话设计和情感氛围。请基于以下要求生成：\n\n', // 修正为 snake_case
  'character': '创建一个[性格特点]的角色，包括其背景故事、动机、外貌特征和行为模式。请基于以下要求生成：\n\n',
  'worldbuilding': '设计一个[类型]的世界，包括其[历史/地理/文化/政治]等方面。重点描述[特点]。请基于以下要求生成：\n\n',
  'plot': ''
};

// 客户端组件 TiptapEditor (完全重写)
const TiptapEditor = ({ content, onChange }: { content: string, onChange?: (content: string) => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      CharacterCount, // 添加 CharacterCount 扩展
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      // 当编辑器内容变化时，调用onChange回调
      onChange && onChange(editor.getHTML());
    }
  });

  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (editor) {
      const updateCharCount = () => {
        setCharCount(editor.storage.characterCount.characters());
      };
      editor.on('update', updateCharCount);
      updateCharCount(); // Initial count
      
      return () => {
        editor.off('update', updateCharCount);
      };
    }
  }, [editor]);

  // 应用自定义样式
  useEffect(() => {
    if (editor) {
      // 设置编辑器内容区域的自定义样式
      const editorElement = editor.view.dom;
      editorElement.style.fontFamily = "'思源黑体', 'Noto Sans SC', sans-serif";
      editorElement.style.fontSize = '14pt';
      editorElement.style.fontWeight = '400';
      editorElement.style.lineHeight = '2.0';
      editorElement.style.color = '#333';
      editorElement.style.backgroundColor = '#F2F8F2';
      editorElement.style.padding = '20px 20px 60px 20px'; // 增加底部内边距，避免文字被字数统计覆盖
      editorElement.style.boxSizing = 'border-box';
      editorElement.style.height = '100%';
      editorElement.style.width = '100%';
      editorElement.style.overflowY = 'auto';
    }
  }, [editor]);

  // 当content属性变化时更新编辑器内容
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <>
      {editor && <EditorContent editor={editor} className="h-full w-full" />}
      <div className="absolute bottom-10 right-3 py-1 px-3 bg-gray-50/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm flex justify-start items-center text-sm text-gray-600">
        <span className="flex items-center">
          <span className="material-icons text-gray-400 mr-1 text-sm">format_list_numbered</span>
          字数: {charCount}
        </span>
      </div>
    </>
  );
};


export default function CreativeMapPage() {
  const router = useRouter();

  const [activeModal, setActiveModal] = useState<CreativeMapItemId | null>(null);
  const [showWorldEditor, setShowWorldEditor] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  // AI 相关状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Record<CreativeMapItemId, PromptType[]>>({} as any);
  const [apiKey, setApiKey] = useState(''); // 用于检查API Key是否存在

  // 新增：结果弹窗状态
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalContent, setResultModalContent] = useState('');
  const [resultModalTitle, setResultModalTitle] = useState(''); // 可选：为弹窗设置标题

  // 世界编辑器内容状态
  const [worldContent, setWorldContent] = useState<Record<string, any>>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeItemContent, setActiveItemContent] = useState('');
  const [activeItemTitle, setActiveItemTitle] = useState('');
  const [itemCounter, setItemCounter] = useState<Record<string, number>>({});

  // 各个弹窗独立的状态 (修正 detailedOutline key)
  const [modalStates, setModalStates] = useState<Record<CreativeMapItemId, any>>(() => {
    // 尝试从localStorage获取上次使用的提示词ID和自定义提示词内容
    const getLastUsedPromptId = (id: CreativeMapItemId): string => {
      if (typeof window !== 'undefined') {
        try {
          const key = `zhixia_lastPrompt_${id}`;
          const savedId = localStorage.getItem(key);
          return savedId || 'custom'; // 如果没有保存过则返回'custom'
        } catch (e) {
          console.error('读取上次使用的提示词失败', e);
        }
      }
      return 'custom';
    };
    
    // 获取上次用户输入的自定义提示词内容
    const getLastCustomPrompt = (id: CreativeMapItemId): string => {
      if (typeof window !== 'undefined') {
        try {
          const key = `zhixia_lastCustomPrompt_${id}`;
          return localStorage.getItem(key) || '';
        } catch (e) {
          console.error('读取上次自定义提示词失败', e);
        }
      }
      return '';
    };

    const initialStates: Record<string, any> = {};
    creativeMapItems.forEach(item => {
      const lastUsedPromptId = getLastUsedPromptId(item.id);
      // 如果上次选择的是自定义提示词，则使用上次保存的自定义内容
      const lastCustomPromptContent = getLastCustomPrompt(item.id);
      
      initialStates[item.id] = {
        selectedModel: MODELS.GEMINI_FLASH,
        selectedPromptId: lastUsedPromptId, // 使用上次选择的提示词ID
        customPrompt: lastCustomPromptContent, // 始终使用上次保存的自定义提示词或空字符串
        userInput: '', // 用户输入的主要内容
        result: '',
        isGenerating: false,
        showResultView: false, // 控制是否显示结果视图
        editorContent: '' // 添加编辑器内容状态
      };
    });
    return initialStates as Record<CreativeMapItemId, any>;
  });

  // 新增：结果滚动相关状态和引用
  const resultScrollRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // 添加引用变量来存储流式请求控制器
  const abortControllerRef = useRef<AbortController | null>(null);

  // 添加一个终止标志
  const isGenerationStopped = useRef<boolean>(false);

  // 添加重命名弹窗状态
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // 添加删除确认弹窗状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteItemTitle, setDeleteItemTitle] = useState('');

  // 加载API密钥和提示词
  useEffect(() => {
    const loadData = async () => {
      // 加载 API Key
      try {
        const db = await openDB('zhixia_settings', 7);
        const savedApiKey = await db.get('settings', API_KEY_STORAGE_KEY);
        if (savedApiKey) {
          setApiKey(savedApiKey); // 存储API Key用于检查
        }
      } catch (error) {
        console.error('加载API密钥失败:', error);
      }

      // 加载提示词
      try {
        const loadedPrompts: Record<CreativeMapItemId, PromptType[]> = {} as any;
        for (const item of creativeMapItems) {
          // 调用 getPromptsByType 时 id 类型已匹配
          loadedPrompts[item.id] = await getPromptsByType(item.id);
        }
        setPrompts(loadedPrompts);
      } catch (error) {
        console.error('加载提示词失败:', error);
      }
    };
    loadData();
  }, []);

  // 更新特定弹窗的状态
  const updateModalState = (id: CreativeMapItemId, newState: Partial<any>) => {
    setModalStates(prev => ({
      ...prev,
      [id]: { ...prev[id], ...newState }
    }));
  };

  // 处理提示词选择
  const handlePromptSelect = (id: CreativeMapItemId, e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let newPromptContent = '';
    
    if (value !== 'custom') {
      // 选择预设提示词时，加载对应提示词内容
      const selectedPrompt = prompts[id]?.find(p => p.id === parseInt(value));
      if (selectedPrompt) {
        newPromptContent = selectedPrompt.content;
      }
    } else {
      // 选择自定义提示词时，保留当前自定义提示词内容（可能为空）
      newPromptContent = modalStates[id].customPrompt || '';
    }
    
    // 保存当前选择的提示词ID到localStorage
    try {
      const key = `zhixia_lastPrompt_${id}`;
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('保存提示词选择失败', e);
    }
    
    updateModalState(id, { selectedPromptId: value, customPrompt: newPromptContent });
    SystemPrompt.set(newPromptContent); // 更新全局 SystemPrompt
  };

  // 处理自定义提示词变更
  const handleCustomPromptChange = (id: CreativeMapItemId, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    updateModalState(id, { customPrompt: newContent });
    
    // 保存自定义提示词到localStorage
    try {
      const key = `zhixia_lastCustomPrompt_${id}`;
      localStorage.setItem(key, newContent);
    } catch (e) {
      console.error('保存自定义提示词失败', e);
    }
    
    if (modalStates[id].selectedPromptId === 'custom') {
      SystemPrompt.set(newContent); // 更新全局 SystemPrompt
    }
  };

  // 处理用户主要输入内容变更
  const handleUserInput = (id: CreativeMapItemId, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateModalState(id, { userInput: e.target.value });
  };

  // 处理模型选择
  const handleModelChange = (id: CreativeMapItemId, e: React.ChangeEvent<HTMLSelectElement>) => {
    updateModalState(id, { selectedModel: e.target.value });
  };

  // 处理模态窗口编辑器内容变化
  const handleModalEditorContentChange = (id: CreativeMapItemId, content: string) => {
    updateModalState(id, { editorContent: content });
  };

  // 创建特定ID的编辑器内容更改处理函数
  const createEditorChangeHandler = (id: CreativeMapItemId) => {
    return (content: string) => {
      handleModalEditorContentChange(id, content);
    };
  };

  // 处理AI生成
  const handleGenerate = async (id: CreativeMapItemId) => {
    setError(null);
    const currentState = modalStates[id];
    
    // 获取有效的提示词内容(作为系统提示词)
    let effectivePrompt = currentState.customPrompt;
    if (currentState.selectedPromptId !== 'custom') {
        const selected = prompts[id]?.find(p => p.id === parseInt(currentState.selectedPromptId));
        if (selected) effectivePrompt = selected.content;
    }

    // 获取用户输入内容
    const userInputContent = currentState.userInput;

    // 重置终止标志
    isGenerationStopped.current = false;

    // 强制清理之前的请求，确保不会有之前的内容继续出现
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // 中止之前的请求
      abortControllerRef.current = null;
      
      // 等待一小段时间让之前的请求完全清理
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    // 1. 更新按钮状态为生成中
    updateModalState(id, { isGenerating: true });
    // 重置自动滚动状态
    setShouldAutoScroll(true);
    
    // 2. 立即准备并显示结果弹窗
    setResultModalTitle(`${creativeMapItems.find(item => item.id === id)?.name || '生成结果'} - 生成中...`);
    setResultModalContent(''); // 清空上次结果
    setShowResultModal(true);

    try {
      let resultText = '';
      
      // 处理空白提示词和用户输入 - 使用"none"替代空字符串
      const finalUserInput = userInputContent && userInputContent.trim() ? userInputContent : "none";
      const finalSystemPrompt = effectivePrompt && effectivePrompt.trim() ? effectivePrompt : "none";
      
      // 所有创意工具都使用相同的格式：提示词作为系统提示词，用户输入作为用户内容
      await AIGenerator.generateStream(
        finalUserInput, // 使用用户输入作为主要内容，或"none"
        {
          model: currentState.selectedModel,
          systemPrompt: finalSystemPrompt, // 使用提示词作为系统提示词，或"none"
          stream: true,
          abortSignal: abortControllerRef.current.signal,
        },
        (chunk) => {
          // 如果已经终止生成，则不再追加内容
          if (isGenerationStopped.current) return;
          
          resultText += chunk;
          setResultModalContent(resultText);
        }
      );
      
      // 清理AbortController引用
      abortControllerRef.current = null;
      // 重置终止标志
      isGenerationStopped.current = false;
      
      updateModalState(id, { isGenerating: false }); // 恢复按钮状态
      // 更新结果弹窗标题（移除加载中）
      setResultModalTitle(`${creativeMapItems.find(item => item.id === id)?.name || '生成结果'}`);

    } catch (error: unknown) {
      // 如果是由用户取消引起的错误，则不显示错误
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('生成已取消');
        return;
      }
      
      console.error(`生成 ${id} 内容失败:`, error);
      const message = error instanceof Error ? error.message : `生成 ${id} 内容失败`;
      setError(message);
      updateModalState(id, { isGenerating: false });
      abortControllerRef.current = null;
      isGenerationStopped.current = false;

      // 在结果弹窗中显示错误信息
      setResultModalTitle(`生成 ${id} 内容失败`);
      setResultModalContent(`错误: ${message}`);
    }
  };

  // 打开弹窗函数
  const openModal = (modalName: CreativeMapItemId) => {
    setActiveModal(modalName);
    
    // 加载当前提示词列表后设置初始状态
    const currentPrompts = prompts[modalName] || [];
    // 当前选中的提示词ID
    const currentPromptId = modalStates[modalName].selectedPromptId;
    
    // 如果有提示词但当前选择的是custom，则尝试选择第一个可用的提示词
    if (currentPrompts.length > 0 && currentPromptId === 'custom') {
      // 更新状态，选择第一个提示词
      const firstPrompt = currentPrompts[0];
      const newPromptId = String(firstPrompt.id);
      updateModalState(modalName, { 
        selectedPromptId: newPromptId,
        // 不将预设提示词内容放入customPrompt字段，保持自定义提示词内容不变
        showResultView: false, 
        result: '', 
        isGenerating: false,
        editorContent: ''
      });
      
      // 保存选择到localStorage
      try {
        const key = `zhixia_lastPrompt_${modalName}`;
        localStorage.setItem(key, newPromptId);
      } catch (e) {
        console.error('保存提示词选择失败', e);
      }
      
      // 设置系统提示词
      SystemPrompt.set(firstPrompt.content);
    } else {
      // 正常重置弹窗状态
      updateModalState(modalName, { showResultView: false, result: '', isGenerating: false, editorContent: '' });
      setError(null);
      
      // 设置初始 SystemPrompt (所有类型都使用提示词作为系统提示词)
      const initialPromptContent = modalStates[modalName].selectedPromptId === 'custom'
        ? modalStates[modalName].customPrompt
        : prompts[modalName]?.find(p => p.id === parseInt(modalStates[modalName].selectedPromptId))?.content || '';
      SystemPrompt.set(initialPromptContent);
    }
  };

  // 关闭弹窗函数
  const closeModal = () => {
    // 如果有正在进行的生成，中止它
    if (abortControllerRef.current) {
      isGenerationStopped.current = true;
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setActiveModal(null);
  };

  // 关闭结果弹窗函数
  const closeResultModal = () => {
    // 如果有正在进行的生成，中止它
    if (abortControllerRef.current && resultModalTitle.includes('生成中...')) {
      isGenerationStopped.current = true;
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      // 更新UI状态
      if (activeModal) {
        updateModalState(activeModal, { isGenerating: false });
      }
    }
    
    setShowResultModal(false);
  };

  // 停止生成函数
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      // 设置终止标志
      isGenerationStopped.current = true;
      
      // 中止请求
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      // 更新UI状态
      if (activeModal) {
        updateModalState(activeModal, { isGenerating: false });
      }
      
      // 更新结果弹窗标题（移除生成中状态）
      const title = resultModalTitle.replace(' - 生成中...', '');
      setResultModalTitle(title);
      
      // 添加提示到内容末尾
      setResultModalContent(prev => prev + '\n\n[生成已停止]');
    }
  };

  // 处理侧边栏点击事件
  const handleSubmenuToggle = (itemId: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // 保存内容到世界编辑器
  const handleSaveToWorld = async (content: string, title: string) => {
    try {
      // 1. 关闭结果弹窗
      setShowResultModal(false);
      
      // 2. 打开世界编辑器
      setShowWorldEditor(true);
      
      // 确定当前激活的创意项目类型
      const currentItemType = resultModalTitle 
        ? creativeMapItems.find(item => resultModalTitle.includes(item.name))?.id 
        : activeModal;
      
      if (!currentItemType) return;
      
      // 3. 更新计数器
      const newCounter = { 
        ...itemCounter,
        [currentItemType]: (itemCounter[currentItemType] || 0) + 1 
      };
      setItemCounter(newCounter);
      
      // 4. 创建唯一标识符 - 使用时间戳和计数器
      const timestamp = Date.now();
      const itemId = `${currentItemType}_${timestamp}`;
      
      // 5. 准备要保存的项目数据
      const itemTitle = title || `新${creativeMapItems.find(item => item.id === currentItemType)?.name || ''}条目 ${newCounter[currentItemType]}`;
      
      // 6. 更新世界内容状态
      const newWorldContent = {
        ...worldContent,
        [itemId]: {
          id: itemId,
          type: currentItemType,
          title: itemTitle,
          content: content,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      setWorldContent(newWorldContent);
      
      // 7. 设置活动项目
      setActiveItemId(itemId);
      setActiveItemContent(content);
      setActiveItemTitle(itemTitle);
      
      // 8. 打开对应的子菜单
      setOpenSubmenus(prev => ({
        ...prev,
        [currentItemType as string]: true
      }));
      
      // 9. 保存到IndexedDB
      const db = await openDB('zhixia_creativemap', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('items')) {
            db.createObjectStore('items', { keyPath: 'id' });
          }
        }
      });
      
      await db.put('items', {
        id: itemId,
        type: currentItemType,
        title: itemTitle,
        content: content,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // 10. 显示成功提示
      setError(null);
      const successMessage = `已成功保存到"${creativeMapItems.find(item => item.id === currentItemType)?.name || ''}"分类`;
      // 使用现有的error状态显示成功消息，但样式不同
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed bottom-4 right-4 bg-green-50 border border-green-100 rounded-xl p-4 shadow-lg animate-fadeIn';
      errorDiv.innerHTML = `
        <div class="flex items-center">
          <span class="material-icons text-green-500 mr-2">check_circle</span>
          <span class="text-green-600">${successMessage}</span>
        </div>
      `;
      document.body.appendChild(errorDiv);
      setTimeout(() => {
        errorDiv.remove();
      }, 3000);
      
    } catch (error) {
      console.error('保存内容失败:', error);
      setError('保存内容失败，请重试');
    }
  };

  // 加载侧边栏菜单项内容
  useEffect(() => {
    const loadMenuItems = async () => {
      try {
        const db = await openDB('zhixia_creativemap', 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('items')) {
              db.createObjectStore('items', { keyPath: 'id' });
            }
          }
        });
        
        const allItems = await db.getAll('items');
        
        // 更新世界内容状态
        const newWorldContent: Record<string, any> = {};
        allItems.forEach(item => {
          newWorldContent[item.id] = item;
        });
        setWorldContent(newWorldContent);
        
        // 更新计数器
        const counters: Record<string, number> = {};
        allItems.forEach(item => {
          counters[item.type] = (counters[item.type] || 0) + 1;
        });
        setItemCounter(counters);
        
      } catch (error) {
        console.error('加载菜单项失败:', error);
      }
    };
    
    loadMenuItems();
  }, []);
  
  // 处理菜单项点击
  const handleItemClick = (itemId: string) => {
    const item = worldContent[itemId];
    if (item) {
      setActiveItemId(itemId);
      setActiveItemContent(item.content);
      setActiveItemTitle(item.title);
    }
  };
  
  // 标题变更处理
  const handleTitleChange = (title: string) => {
    setActiveItemTitle(title);
    
    // 如果有活动项目，更新其标题
    if (activeItemId && worldContent[activeItemId]) {
      const updatedItem = {
        ...worldContent[activeItemId],
        title,
        updatedAt: new Date()
      };
      
      setWorldContent(prev => ({
        ...prev,
        [activeItemId]: updatedItem
      }));
      
      // 简化的保存处理，实际应用中应该使用防抖函数
      setTimeout(async () => {
        try {
          const db = await openDB('zhixia_creativemap', 1);
          await db.put('items', updatedItem);
        } catch (error) {
          console.error('保存编辑标题失败:', error);
        }
      }, 1000);
    }
  };

  // 弹窗配置 (修正 detailedOutline key)
  const modalConfig: Record<CreativeMapItemId, ModalConfig> = {
    introduction: {
      id: 'introduction',
      title: "导语生成器",
      titlePlaceholder: "输入导语标题",
      contentPlaceholder: "请详细描述您希望生成的导语的要求，例如故事背景、主要人物、期望的风格和基调等...",
      gradientFrom: "indigo",
      gradientTo: "indigo"
    },
    outline: {
      id: 'outline',
      title: "大纲生成",
      titlePlaceholder: "输入大纲标题",
      contentPlaceholder: "请描述您想要生成大纲的故事梗概、主要情节、角色、主题或任何关键要素...",
      gradientFrom: "blue",
      gradientTo: "blue"
    },
    detailed_outline: { // 修正为 snake_case
      id: 'detailed_outline',
      title: "细纲生成",
      titlePlaceholder: "输入细纲标题",
      contentPlaceholder: "请提供您已经有的大纲或章节概要，以及您希望细化哪些方面，例如场景描述、人物对话、心理活动等...",
      gradientFrom: "teal",
      gradientTo: "teal"
    },
    character: {
      id: 'character',
      title: "角色设计",
      titlePlaceholder: "输入角色名称",
      contentPlaceholder: "请描述您想要设计的角色的基本信息，例如角色类型、性格特征、背景故事、目标动机、外貌特点等...",
      gradientFrom: "amber",
      gradientTo: "amber"
    },
    worldbuilding: {
      id: 'worldbuilding',
      title: "世界搭建",
      titlePlaceholder: "输入世界名称",
      contentPlaceholder: "请描述您想要构建的世界的核心设定，例如时代背景、地理环境、主要种族、文化风俗、科技或魔法体系等...",
      gradientFrom: "purple",
      gradientTo: "purple"
    },
    plot: {
      id: 'plot',
      title: "情节设计",
      titlePlaceholder: "输入情节标题",
      contentPlaceholder: "请描述您想要设计的情节的关键要素，例如故事背景、主要角色、核心冲突、期望的转折点和结局等...",
      gradientFrom: "rose",
      gradientTo: "rose"
    }
  };

  // 只保留核心的自动滚动逻辑，修复检测问题
  const handleResultScroll = useCallback(() => {
    if (!resultScrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = resultScrollRef.current;
    // 调整检测精度，确保更容易触发底部检测
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 10;
    
    // 检查是否从底部向上滚动（重要：这是判断用户是否主动向上滚动的关键）
    if (!isAtBottom && shouldAutoScroll) {
      // 如果用户向上滚动，立即关闭自动滚动
      setShouldAutoScroll(false);
    } else if (isAtBottom && !shouldAutoScroll) {
      // 如果用户滚回底部，重新启用自动滚动
      setShouldAutoScroll(true);
    }
  }, [shouldAutoScroll]);

  // 简化自动滚动效果
  useEffect(() => {
    if (shouldAutoScroll && resultModalContent && resultScrollRef.current) {
      resultScrollRef.current.scrollTop = resultScrollRef.current.scrollHeight;
    }
  }, [resultModalContent, shouldAutoScroll]);

  // 在生成开始前确保自动滚动状态正确
  useEffect(() => {
    if (showResultModal && resultScrollRef.current) {
      // 初始弹窗打开时，总是滚动到底部并启用自动滚动
      setTimeout(() => {
        if (resultScrollRef.current) {
          resultScrollRef.current.scrollTop = resultScrollRef.current.scrollHeight;
          setShouldAutoScroll(true);
        }
      }, 100);
    }
  }, [showResultModal]);

  // 删除条目处理函数
  const handleDeleteItem = async (itemId: string) => {
    const item = worldContent[itemId];
    if (!item) return;
    
    // 使用自定义弹窗而不是window.confirm
    setDeleteItemId(itemId);
    setDeleteItemTitle(item.title);
    setShowDeleteModal(true);
  };
  
  // 确认删除
  const confirmDelete = async () => {
    if (!deleteItemId) {
      setShowDeleteModal(false);
      return;
    }
    
    try {
      // 从IndexedDB中删除
      const db = await openDB('zhixia_creativemap', 1);
      await db.delete('items', deleteItemId);
      
      // 从状态中删除
      setWorldContent(prev => {
        const updated = { ...prev };
        delete updated[deleteItemId];
        return updated;
      });
      
      // 如果删除的是当前活动项目，清空活动项目
      if (activeItemId === deleteItemId) {
        setActiveItemId(null);
        setActiveItemContent('');
        setActiveItemTitle('');
      }
      
    } catch (error) {
      console.error('删除条目失败:', error);
      alert('删除条目失败，请重试');
    }
    
    // 关闭弹窗
    setShowDeleteModal(false);
  };
  
  // 重命名条目处理函数
  const handleRenameItem = (itemId: string) => {
    const item = worldContent[itemId];
    if (!item) return;
    
    // 使用自定义弹窗而不是window.prompt
    setRenameItemId(itemId);
    setRenameValue(item.title);
    setShowRenameModal(true);
  };
  
  // 确认重命名
  const confirmRename = async () => {
    if (!renameItemId || !renameValue.trim()) {
      setShowRenameModal(false);
      return;
    }
    
    const item = worldContent[renameItemId];
    if (!item) {
      setShowRenameModal(false);
      return;
    }
    
    // 更新标题
    const updatedItem = {
      ...item,
      title: renameValue,
      updatedAt: new Date()
    };
    
    // 更新状态
    setWorldContent(prev => ({
      ...prev,
      [renameItemId]: updatedItem
    }));
    
    // 如果重命名的是当前活动项目，更新活动项目标题
    if (activeItemId === renameItemId) {
      setActiveItemTitle(renameValue);
    }
    
    // 保存到IndexedDB
    try {
      const db = await openDB('zhixia_creativemap', 1);
      await db.put('items', updatedItem);
    } catch (error) {
      console.error('保存重命名失败:', error);
    }
    
    // 关闭弹窗
    setShowRenameModal(false);
  };

  // 编辑器内容变更处理
  const handleEditorContentChange = (content: string) => {
    setActiveItemContent(content);
    
    // 如果有活动项目，更新其内容
    if (activeItemId && worldContent[activeItemId]) {
      const updatedItem = {
        ...worldContent[activeItemId],
        content,
        updatedAt: new Date()
      };
      
      setWorldContent(prev => ({
        ...prev,
        [activeItemId]: updatedItem
      }));
      
      // 防抖保存到IndexedDB - 这里简化处理，实际应用中应该使用防抖函数
      setTimeout(async () => {
        try {
          const db = await openDB('zhixia_creativemap', 1);
          await db.put('items', updatedItem);
        } catch (error) {
          console.error('保存编辑内容失败:', error);
        }
      }, 1000);
    }
  };

  // 返回的JSX结构
  return (
    <div>
      {/* 世界编辑界面 (保持不变) */}
      {showWorldEditor && (
        <div className="fixed inset-0 z-20 animate-fadeIn">
          <div className="flex h-screen bg-gray-50">
            {/* 独立侧边栏 */}
            <div className="w-64 border-r border-gray-200 bg-white shadow-sm flex flex-col rounded-tr-2xl rounded-br-2xl">
              {/* LOGO区域 */}
              <div className="p-5 border-b border-gray-200 flex items-center">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-full flex items-center justify-center text-white font-bold mr-3 text-base shadow-sm">智</div>
                </div>
              </div>
              {/* 可滚动的内容区域 */}
              <div className="flex-1 py-4 px-2 overflow-y-auto">
                {/* 添加创意地图项目 */}
                {creativeMapItems.map((item) => (
                  <div key={item.id} className="mb-1">
                    <div
                      className={`menu-item ${openSubmenus[item.id] ? 'active' : ''}`}
                      onClick={() => handleSubmenuToggle(item.id)}
                    >
                      <div className="menu-icon">
                        <span className="material-icons text-2xl">{item.icon}</span>
                      </div>
                      <span className="menu-text flex-1">{item.name}</span>
                      <span className={`material-icons transition-transform duration-200 ${openSubmenus[item.id] ? 'rotate-180' : ''}`}>expand_more</span>
                    </div>
                    {/* 下拉子菜单内容 */}
                    {openSubmenus[item.id] && (
                      <div className="ml-8 pl-4 border-l border-gray-200 py-2 animate-slideDown">
                        {/* 已保存的子菜单项 */}
                        {Object.values(worldContent)
                          .filter(content => content.type === item.id)
                          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                          .map(content => (
                            <div
                              key={content.id}
                              className={`px-3 py-2 rounded-lg mb-1 text-sm cursor-pointer transition-colors duration-200 ${activeItemId === content.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}`}
                            >
                              <div className="flex items-center justify-between">
                                <div 
                                  className="flex items-center flex-1 truncate" 
                                  onClick={() => handleItemClick(content.id)}
                                >
                                  <span className="material-icons text-sm mr-2">description</span>
                                  <span className="truncate">{content.title}</span>
                                </div>
                                <div className="flex space-x-1 ml-2">
                                  <button
                                    className="p-1 rounded-full hover:bg-gray-200 text-gray-500 hover:text-blue-600 transition-colors focus:outline-none"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenameItem(content.id);
                                    }}
                                    title="重命名"
                                  >
                                    <span className="material-icons text-sm">edit</span>
                                  </button>
                                  <button
                                    className="p-1 rounded-full hover:bg-gray-200 text-gray-500 hover:text-red-600 transition-colors focus:outline-none"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteItem(content.id);
                                    }}
                                    title="删除"
                                  >
                                    <span className="material-icons text-sm">delete</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        {Object.values(worldContent).filter(content => content.type === item.id).length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            暂无{item.name}条目
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧内容区 */}
            <div className="flex-1 flex flex-col">
              {/* 顶部导航栏 */}
              <div className="h-16 border-b border-gray-200 bg-white shadow-sm flex justify-between items-center px-8 rounded-bl-2xl">
                <div className="flex items-center">
                  <button
                    className="mr-3 bg-white hover:bg-gray-100 text-gray-700 p-2 rounded-full shadow-sm transition-all duration-200 flex items-center justify-center hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    onClick={() => setShowWorldEditor(false)}
                    aria-label="返回"
                  >
                    <span className="material-icons text-xl">arrow_back</span>
                  </button>
                  <h1 className="text-xl font-medium text-gray-800 mr-4">世界编辑</h1>
                  <span className="badge badge-green">编辑中</span>
                </div>
                <div className="flex items-center space-x-4">
                  {/* 移除版权信息 */}
                </div>
              </div>

              {/* 主要编辑器内容区域 */}
              <div className="flex-1 p-4 overflow-hidden">
                <div className="h-[100%] w-[100%] mx-auto flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <input
                      type="text"
                      value={activeItemTitle}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="请选择或创建一个条目"
                      className="text-xl font-semibold border-none focus:outline-none focus:ring-0 w-full bg-transparent text-gray-800"
                    />
                  </div>
                  {/* 使用简化的文本编辑区域 */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto">
                      <textarea
                        value={activeItemContent}
                        onChange={(e) => handleEditorContentChange(e.target.value)}
                        placeholder="在这里编辑内容..."
                        className="w-full h-full p-6 border-none focus:outline-none focus:ring-0 resize-none text-gray-700"
                        style={{ 
                          fontFamily: "'思源黑体', 'Noto Sans SC', sans-serif", 
                          fontSize: '16pt', 
                          fontWeight: 400,
                          lineHeight: '2.0',
                          backgroundColor: '#F2F8F2' 
                        }}
                      ></textarea>
                    </div>
                    <div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-start items-center text-sm text-gray-500">
                      <span>字数: {activeItemContent.length}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 创意地图界面 (保持不变) */}
      <div className={`${showWorldEditor ? 'hidden' : 'animate-fadeIn'}`}>
        <div className="flex h-screen bg-gray-50">
          {/* 左侧导航栏 */}
          <Sidebar activeMenu="creativemap" />

          {/* 右侧内容区 */}
          <div className="flex-1 flex flex-col">
            {/* 顶部导航 (保持不变) */}
            <div className="h-16 border-b border-gray-200 bg-white shadow-sm flex justify-between items-center px-8 rounded-bl-2xl">
              <div className="flex items-center">
                <BackButton />
                <h1 className="text-xl font-medium text-gray-800 mr-4">创意地图</h1>
                <span className="badge badge-blue">Beta</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  className="btn-secondary"
                  onClick={() => setShowWorldEditor(true)}
                >
                  <span className="material-icons mr-1 text-sm">edit</span>
                  <span>修改</span>
                </button>
                <button className="btn-secondary">
                  <span className="material-icons mr-2 text-sm">help_outline</span>
                  <span>帮助</span>
                </button>
              </div>
            </div>

            {/* 主要内容 (卡片渲染区保持不变) */}
            <div className="flex-1 p-8 overflow-auto">
              <div className="max-w-6xl mx-auto">
                <h2 className="section-title">创意工具</h2>
                <p className="text-gray-600 mb-8">使用这些工具来构建你的创作世界，设计角色和情节</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-20 mt-6">
                  {creativeMapItems.slice(0, 3).map(item => (
                    <div
                      key={item.id}
                      className={`card group cursor-pointer bg-gradient-to-br from-${modalConfig[item.id].gradientFrom}-50 to-white p-6 flex flex-col h-80 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl hover:translate-y-[-5px]`}
                      onClick={() => openModal(item.id)}
                    >
                      <div className={`w-16 h-16 bg-gradient-to-br from-${modalConfig[item.id].gradientFrom}-500 to-${modalConfig[item.id].gradientTo}-600 rounded-full flex items-center justify-center mb-6 text-white shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-110`}>
                        <span className="material-icons text-2xl">{item.icon}</span>
                    </div>
                      <h3 className={`text-${modalConfig[item.id].gradientFrom}-700 font-bold mb-3 text-xl group-hover:text-${modalConfig[item.id].gradientFrom}-800 transition-colors duration-200`}>{item.name}</h3>
                      <p className={`text-${modalConfig[item.id].gradientFrom}-600 text-sm mb-5`}>{promptTemplates[item.id].split('\n')[0]}</p>
                      {/* ... 卡片内部其他内容保持不变 ... */}
                    <div className="mt-auto">
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-center">
                              <span className={`material-icons text-${modalConfig[item.id].gradientFrom}-500 mr-2 text-sm`}>check_circle</span>
                              <span>功能点1</span>
                        </li>
                        <li className="flex items-center">
                              <span className={`material-icons text-${modalConfig[item.id].gradientFrom}-500 mr-2 text-sm`}>check_circle</span>
                              <span>功能点2</span>
                        </li>
                        <li className="flex items-center">
                              <span className={`material-icons text-${modalConfig[item.id].gradientFrom}-500 mr-2 text-sm`}>check_circle</span>
                              <span>功能点3</span>
                        </li>
                      </ul>
                    </div>
                    </div>
                  ))}
                  </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-20 mt-8">
                   {creativeMapItems.slice(3).map(item => (
                    <div
                      key={item.id}
                      className={`card group cursor-pointer bg-gradient-to-br from-${modalConfig[item.id].gradientFrom}-50 to-white p-6 flex flex-col h-80 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl hover:translate-y-[-5px]`}
                      onClick={() => openModal(item.id)}
                    >
                      <div className={`w-16 h-16 bg-gradient-to-br from-${modalConfig[item.id].gradientFrom}-500 to-${modalConfig[item.id].gradientTo}-600 rounded-full flex items-center justify-center mb-6 text-white shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-110`}>
                        <span className="material-icons text-2xl">{item.icon}</span>
                    </div>
                      <h3 className={`text-${modalConfig[item.id].gradientFrom}-700 font-bold mb-3 text-xl group-hover:text-${modalConfig[item.id].gradientFrom}-800 transition-colors duration-200`}>{item.name}</h3>
                       <p className={`text-${modalConfig[item.id].gradientFrom}-600 text-sm mb-5`}>{promptTemplates[item.id].split('\n')[0]}</p>
                       {/* ... 卡片内部其他内容保持不变 ... */}
                    <div className="mt-auto">
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-center">
                              <span className={`material-icons text-${modalConfig[item.id].gradientFrom}-500 mr-2 text-sm`}>check_circle</span>
                              <span>功能点1</span>
                        </li>
                        <li className="flex items-center">
                              <span className={`material-icons text-${modalConfig[item.id].gradientFrom}-500 mr-2 text-sm`}>check_circle</span>
                              <span>功能点2</span>
                        </li>
                        <li className="flex items-center">
                              <span className={`material-icons text-${modalConfig[item.id].gradientFrom}-500 mr-2 text-sm`}>check_circle</span>
                              <span>功能点3</span>
                        </li>
                      </ul>
                        </div>
                    </div>
                  ))}
                </div>
                    </div>
                  </div>

            {/* 底部 (保持不变) */}
            <div className="h-16 bg-white border-t border-gray-200 flex justify-center items-center px-8 shadow-sm rounded-tl-2xl">
              <div className="text-sm text-gray-500">
                © 2024 智界引擎
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 重命名弹窗 */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title="重命名条目"
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              新的标题
            </label>
            <input
              type="text"
              className="input"
              placeholder="请输入新的标题"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              className="btn-outline"
              onClick={() => setShowRenameModal(false)}
            >
              取消
            </button>
            <button
              className="btn-primary"
              onClick={confirmRename}
              disabled={!renameValue.trim()}
            >
              确认
            </button>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="删除条目"
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center mb-4 bg-red-50 p-4 rounded-xl">
              <span className="material-icons text-red-500 mr-3">warning</span>
              <p className="text-red-600">此操作不可恢复，请确认是否删除？</p>
            </div>
            <p className="text-gray-700">
              您确定要删除 <span className="font-semibold">"{deleteItemTitle}"</span> 吗？
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              className="btn-outline"
              onClick={() => setShowDeleteModal(false)}
            >
              取消
            </button>
            <button
              className="btn-primary bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
              onClick={confirmDelete}
            >
              删除
            </button>
          </div>
        </div>
      </Modal>

      {/* 新的弹窗渲染逻辑 */}
      {creativeMapItems.map(({ id }) => {
        const config = modalConfig[id];
        const state = modalStates[id];
        const currentPrompts = prompts[id] || [];

        // 检查API Key是否存在
        const isApiKeySet = !!apiKey;

        return (
          <Modal
            key={id}
            isOpen={activeModal === id}
            onClose={closeModal}
            title={config.title}
            splitView={true} // 添加splitView属性，匹配作品界面弹窗布局
            customContent={true} // 使用自定义内容布局
          >
            {/* 修改父 div 为 flex 容器，子元素宽度改为 flex-1 */}
            <div className="flex h-[calc(100%)]"> 
               {/* 结果显示面板 (左侧) - 使用 flex-1 */}
              <div className="w-1/2 bg-[#F2F8F2] border-r border-gray-100 relative">
                <TiptapEditor 
                  content={state.editorContent || ''} 
                  onChange={createEditorChangeHandler(id)} 
                />
              </div>
               {/* 选项面板 (右侧) - 使用 flex-1，保持 border-l */}
              <div className="w-1/2 border-l border-gray-100 p-6 flex flex-col bg-gray-50">
                <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                  {/* 模型选择 */}
                  <div>
                    <h4 className="text-base font-medium text-gray-800 mb-2">1. 模型选择</h4>
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <select
                        className="input"
                        value={state.selectedModel}
                        onChange={(e) => handleModelChange(id, e)}
                        disabled={state.isGenerating}
                      >
                        <option value={MODELS.GEMINI_FLASH}>Gemini Flash - 快速响应</option>
                        <option value={MODELS.GEMINI_PRO}>Gemini Pro - 更高质量生成</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-2">选择用于内容生成的AI模型。Gemini Flash响应更快，Gemini Pro支持更高质量的创意内容生成。</p>
                    </div>
                  </div>

                  {/* 提示词选择 */}
                  <div>
                    <h4 className="text-base font-medium text-gray-800 mb-2">2. 提示词 <span className="text-red-500">*</span></h4>
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <select
                        value={state.selectedPromptId}
                        onChange={(e) => handlePromptSelect(id, e)}
                        className="input mb-3"
                        disabled={state.isGenerating}
                      >
                        <option value="custom">自定义提示词</option>
                        {currentPrompts.length > 0 ? (
                          currentPrompts.map(prompt => (
                            <option key={prompt.id} value={prompt.id}>
                              {prompt.title}
                            </option>
                          ))
                        ) : (
                          <option value="custom" disabled>无可用预设提示词</option>
                        )}
                      </select>

                      {state.selectedPromptId === 'custom' && (
                        <textarea
                          value={state.customPrompt}
                          onChange={(e) => handleCustomPromptChange(id, e)}
                          className="input h-32"
                          placeholder={`输入自定义提示词... \n默认模板: ${promptTemplates[id].split('\n')[0]}`}
                          disabled={state.isGenerating}
                        ></textarea>
                      )}
                      <p className="text-xs text-gray-500 mt-2">选择预设提示词或输入自定义提示词。</p>
                    </div>
                  </div>

                  {/* 用户输入内容 */}
                  <div>
                    <h4 className="text-base font-medium text-gray-800 mb-2">3. 用户输入 <span className="text-red-500">*</span></h4>
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <textarea
                        value={state.userInput}
                        onChange={(e) => handleUserInput(id, e)}
                        className="input h-32"
                        placeholder="请在此输入您的具体要求..."
                        disabled={state.isGenerating}
                      ></textarea>
                      <p className="text-xs text-gray-500 mt-2">在此处输入您的具体要求和详细描述。</p>
                    </div>
                  </div>

                </div>

                {/* 生成按钮 */}
                <div className="pt-4 border-t border-gray-200 mt-auto">
                  <button
                    className={`btn-primary w-full bg-gradient-to-r from-${config.gradientFrom}-500 to-${config.gradientTo}-600`}
                    onClick={() => handleGenerate(id)}
                    disabled={state.isGenerating || !isApiKeySet} // 检查API Key
                  >
                    {state.isGenerating ? (
                      <>
                        <span className="material-icons animate-spin mr-2 text-sm">refresh</span>
                        <span>生成中...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-icons mr-2 text-sm">auto_awesome</span>
                        <span>生成内容</span>
                      </>
                    )}
                  </button>
            </div>
          </div>

            </div>
        </Modal>
        );
      })}

      {/* 结果展示 Modal */}
      <Modal
        isOpen={showResultModal}
        onClose={closeResultModal}
        title={
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-800">{resultModalTitle || "生成结果"}</span>
            {resultModalContent && (
              <div className="ml-4 text-sm text-gray-500 flex items-center">
                <span className="material-icons text-gray-400 mr-1 text-sm">format_list_numbered</span>
                <span>{resultModalContent.length} 字</span>
              </div>
            )}
          </div>
        }
        maxWidth="max-w-4xl"
        customContent={true}
      >
        <div className="flex flex-col h-[100%]">
          {/* 内容区域 - 可滚动 */}
          <div 
            className="flex-1 overflow-auto" 
            ref={resultScrollRef}
            onScroll={handleResultScroll}
            style={{ height: 'calc(100% - 60px)', backgroundColor: '#ffffff' }}
          >
            <div className="prose prose-blue max-w-none p-4" style={{ 
              fontFamily: "'思源黑体', 'Noto Sans SC', sans-serif",
              fontSize: '14pt',
              fontWeight: '400',
              lineHeight: '2.0'
            }}>
              <div className="whitespace-pre-wrap">
                {resultModalContent && resultModalContent.split('\n').map((line: string, index: number) => (
                  <div 
                    key={index} 
                    className="animate-typing" 
                    style={{ 
                      animationDelay: `${index * 0.01}s`,
                      marginBottom: index < resultModalContent.split('\n').length - 1 ? '0.5em' : '0'
                    }}
                  >
                    {line || ' '}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 按钮区域 - 固定在底部 */}
          {resultModalContent && (
            <div className="p-4 border-t border-gray-100 flex justify-between bg-white">
              <button 
                className="btn-outline"
                onClick={() => navigator.clipboard.writeText(resultModalContent)}
              >
                <span className="material-icons mr-2 text-sm">content_copy</span>
                <span>复制内容</span>
              </button>
              <div className="flex gap-3">
                {resultModalTitle.includes('生成中...') && (
                  <button 
                    className="btn-outline text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleStopGeneration}
                  >
                    <span className="material-icons mr-2 text-sm">stop</span>
                    <span>停止</span>
                  </button>
                )}
                <button 
                  className="btn-outline"
                  onClick={() => handleSaveToWorld(resultModalContent, resultModalTitle)}
                  disabled={resultModalTitle.includes('生成中...')}
                >
                  <span className="material-icons mr-2 text-sm">save</span>
                  <span>保存</span>
                </button>
                <button 
                  className="btn-primary"
                  onClick={closeResultModal}
                >
                  <span className="material-icons mr-2 text-sm">check</span>
                  <span>关闭</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}