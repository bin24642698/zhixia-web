'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getWorkById, updateWork, Work, getPromptsByType, Prompt } from '@/lib/db';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/BackButton';

// 导入API接口
import { 
  generateAIContent, 
  generateAIContentStream, 
  MODELS, 
  formatChaptersPrompt, 
  setSystemPrompt, 
  getSystemPrompt
} from '@/lib/AIservice';

// 防抖函数
const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): DebouncedFunction<T> => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  // 创建一个包含函数主体和cancel方法的对象
  const debouncedFn = ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  }) as DebouncedFunction<T>;
  
  // 显式添加cancel方法
  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debouncedFn;
};

interface Chapter {
  title: string;
  content: string;
}

// 章节管理侧边栏组件
const ChapterSidebar = ({ 
  chapters, 
  activeChapter, 
  onChapterClick, 
  onAddChapter 
}: { 
  chapters: Chapter[]; 
  activeChapter: number; 
  onChapterClick: (index: number) => void; 
  onAddChapter: () => void; 
}) => {
  return (
    <div className="w-64 border-r border-gray-200 bg-white shadow-sm flex flex-col rounded-tr-2xl rounded-br-2xl">
      <div className="p-5 border-b border-gray-200 flex items-center">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-full flex items-center justify-center text-white font-bold mr-3 text-base shadow-sm">智</div>
        <span className="text-gray-800 text-lg font-medium tracking-wide font-serif">智界引擎</span>
      </div>
      
      <div className="flex-1 py-6 px-2 overflow-auto">
        <div className="mb-4 px-3 flex justify-between items-center">
          <span className="text-gray-700 font-medium text-lg transform -translate-y-[2px]">章节管理</span>
          <button 
            className="p-1 rounded-full hover:bg-gray-100 transition-colors duration-200 transform translate-y-[2px]"
            onClick={onAddChapter}
            title="添加新章节"
          >
            <span className="material-icons text-blue-500">add_circle</span>
          </button>
        </div>
        {chapters.map((chapter, index) => (
          <div 
            key={index}
            className={`menu-item ${activeChapter === index ? 'active' : ''}`}
            onClick={() => onChapterClick(index)}
          >
            <div className="menu-icon">
              <span className="material-icons text-2xl">article</span>
            </div>
            <span className="menu-text truncate">第 {index + 1} 章</span>
          </div>
        ))}
      </div>
      
      <div className="p-4 mt-auto">
        {/* 移除底部的添加新章节按钮 */}
      </div>
    </div>
  );
};

// 富文本编辑器组件
const RichTextEditor = ({
  content,
  onChange,
  title,
  onTitleChange,
  onSave,
  isSaving,
}: {
  content: string;
  onChange: (content: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  isSaving: boolean;
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-white rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full text-3xl font-bold border-none focus:outline-none focus:ring-0 bg-transparent text-gray-800"
          placeholder="章节标题"
        />
      </div>
      <div className="flex-1 overflow-auto relative">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full absolute inset-0 border-none focus:outline-none focus:ring-0 resize-none text-gray-700 p-6"
          placeholder="开始创作你的故事..."
          style={{ 
            fontFamily: "'思源黑体', 'Noto Sans SC', sans-serif", 
            fontSize: '16pt', 
            fontWeight: 400,
            lineHeight: '2.0',
            backgroundColor: '#F2F8F2' 
          }}
        ></textarea>
      </div>
      <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
        <div>
          <span className="mr-4">字数: {content.length}</span>
        </div>
        <div>
          {isSaving && (
            <span className="text-blue-500 flex items-center">
              <span className="material-icons animate-spin mr-2 text-sm">refresh</span>
              <span>保存中...</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// 弹窗组件
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
  customContent = false,
  splitView = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode | string;
  children: React.ReactNode;
  maxWidth?: string;
  customContent?: boolean;
  splitView?: boolean;
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className={`bg-white rounded-2xl shadow-lg w-[56%] h-[80%] ${splitView ? "max-w-[56%]" : maxWidth} overflow-hidden flex flex-col`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex-1 flex items-center">
            {typeof title === 'string' ? (
              <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            ) : (
              title
            )}
          </div>
          <button 
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        {customContent ? (
          children
        ) : (
          <div className={`${splitView ? "flex" : ""} overflow-auto flex-1`} style={{ height: 'calc(100% - 80px)' }}>
            {splitView ? (
              <>
                {/* 左侧窗口 - 4:3比例 */}
                <div className="w-1/2 border-r border-gray-200 p-6 bg-gray-50" style={{ height: '100%' }}>
                  {/* 左侧暂时不添加内容 */}
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <span className="material-icons text-4xl mb-2">view_sidebar</span>
                      <p>左侧窗口区域</p>
                    </div>
                  </div>
                </div>
                {/* 右侧窗口 - 4:3比例 */}
                <div className="w-1/2 p-6" style={{ height: '100%' }}>
                  {children}
                </div>
              </>
            ) : (
              <div className="p-6">
                {children}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 分析结果弹窗组件
const AnalysisResultModal = ({ 
  isOpen, 
  onClose, 
  result, 
  isLoading, 
  activeChapter, 
  chapters, 
  setChapters 
}: { 
  // 是否显示弹窗
  isOpen: boolean; 
  // 关闭弹窗的回调函数
  onClose: () => void; 
  // 分析结果文本
  result: string; 
  // 是否正在加载中
  isLoading: boolean; 
  // 当前活动章节的索引
  activeChapter: number; 
  // 章节数组
  chapters: Chapter[]; 
  // 更新章节的回调函数
  setChapters: React.Dispatch<React.SetStateAction<Chapter[]>>; 
}) => {
  if (!isOpen) return null;
  
  // 添加滚动容器的引用
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  
  // 创建防抖滚动函数 - 延迟滚动到底部，优化性能
  const debouncedScroll = React.useMemo(() => 
    debounce(() => {
      if (scrollContainerRef.current && result) {
        const scrollContainer = scrollContainerRef.current as HTMLDivElement;
        // 延迟滚动，等待内容渲染
        setTimeout(() => {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth' as ScrollBehavior
          });
        }, 300);
      }
    }, 200), 
    [result]
  );
  
  // 监听结果变化，自动滚动到底部
  React.useEffect(() => {
    if (result && isLoading) {
      debouncedScroll();
    }
  }, [result, debouncedScroll, isLoading]);
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={
        <div className="flex items-center">
          <span className="text-xl font-bold text-gray-800">分析结果</span>
          {result && (
            <div className="ml-4 text-sm text-gray-500 flex items-center">
              <span className="material-icons text-gray-400 mr-1 text-sm">format_list_numbered</span>
              <span>{result.length} 字</span>
              {isLoading && <span className="ml-2 text-blue-500">(生成中...)</span>}
            </div>
          )}
        </div>
      }
      maxWidth="max-w-4xl"
      customContent={true}
    >
      <div className="flex flex-col h-[100%]">
        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
          <div className="prose prose-blue max-w-none p-6" style={{ 
            fontFamily: "'思源黑体', 'Noto Sans SC', sans-serif", 
            fontSize: '16pt', 
            fontWeight: '400', 
            lineHeight: '2.0', 
            backgroundColor: '#ffffff' 
          }}>
            {isLoading && (
              <div className="mb-4 flex items-center">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse mr-1"></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse delay-150 mr-1"></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse delay-300 mr-3"></div>
                <span className="text-blue-600 text-sm">AI正在分析中...</span>
              </div>
            )}
            <div className="whitespace-pre-wrap">
              {result && result.split('\n').map((line: string, index: number) => (
                <div 
                  key={index} 
                  className="animate-typing" 
                  style={{ 
                    animationDelay: `${index * 0.01}s`,
                    marginBottom: index < result.split('\n').length - 1 ? '0.5em' : '0'
                  }}
                >
                  {line || ' '}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 按钮区域 - 固定在底部 */}
        {result && !isLoading && (
          <div className="p-4 border-t border-gray-100 flex justify-between bg-white">
            <button 
              className="btn-outline"
              onClick={() => {
                // 将生成的内容应用到当前章节
                if (result && activeChapter >= 0 && activeChapter < chapters.length) {
                  const updatedChapters = [...chapters];
                  updatedChapters[activeChapter] = {
                    ...updatedChapters[activeChapter],
                    content: updatedChapters[activeChapter].content + "\n\n" + result
                  };
                  setChapters(updatedChapters);
                  onClose();
                }
              }}
            >
              <span className="material-icons mr-2 text-sm">add</span>
              <span>应用到当前章节</span>
            </button>
            <button 
              className="btn-primary"
              onClick={onClose}
            >
              <span className="material-icons mr-2 text-sm">check</span>
              <span>关闭</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

// 章节选择弹窗组件
const ChapterSelectionModal = ({ 
  isOpen, 
  onClose, 
  chapters, 
  selectedChapters, 
  setSelectedChapters,
  title = "选择章节"
}: { 
  // 是否显示弹窗
  isOpen: boolean; 
  // 关闭弹窗的回调函数
  onClose: () => void; 
  // 章节数组
  chapters: Chapter[]; 
  // 当前选中的章节索引数组
  selectedChapters: number[]; 
  // 更新选中章节的回调函数
  setSelectedChapters: React.Dispatch<React.SetStateAction<number[]>>; 
  // 弹窗标题
  title?: string; 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-lg w-[48%] h-[75%] overflow-hidden">
        {/* 弹窗标题栏 */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <span className="material-icons text-blue-500 mr-3">library_books</span>
            {title}
          </h3>
          <button 
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        
        {/* 章节列表 */}
        <div className="p-6 h-[calc(100%-130px)] overflow-y-auto">
          <div className="grid grid-cols-1 gap-3">
            {chapters.map((chapter: Chapter, index: number) => (
              <div 
                key={index} 
                className={`flex items-center p-4 rounded-2xl border ${
                  selectedChapters.includes(index) 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                } transition-colors duration-200 cursor-pointer`}
                onClick={() => {
                  if (selectedChapters.includes(index)) {
                    setSelectedChapters(selectedChapters.filter((i: number) => i !== index));
                  } else {
                    // 按照索引顺序添加章节，而不是简单地追加到数组末尾
                    const newSelectedChapters = [...selectedChapters, index].sort((a: number, b: number) => a - b);
                    setSelectedChapters(newSelectedChapters);
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedChapters.includes(index)}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (selectedChapters.includes(index)) {
                      setSelectedChapters(selectedChapters.filter(i => i !== index));
                    } else {
                      // 按照索引顺序添加章节，而不是简单地追加到数组末尾
                      const newSelectedChapters = [...selectedChapters, index].sort((a, b) => a - b);
                      setSelectedChapters(newSelectedChapters);
                    }
                  }}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded-full focus:ring-blue-500 cursor-pointer"
                />
                <div className="ml-3 flex-1">
                  <div className="font-medium text-gray-800">
                    {chapter.title || `章节 ${index + 1}`}
                  </div>
                  {chapter.content && (
                    <p className="text-gray-500 text-sm mt-1 line-clamp-1">
                      {chapter.content.substring(0, 100)}
                    </p>
                  )}
                </div>
                <span 
                  className={`material-icons ${selectedChapters.includes(index) ? 'text-blue-500' : 'text-gray-300'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedChapters.includes(index)) {
                      setSelectedChapters(selectedChapters.filter(i => i !== index));
                    } else {
                      // 按照索引顺序添加章节，而不是简单地追加到数组末尾
                      const newSelectedChapters = [...selectedChapters, index].sort((a, b) => a - b);
                      setSelectedChapters(newSelectedChapters);
                    }
                  }}
                >
                  {selectedChapters.includes(index) ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-5 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-2xl">
          <div className="text-gray-500 text-sm">
            共 {chapters.length} 个章节，已选择 {selectedChapters.length} 个
          </div>
          <div className="flex gap-3">
            <button 
              className="btn-outline rounded-full px-5"
              onClick={() => setSelectedChapters([])}
            >
              清除选择
            </button>
            <button 
              className="btn-primary rounded-full px-5"
              onClick={onClose}
            >
              确认选择
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 定义防抖函数的类型，包含cancel方法
type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): ReturnType<T>;
  cancel: () => void;
};

export default function WorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workId = params?.id ? Number(params.id) : 0;
  
  const [work, setWork] = useState<Work | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // 章节相关状态
  const [chapters, setChapters] = useState([{ title: '', content: '' }]);
  const [activeChapter, setActiveChapter] = useState(0);
  
  // 弹窗相关状态
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);
  
  // 分析相关状态
  const [selectedModel, setSelectedModel] = useState(MODELS.GEMINI_FLASH);
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPromptState] = useState(getSystemPrompt());
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalysisResultModalOpen, setIsAnalysisResultModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 写作相关状态
  const [selectedWritingModel, setSelectedWritingModel] = useState(MODELS.GEMINI_FLASH);
  const [writingSystemPrompt, setWritingSystemPrompt] = useState(getSystemPrompt());
  const [selectedWritingChapters, setSelectedWritingChapters] = useState<number[]>([]);
  const [writingResult, setWritingResult] = useState('');
  const [isWritingResultModalOpen, setIsWritingResultModalOpen] = useState(false);
  
  // 提示词相关状态
  const [analysisPrompts, setAnalysisPrompts] = useState<Prompt[]>([]);
  const [writingPrompts, setWritingPrompts] = useState<Prompt[]>([]);
  const [selectedAnalysisPromptId, setSelectedAnalysisPromptId] = useState<number | 'custom'>('custom');
  const [selectedWritingPromptId, setSelectedWritingPromptId] = useState<number | 'custom'>('custom');
  const [customAnalysisPrompt, setCustomAnalysisPrompt] = useState('');
  const [customWritingPrompt, setCustomWritingPrompt] = useState('');
  
  // 章节选择弹窗状态
  const [isAnalysisChapterModalOpen, setIsAnalysisChapterModalOpen] = useState(false);
  const [isWritingChapterModalOpen, setIsWritingChapterModalOpen] = useState(false);
  
  // 新增的写作结果弹窗滚动引用
  const writingScrollRef = React.useRef(null);
  
  // 创建防抖的自动保存函数
  const autoSave = useMemo<DebouncedFunction<() => Promise<void>>>(() => 
    debounce(async () => {
      if (!work) return;
      
      setIsSaving(true);
      try {
        // 将章节数据序列化为JSON字符串
        const updatedWork = {
          ...work,
          content: JSON.stringify(chapters),
          updatedAt: new Date()
        };
        
        await updateWork(updatedWork);
        setWork(updatedWork);
        console.log('自动保存成功', new Date().toLocaleTimeString());
      } catch (error) {
        console.error('自动保存失败:', error);
        setError('自动保存失败');
      } finally {
        setIsSaving(false);
      }
    }, 2000),
    [work, chapters, setIsSaving, setWork, setError]
  );
  
  // 添加清理函数来取消待处理的自动保存
  useEffect(() => {
    return () => {
      // 在组件卸载时取消任何待处理的自动保存
      autoSave.cancel();
    };
  }, [autoSave]);
  
  // 在章节内容变化时明确触发保存
  useEffect(() => {
    if (work && chapters.length > 0) {
      autoSave();
    }
  }, [chapters, autoSave, work]);
  
  // 创建防抖滚动函数
  const debouncedWritingScroll = useMemo<DebouncedFunction<() => void>>(() => 
    debounce(() => {
      if (writingScrollRef.current) {
        const scrollContainer = writingScrollRef.current as HTMLDivElement;
        // 延迟滚动，等待内容渲染
        setTimeout(() => {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth' as ScrollBehavior
          });
        }, 300);
      }
    }, 200), 
    [writingResult]
  );
  
  // 监听写作结果变化，自动滚动到底部
  useEffect(() => {
    if (writingResult && isGenerating) {
      debouncedWritingScroll();
    }
  }, [writingResult, debouncedWritingScroll, isGenerating]);
  
  useEffect(() => {
    const fetchWork = async () => {
      try {
        const workData = await getWorkById(workId);
        if (!workData) {
          router.push('/works');
          return;
        }
        
        setWork(workData);
        
        // 如果作品内容中有章节数据，解析它
        try {
          if (workData.content) {
            const parsedChapters = JSON.parse(workData.content);
            if (Array.isArray(parsedChapters) && parsedChapters.length > 0) {
              setChapters(parsedChapters);
            }
          }
        } catch (e) {
          // 如果解析失败，将现有内容作为第一章节
          setChapters([{ title: '第一章', content: workData.content || '' }]);
        }
      } catch (error) {
        console.error('获取作品失败:', error);
        setError('获取作品失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (workId) {
      fetchWork();
    }
    
    // 设置默认的prompt值
    setPrompt("请分析所选章节");
    
    // 设置默认的系统提示词
    const defaultSystemPrompt = "请分析所选章节";
    setSystemPromptState(defaultSystemPrompt);
    setSystemPrompt(defaultSystemPrompt); // 调用AIservice中的setSystemPrompt函数
    
    // 加载提示词
    const loadPrompts = async () => {
      try {
        const analysisPromptsData = await getPromptsByType('analysis');
        const writingPromptsData = await getPromptsByType('writing');
        console.log('加载的分析提示词:', analysisPromptsData);
        console.log('加载的写作提示词:', writingPromptsData);
        setAnalysisPrompts(analysisPromptsData);
        setWritingPrompts(writingPromptsData);
        
        // 设置默认的自定义提示词
        setCustomAnalysisPrompt("请分析所选章节");
        setCustomWritingPrompt("请继续写作所选章节");
        
        // 如果有提示词，设置默认选中的提示词ID
        if (analysisPromptsData.length > 0) {
          setSelectedAnalysisPromptId('custom');
        }
        if (writingPromptsData.length > 0) {
          setSelectedWritingPromptId('custom');
        }
      } catch (error) {
        console.error('加载提示词失败:', error);
      }
    };
    
    loadPrompts();
  }, [workId, router]);
  
  // 处理章节点击事件
  const handleChapterClick = (index: number) => {
    setActiveChapter(index);
  };
  
  // 处理章节内容变更
  const handleChange = (content: string) => {
    if (activeChapter >= 0 && activeChapter < chapters.length) {
      const newChapters = [...chapters];
      newChapters[activeChapter] = {
        ...newChapters[activeChapter],
        content: content
      };
      setChapters(newChapters);
    }
  };
  
  // 处理章节标题变更
  const handleTitleChange = (title: string) => {
    if (activeChapter >= 0 && activeChapter < chapters.length) {
      const newChapters = [...chapters];
      newChapters[activeChapter] = {
        ...newChapters[activeChapter],
        title: title
      };
      setChapters(newChapters);
    }
  };
  
  const handleAddChapter = () => {
    const newChapter = { title: '', content: '' };
    const newChapters = [...chapters, newChapter];
    
    // 先更新章节列表
    setChapters(newChapters);
    // 设置激活章节为新添加的章节
    setActiveChapter(chapters.length);
    
    // 使用新的章节数组直接保存，而不是依赖于状态更新
    if (work) {
      setIsSaving(true);
      try {
        const updatedWork = {
          ...work,
          content: JSON.stringify(newChapters),
          updatedAt: new Date()
        };
        
        updateWork(updatedWork)
          .then(() => {
            setWork(updatedWork);
            console.log('新章节保存成功', new Date().toLocaleTimeString());
          })
          .catch(err => {
            console.error('保存新章节失败:', err);
            setError('保存新章节失败');
          })
          .finally(() => {
            setIsSaving(false);
          });
      } catch (error) {
        console.error('保存新章节失败:', error);
        setError('保存新章节失败');
        setIsSaving(false);
      }
    }
  };
  
  const handleSave = async () => {
    if (!work) return;
    
    setIsSaving(true);
    try {
      // 将章节数据序列化为JSON字符串
      const updatedWork = {
        ...work,
        content: JSON.stringify(chapters),
        updatedAt: new Date()
      };
      
      await updateWork(updatedWork);
      setWork(updatedWork);
    } catch (error) {
      console.error('保存作品失败:', error);
      setError('保存作品失败');
    } finally {
      setIsSaving(false);
    }
  };
  
  // 处理章节选择
  const handleChapterSelect = (index: number) => {
    if (selectedChapters.includes(index)) {
      setSelectedChapters(selectedChapters.filter(i => i !== index));
    } else {
      // 按照索引顺序添加章节，而不是简单地追加到数组末尾
      const newSelectedChapters = [...selectedChapters, index].sort((a, b) => a - b);
      setSelectedChapters(newSelectedChapters);
    }
  };
  
  // 处理systemPrompt变更
  const handleSystemPromptChange = (value: string) => {
    setSystemPromptState(value);
    setPrompt(value);
    setSystemPrompt(value);
  };
  
  // 处理生成分析
  const handleGenerateAnalysis = async () => {
    if (selectedChapters.length === 0) {
      setError('请至少选择一个章节进行分析');
      return;
    }
    
    if (!prompt.trim()) {
      setError('请输入提示词');
      return;
    }
    
    setIsGenerating(true);
    setIsAnalysisResultModalOpen(true);
    setAnalysisResult('');
    
    try {
      // 使用formatChaptersPrompt函数构建发送给AI的内容
      const fullPrompt = formatChaptersPrompt(chapters, selectedChapters, prompt);
      
      // 使用流式输出
      let resultText = '';
      await generateAIContentStream(
        fullPrompt, 
        {
          model: selectedModel,
          systemPrompt: systemPrompt, 
          temperature: 0.7,
          stream: true
        },
        (chunk) => {
          resultText += chunk;
          setAnalysisResult(resultText);
        }
      );
      
      setIsGenerating(false);
      
      // 关闭分析设置弹窗 - 注释掉此行，防止自动关闭
      // setIsAnalysisModalOpen(false);
    } catch (error: unknown) {
      console.error('生成分析失败:', error);
      // 将捕获到的错误消息设置为 error 状态
      setError(error instanceof Error ? error.message : '生成分析失败，请稍后重试');
      setIsGenerating(false);
    }
  };
  
  // 处理章节选择（写作）
  const handleWritingChapterSelect = (index: number) => {
    if (selectedWritingChapters.includes(index)) {
      setSelectedWritingChapters(selectedWritingChapters.filter(i => i !== index));
    } else {
      // 按照索引顺序添加章节，而不是简单地追加到数组末尾
      const newSelectedChapters = [...selectedWritingChapters, index].sort((a, b) => a - b);
      setSelectedWritingChapters(newSelectedChapters);
    }
  };
  
  // 处理writingSystemPrompt变更
  const handleWritingSystemPromptChange = (value: string) => {
    setWritingSystemPrompt(value);
    setSystemPrompt(value);
  };
  
  // 处理AI写作
  const handleGenerateWriting = async () => {
    if (!writingSystemPrompt.trim()) {
      setError('请输入提示词，提示词不能为空');
      return;
    }
    
    setIsGenerating(true);
    setIsWritingResultModalOpen(true);
    setWritingResult('');
    
    try {
      // 构建提示内容
      let fullPrompt = '';
      
      // 如果选择了章节，则使用formatChaptersPrompt函数
      if (selectedWritingChapters.length > 0) {
        fullPrompt = formatChaptersPrompt(chapters, selectedWritingChapters, writingSystemPrompt);
      } else {
        // 如果没有选择章节，则直接使用提示词
        fullPrompt = writingSystemPrompt;
      }
      
      // 使用流式输出
      let resultText = '';
      await generateAIContentStream(
        fullPrompt, 
        {
          model: selectedWritingModel,
          systemPrompt: writingSystemPrompt, 
          temperature: 0.7,
          stream: true
        },
        (chunk) => {
          resultText += chunk;
          setWritingResult(resultText);
        }
      );
      
      setIsGenerating(false);
      
      // 关闭写作设置弹窗 - 注释掉此行，防止自动关闭
      // setIsWritingModalOpen(false);
    } catch (error: unknown) {
      console.error('生成写作内容失败:', error);
      // 将捕获到的错误消息设置为 error 状态
      setError(error instanceof Error ? error.message : '生成写作内容失败，请稍后重试');
      setIsGenerating(false);
    }
  };
  
  // 处理分析提示词选择
  const handleAnalysisPromptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      setSelectedAnalysisPromptId('custom');
      setSystemPromptState(customAnalysisPrompt);
      setSystemPrompt(customAnalysisPrompt);
    } else {
      const promptId = parseInt(value);
      setSelectedAnalysisPromptId(promptId);
      const selectedPrompt = analysisPrompts.find(p => p.id === promptId);
      if (selectedPrompt) {
        setSystemPromptState(selectedPrompt.content);
        setSystemPrompt(selectedPrompt.content);
      }
    }
  };
  
  // 处理写作提示词选择
  const handleWritingPromptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log('选择的写作提示词值:', value);
    if (value === 'custom') {
      setSelectedWritingPromptId('custom');
      setWritingSystemPrompt(customWritingPrompt);
      setSystemPrompt(customWritingPrompt);
    } else {
      const promptId = parseInt(value);
      setSelectedWritingPromptId(promptId);
      console.log('写作提示词列表:', writingPrompts);
      console.log('查找ID:', promptId);
      const selectedPrompt = writingPrompts.find(p => p.id === promptId);
      console.log('找到的提示词:', selectedPrompt);
      if (selectedPrompt) {
        setWritingSystemPrompt(selectedPrompt.content);
        setSystemPrompt(selectedPrompt.content);
      }
    }
  };
  
  // 处理自定义分析提示词变更
  const handleCustomAnalysisPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomAnalysisPrompt(e.target.value);
    if (selectedAnalysisPromptId === 'custom') {
      setSystemPromptState(e.target.value);
      setSystemPrompt(e.target.value);
    }
  };
  
  // 处理自定义写作提示词变更
  const handleCustomWritingPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomWritingPrompt(e.target.value);
    if (selectedWritingPromptId === 'custom') {
      setWritingSystemPrompt(e.target.value);
      setSystemPrompt(e.target.value);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-200 rounded-full mb-4"></div>
          <div className="h-4 w-24 bg-blue-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!work) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <span className="material-icons text-4xl text-gray-300 mb-3">error</span>
          <p className="text-gray-500">作品不存在或已被删除</p>
          <button 
            className="btn-primary mt-4"
            onClick={() => router.push('/works')}
          >
            返回作品列表
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-50 animate-fadeIn">
      {/* 左侧章节管理 */}
      <ChapterSidebar 
        chapters={chapters}
        activeChapter={activeChapter}
        onChapterClick={handleChapterClick}
        onAddChapter={handleAddChapter}
      />
      
      {/* 中间内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <div className="h-16 border-b border-gray-200 bg-white shadow-sm flex justify-between items-center px-8 rounded-bl-2xl">
          <div className="flex items-center">
            <BackButton />
            <h1 className="text-xl font-medium text-gray-800 mr-4 truncate">{work.title}</h1>
            <span className={`badge ${
              work.type === 'novel' ? 'badge-blue' :
              work.type === 'character' ? 'badge-purple' :
              work.type === 'worldbuilding' ? 'badge-green' :
              'badge-yellow'
            }`}>
              {work.type === 'novel' ? '小说' :
               work.type === 'character' ? '角色' :
               work.type === 'worldbuilding' ? '世界' :
               '情节'}
            </span>
          </div>
          <div className="flex items-center">
            <div className="text-sm text-gray-500 flex items-center mr-6">
              <span className="material-icons text-gray-400 mr-2 text-sm">update</span>
              上次保存: {work.updatedAt ? new Date(work.updatedAt).toLocaleString() : '从未保存'}
            </div>
            <button 
              className="btn-outline mr-3"
              onClick={() => setIsAnalysisModalOpen(true)}
            >
              <span className="material-icons mr-2 text-sm">analytics</span>
              <span>分析</span>
            </button>
            <button 
              className="btn-primary"
              onClick={() => setIsWritingModalOpen(true)}
            >
              <span className="material-icons mr-2 text-sm">edit_note</span>
              <span>写作</span>
            </button>
          </div>
        </div>
        
        {/* 富文本编辑器 */}
        <div className="flex-1 flex overflow-hidden p-5">
          <div className="flex-1 flex rounded-xl overflow-hidden shadow-sm">
            <RichTextEditor 
              content={chapters[activeChapter]?.content || ''}
              onChange={handleChange}
              title={chapters[activeChapter]?.title || ''}
              onTitleChange={handleTitleChange}
              onSave={handleSave}
              isSaving={isSaving}
            />
          </div>
        </div>
      </div>
      
      {/* 分析弹窗 */}
      <Modal 
        isOpen={isAnalysisModalOpen} 
        onClose={() => setIsAnalysisModalOpen(false)}
        title="内容分析"
        splitView={true}
      >
        <div className="space-y-6 flex flex-col h-full">
          <div className="flex-1 overflow-auto pr-2">
            {/* 模型选择 */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 mb-3">1. 模型选择</h4>
              <div className="bg-gray-50 p-4 rounded-xl">
                <select
                  className="input"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <option value={MODELS.GEMINI_FLASH}>Gemini Flash - 快速响应，适合一般分析</option>
                  <option value={MODELS.GEMINI_PRO}>Gemini Pro - 更高质量分析，支持更长文本</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">选择不同的AI模型以获得不同的分析效果。Gemini Flash响应更快，Gemini Pro支持更长文本和提供更高质量的分析结果。</p>
              </div>
            </div>
            
            {/* 提示词选择 - 改为下拉菜单 */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 mb-3">2. 提示词选择</h4>
              <div className="bg-gray-50 p-4 rounded-xl">
                <select
                  value={selectedAnalysisPromptId === 'custom' ? 'custom' : selectedAnalysisPromptId}
                  onChange={handleAnalysisPromptSelect}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                >
                  <option value="custom">自定义提示词</option>
                  {analysisPrompts && analysisPrompts.length > 0 ? (
                    analysisPrompts.map(prompt => (
                      <option key={prompt.id} value={prompt.id}>
                        {prompt.title}
                      </option>
                    ))
                  ) : (
                    <option value="custom" disabled>加载中...</option>
                  )}
                </select>
                
                {selectedAnalysisPromptId === 'custom' ? (
                  <textarea
                    value={customAnalysisPrompt}
                    onChange={handleCustomAnalysisPromptChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20"
                    placeholder="输入自定义提示词"
                  ></textarea>
                ) : (
                  <div className="bg-white p-3 border border-gray-200 rounded-xl">
                    <p className="text-gray-700">已选择提示词：{analysisPrompts.find(p => p.id === selectedAnalysisPromptId)?.title || '未找到提示词'}</p>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">从提示词管理中选择分析类提示词，或使用自定义提示词</p>
              </div>
            </div>
            
            {/* 关联章节 - 改为按钮点击弹窗选择 */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 mb-3">3. 关联章节</h4>
              <div className="bg-gray-50 p-4 rounded-xl">
                <button 
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-full hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  onClick={() => setIsAnalysisChapterModalOpen(true)}
                >
                  <div className="flex items-center">
                    <span className="material-icons text-gray-500 mr-2">library_books</span>
                    <span className="text-gray-700">
                      {selectedChapters.length > 0 
                        ? `已选择 ${selectedChapters.length} 个章节` 
                        : '点击选择章节'}
                    </span>
                  </div>
                  <span className="material-icons text-gray-400">chevron_right</span>
                </button>
                
                <p className="text-xs text-gray-500 mt-2">选择需要分析的章节，可多选</p>
              </div>
            </div>
            
            {/* 隐藏的prompt输入框，保持逻辑不变 */}
            <input
              type="hidden"
              value={prompt || "请分析所选章节"}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          
          {/* 生成按钮 - 固定在底部 */}
          <div className="pt-4 border-t border-gray-200 flex justify-end mt-auto">
            <button 
              className="btn-primary w-full flex items-center justify-center"
              onClick={handleGenerateAnalysis}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="material-icons animate-spin mr-2 text-sm">refresh</span>
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <span className="material-icons mr-2 text-sm">auto_awesome</span>
                  <span>生成分析</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
      
      {/* 写作弹窗 */}
      <Modal 
        isOpen={isWritingModalOpen} 
        onClose={() => setIsWritingModalOpen(false)}
        title="AI写作助手"
        splitView={true}
      >
        <div className="space-y-6 flex flex-col h-full">
          <div className="flex-1 overflow-auto pr-2">
            {/* 模型选择 */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 mb-3">1. 模型选择</h4>
              <div className="bg-gray-50 p-4 rounded-xl">
                <select
                  className="input"
                  value={selectedWritingModel}
                  onChange={(e) => setSelectedWritingModel(e.target.value)}
                >
                  <option value={MODELS.GEMINI_FLASH}>Gemini Flash - 快速响应，适合一般写作</option>
                  <option value={MODELS.GEMINI_PRO}>Gemini Pro - 更高质量写作，支持更长文本</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">选择不同的AI模型以获得不同的写作效果。Gemini Flash响应更快，Gemini Pro支持更长文本和提供更高质量的写作结果。</p>
              </div>
            </div>
            
            {/* 提示词选择 - 改为下拉菜单 */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 mb-3">2. 提示词选择 <span className="text-red-500">*</span></h4>
              <div className="bg-gray-50 p-4 rounded-xl">
                <select
                  value={selectedWritingPromptId === 'custom' ? 'custom' : selectedWritingPromptId}
                  onChange={handleWritingPromptSelect}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                >
                  <option value="custom">自定义提示词</option>
                  {writingPrompts && writingPrompts.length > 0 ? (
                    writingPrompts.map(prompt => (
                      <option key={prompt.id} value={prompt.id}>
                        {prompt.title}
                      </option>
                    ))
                  ) : (
                    <option value="custom" disabled>加载中...</option>
                  )}
                </select>
                
                {selectedWritingPromptId === 'custom' ? (
                  <textarea
                    value={customWritingPrompt}
                    onChange={handleCustomWritingPromptChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
                    placeholder="输入自定义提示词，例如：'继续写下去'、'为我创作一个新的场景'、'为角色添加更多对话'等"
                  ></textarea>
                ) : (
                  <div className="bg-white p-3 border border-gray-200 rounded-xl">
                    <p className="text-gray-700">已选择提示词：{writingPrompts.find(p => p.id === selectedWritingPromptId)?.title || '未找到提示词'}</p>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">从提示词管理中选择写作类提示词，或使用自定义提示词</p>
              </div>
            </div>
            
            {/* 选择章节 - 改为按钮点击弹窗选择 */}
            <div>
              <h4 className="text-lg font-medium text-gray-800 mb-3">3. 选择章节（可选）</h4>
              <div className="bg-gray-50 p-4 rounded-xl">
                <button 
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-full hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  onClick={() => setIsWritingChapterModalOpen(true)}
                >
                  <div className="flex items-center">
                    <span className="material-icons text-gray-500 mr-2">library_books</span>
                    <span className="text-gray-700">
                      {selectedWritingChapters.length > 0 
                        ? `已选择 ${selectedWritingChapters.length} 个章节` 
                        : '点击选择章节'}
                    </span>
                  </div>
                  <span className="material-icons text-gray-400">chevron_right</span>
                </button>
                
                <p className="text-xs text-gray-500 mt-2">选择需要参考的章节，不选择则不使用章节内容</p>
              </div>
            </div>
          </div>
          
          {/* 生成按钮 - 固定在底部 */}
          <div className="pt-4 border-t border-gray-200 flex justify-end mt-auto">
            <button 
              className="btn-primary w-full flex items-center justify-center"
              onClick={handleGenerateWriting}
              disabled={isGenerating}
            >
              {isGenerating ? (
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
      </Modal>
      
      {/* 分析章节选择弹窗 */}
      <ChapterSelectionModal
        isOpen={isAnalysisChapterModalOpen}
        onClose={() => setIsAnalysisChapterModalOpen(false)}
        chapters={chapters}
        selectedChapters={selectedChapters}
        setSelectedChapters={setSelectedChapters}
        title="选择需要分析的章节"
      />
      
      {/* 写作章节选择弹窗 */}
      <ChapterSelectionModal
        isOpen={isWritingChapterModalOpen}
        onClose={() => setIsWritingChapterModalOpen(false)}
        chapters={chapters}
        selectedChapters={selectedWritingChapters}
        setSelectedChapters={setSelectedWritingChapters}
        title="选择需要参考的章节"
      />
      
      {/* 分析结果弹窗 */}
      <AnalysisResultModal
        isOpen={isAnalysisResultModalOpen}
        onClose={() => setIsAnalysisResultModalOpen(false)}
        result={analysisResult}
        isLoading={isGenerating}
        activeChapter={activeChapter}
        chapters={chapters}
        setChapters={setChapters}
      />
      
      {/* 写作结果弹窗 */}
      <Modal 
        isOpen={isWritingResultModalOpen} 
        onClose={() => setIsWritingResultModalOpen(false)}
        title={
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-800">写作结果</span>
            {writingResult && (
              <div className="ml-4 text-sm text-gray-500 flex items-center">
                <span className="material-icons text-gray-400 mr-1 text-sm">format_list_numbered</span>
                <span>{writingResult.length} 字</span>
                {isGenerating && <span className="ml-2 text-blue-500">(生成中...)</span>}
              </div>
            )}
          </div>
        }
        maxWidth="max-w-4xl"
        customContent={true}
      >
        <div className="flex flex-col h-[100%]">
          {/* 内容区域 - 可滚动 */}
          <div className="flex-1 overflow-auto" ref={writingScrollRef}>
            <div className="prose prose-blue max-w-none p-6" style={{ 
              fontFamily: "'思源黑体', 'Noto Sans SC', sans-serif", 
              fontSize: '16pt', 
              fontWeight: '400', 
              lineHeight: '2.0', 
              backgroundColor: '#ffffff' 
            }}>
              {isGenerating && (
                <div className="mb-4 flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse mr-1"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse delay-150 mr-1"></div>
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse delay-300 mr-3"></div>
                  <span className="text-blue-600 text-sm">AI正在创作中...</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">
                {writingResult && writingResult.split('\n').map((line: string, index: number) => (
                  <div 
                    key={index} 
                    className="animate-typing" 
                    style={{ 
                      animationDelay: `${index * 0.01}s`,
                      marginBottom: index < writingResult.split('\n').length - 1 ? '0.5em' : '0'
                    }}
                  >
                    {line || ' '}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 按钮区域 - 固定在底部 */}
          {writingResult && !isGenerating && (
            <div className="p-4 border-t border-gray-100 flex justify-between bg-white">
              <button 
                className="btn-outline"
                onClick={() => {
                  // 将生成的内容应用到当前章节
                  if (writingResult && activeChapter >= 0 && activeChapter < chapters.length) {
                    const updatedChapters = [...chapters];
                    updatedChapters[activeChapter] = {
                      ...updatedChapters[activeChapter],
                      content: updatedChapters[activeChapter].content + "\n\n" + writingResult
                    };
                    setChapters(updatedChapters);
                    setIsWritingResultModalOpen(false);
                  }
                }}
              >
                <span className="material-icons mr-2 text-sm">add</span>
                <span>应用到当前章节</span>
              </button>
              <button 
                className="btn-primary"
                onClick={() => setIsWritingResultModalOpen(false)}
              >
                <span className="material-icons mr-2 text-sm">check</span>
                <span>关闭</span>
              </button>
            </div>
          )}
        </div>
      </Modal>
      
      {/* 错误提示 */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-100 rounded-xl p-4 shadow-lg animate-fadeIn">
          <div className="flex items-center">
            <span className="material-icons text-red-500 mr-2">error</span>
            <span className="text-red-600">{error}</span>
            <button 
              className="ml-4 text-red-500 hover:text-red-700"
              onClick={() => setError('')}
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 