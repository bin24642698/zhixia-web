'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/BackButton';
import { Prompt, getPromptsByType, deletePrompt, addPrompt } from '@/lib/db';
import { PromptDetailContent } from '../../[id]/page';

// 提示词类型映射
const promptTypeMap = {
  'analysis': { label: '分析', color: 'bg-blue-100 text-blue-800', icon: 'analytics', group: 'novel', gradient: 'from-blue-500 to-blue-600' },
  'writing': { label: '写作', color: 'bg-green-100 text-green-800', icon: 'create', group: 'novel', gradient: 'from-green-500 to-green-600' },
  'worldbuilding': { label: '世界观', color: 'bg-purple-100 text-purple-800', icon: 'public', group: 'creative', gradient: 'from-purple-500 to-purple-600' },
  'character': { label: '角色', color: 'bg-amber-100 text-amber-800', icon: 'person', group: 'creative', gradient: 'from-amber-500 to-amber-600' },
  'plot': { label: '情节', color: 'bg-rose-100 text-rose-800', icon: 'timeline', group: 'creative', gradient: 'from-rose-500 to-rose-600' },
  'introduction': { label: '导语', color: 'bg-indigo-100 text-indigo-800', icon: 'format_quote', group: 'creative', gradient: 'from-indigo-500 to-indigo-600' },
  'outline': { label: '大纲', color: 'bg-blue-100 text-blue-800', icon: 'format_list_bulleted', group: 'creative', gradient: 'from-blue-500 to-blue-600' },
  'detailed_outline': { label: '细纲', color: 'bg-teal-100 text-teal-800', icon: 'subject', group: 'creative', gradient: 'from-teal-500 to-teal-600' }
} as const;

// 提示词类型
type PromptType = keyof typeof promptTypeMap;

// 提示词模板
const promptTemplates = {
  'analysis': '分析[主题]的[方面]，指出其[特点]和[建议]。',
  'writing': '基于以下背景和要求，创作一段[类型]内容：\n\n背景：[背景信息]\n\n要求：[具体要求]',
  'worldbuilding': '设计一个[类型]的世界，包括其[历史/地理/文化/政治]等方面。重点描述[特点]。',
  'character': '创建一个[性格特点]的角色，包括其背景故事、动机、外貌特征和行为模式。',
  'plot': '设计一个关于[主题]的[类型]情节，包括起因、发展、高潮和结局。',
  'introduction': '为[类型]的故事创建一个引人入胜的开篇导语，设定[氛围]的基调，并引导读者关注[焦点]。',
  'outline': '为[主题]的[类型]故事创建一个大纲，包括主线规划、章节划分和核心情节点。',
  'detailed_outline': '基于大纲，为[章节名]创建详细的内容规划，包括场景描述、对话设计和情感氛围。'
};

// 定义Modal组件的参数类型
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}

// 弹窗组件
const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }: ModalProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className={`bg-white rounded-xl shadow-lg w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button 
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function PromptTypePage() {
  const router = useRouter();
  const params = useParams();
  const promptType = (params?.type as string) as PromptType;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<{
    title: string;
    type: PromptType;
    content: string;
    description: string;
    examples: string[];
  }>({
    title: '',
    type: promptType,
    content: promptTemplates[promptType as keyof typeof promptTemplates] || '',
    description: '',
    examples: ['']
  });

  // 卡片描述文本
  const descriptions = {
    'introduction': '创建引人入胜的开篇导语，为你的故事设定基调和氛围',
    'outline': '快速生成故事的主要框架和结构，帮助你规划创作方向',
    'detailed_outline': '基于大纲深入展开，为每个章节创建详细的内容规划',
    'character': '创建丰富多彩的角色，赋予他们独特的个性和背景故事',
    'worldbuilding': '构建完整的世界观，包括历史、地理、文化和社会结构',
    'plot': '设计引人入胜的情节，包括冲突、转折和高潮',
    'analysis': '用于分析故事内容、角色和情节的提示词',
    'writing': '用于生成和改进故事内容的提示词'
  };

  // 加载提示词数据
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setIsLoading(true);
        if (!promptType || !promptTypeMap[promptType as keyof typeof promptTypeMap]) {
          router.push('/prompts');
          return;
        }
        
        const loadedPrompts = await getPromptsByType(promptType);
        setPrompts(loadedPrompts);
      } catch (error) {
        console.error('加载提示词失败:', error);
        setPrompts([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPrompts();
  }, [promptType, router]);
  
  // 过滤提示词
  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = 
      prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      prompt.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (prompt.description && prompt.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // 处理类型变更
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as PromptType;
    setFormData({
      ...formData,
      type: newType,
      content: promptTemplates[newType] || ''
    });
  };
  
  // 处理输入变更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // 处理示例变更
  const handleExampleChange = (index: number, value: string) => {
    const newExamples = [...formData.examples];
    newExamples[index] = value;
    setFormData({
      ...formData,
      examples: newExamples
    });
  };
  
  // 添加示例
  const addExample = () => {
    setFormData({
      ...formData,
      examples: [...formData.examples, '']
    });
  };
  
  // 移除示例
  const removeExample = (index: number) => {
    const newExamples = [...formData.examples];
    newExamples.splice(index, 1);
    setFormData({
      ...formData,
      examples: newExamples
    });
  };
  
  // 打开创建提示词弹窗
  const openCreateModal = () => {
    setFormData({
      title: '',
      type: promptType,
      content: promptTemplates[promptType as keyof typeof promptTemplates] || '',
      description: '',
      examples: ['']
    });
    setSelectedPrompt(null);
    setShowCreateModal(true);
  };
  
  // 打开删除提示词弹窗
  const openDeleteModal = (prompt: Prompt, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedPrompt(prompt);
    setShowDeleteModal(true);
  };
  
  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = new Date();
      const promptData = {
        ...formData,
        createdAt: now,
        updatedAt: now
      };
      
      const newPrompt = await addPrompt(promptData);
      setPrompts(prev => [newPrompt, ...prev]);
      setShowCreateModal(false);
      
      // 刷新列表
      const updatedPrompts = await getPromptsByType(promptType);
      setPrompts(updatedPrompts);
    } catch (error) {
      console.error('创建提示词失败:', error);
      alert('创建提示词失败，请重试');
    }
  };
  
  // 处理删除
  const handleDelete = async () => {
    if (!selectedPrompt || !selectedPrompt.id) return;
    
    try {
      await deletePrompt(selectedPrompt.id);
      setPrompts(prev => prev.filter(p => p.id !== selectedPrompt.id));
      setShowDeleteModal(false);
    } catch (error) {
      console.error('删除提示词失败:', error);
      alert('删除提示词失败，请重试');
    }
  };
  
  // 打开详情弹窗
  const openDetailModal = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setShowDetailModal(true);
  };

  // 高亮搜索关键词
  const highlightMatch = (text: string, term: string) => {
    if (!term || !text) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part: string, i: number) => 
      part.toLowerCase() === term.toLowerCase() ? <mark key={i} className="bg-yellow-100 px-1 rounded">{part}</mark> : part
    );
  };

  // 截断内容
  const truncateContent = (content: string, length: number = 120) => {
    if (!content) return '';
    if (content.length <= length) return content;
    return content.slice(0, length) + '...';
  };

  return (
    <div className="flex h-screen bg-gray-50 animate-fadeIn">
      <Sidebar activeMenu="prompts" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        <div className="h-16 border-b border-gray-200 bg-white shadow-sm flex justify-between items-center px-8 rounded-bl-2xl">
          <div className="flex items-center">
            <BackButton />
            <h1 className="text-xl font-medium text-gray-800 mr-4">提示词管理</h1>
            <span className="badge badge-blue">管理</span>
          </div>
        </div>
        
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-full mx-auto px-0 sm:px-4 lg:container lg:mx-auto">
            {/* 提示词列表 */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md mr-4 ${
                    promptTypeMap[promptType as keyof typeof promptTypeMap]?.group === 'novel' 
                      ? 'bg-gradient-to-r from-blue-500 to-green-500' 
                      : 'bg-gradient-to-r from-purple-500 to-rose-500'
                  }`}>
                    <span className="material-icons text-xl">{promptTypeMap[promptType as keyof typeof promptTypeMap]?.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {promptTypeMap[promptType as keyof typeof promptTypeMap]?.label}提示词
                      <span className="ml-2 text-sm font-normal text-gray-500">({filteredPrompts.length})</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {descriptions[promptType as keyof typeof descriptions]}
                    </p>
                  </div>
                </div>
                <button 
                  className={`btn-primary flex items-center px-4 py-2 rounded-lg text-white font-medium ${
                    promptTypeMap[promptType as keyof typeof promptTypeMap]?.group === 'novel' 
                      ? 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700' 
                      : 'bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700'
                  } transition-all duration-200 shadow-sm hover:shadow-md`}
                  onClick={openCreateModal}
                >
                  <span className="material-icons text-sm mr-2">add</span>
                  创建提示词
                </button>
              </div>
              
              <div className="relative mb-6 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[240px] max-w-md">
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-icons text-gray-400">search</span>
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      placeholder="搜索提示词..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button 
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 flex items-center hover:bg-gray-50 transition-colors shadow-sm"
                    onClick={() => router.push('/prompts')}
                  >
                    <span className="material-icons text-sm mr-2">arrow_back</span>
                    返回分类
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-20">
              {isLoading ? (
                // 加载状态
                <div className="col-span-full flex justify-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredPrompts.length > 0 ? (
                // 显示提示词卡片
                <>
                  {/* 提示词列表 */}
                  {filteredPrompts.map(prompt => {
                    // 获取更新时间
                    const updatedAt = new Date(prompt.updatedAt);
                    const now = new Date();
                    const diffDays = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
                    
                    // 格式化时间显示
                    let timeDisplay;
                    if (diffDays === 0) {
                      timeDisplay = '今天';
                    } else if (diffDays === 1) {
                      timeDisplay = '昨天';
                    } else if (diffDays < 7) {
                      timeDisplay = `${diffDays}天前`;
                    } else {
                      timeDisplay = updatedAt.toLocaleDateString();
                    }
                    
                    const typeConfig = promptTypeMap[prompt.type as keyof typeof promptTypeMap] || {
                      name: '未知', 
                      icon: 'help_outline', 
                      color: 'gray',
                      description: '未定义的提示词类型'
                    };
                    
                    return (
                      <div 
                        key={prompt.id} 
                        className="card group relative cursor-pointer bg-white border border-gray-100 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 p-6 flex flex-col overflow-hidden h-80 w-[360px] flex-shrink-0 hover:translate-y-[-5px]"
                        onClick={() => openDetailModal(prompt)}
                      >
                        {/* 背景渐变效果 */}
                        <div className={`absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity duration-300 ${
                          promptTypeMap[promptType as keyof typeof promptTypeMap]?.group === 'novel' 
                            ? 'from-blue-600 to-green-600' 
                            : 'from-purple-600 to-rose-600'
                        }`}></div>
                        
                        <div className="flex items-center justify-between mb-5 relative">
                          <div className="flex items-center">
                            <span className={`material-icons text-xl ${promptTypeMap[prompt.type as keyof typeof promptTypeMap]?.color.split(' ')[1]} mr-2`}>
                              {promptTypeMap[prompt.type as keyof typeof promptTypeMap]?.icon}
                            </span>
                            <h3 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-200 truncate max-w-[180px]">{highlightMatch(prompt.title, searchTerm)}</h3>
                          </div>
                          <span className={`badge ${promptTypeMap[prompt.type as keyof typeof promptTypeMap]?.color} shadow-sm`}>
                            {promptTypeMap[prompt.type as keyof typeof promptTypeMap]?.label}
                          </span>
                        </div>
                        
                        <div className="mt-1 mb-5 relative flex-1">
                          <p className="text-gray-600 text-sm line-clamp-6 relative">
                            {truncateContent(prompt.content, 240)}
                          </p>
                          {/* 渐变遮罩 */}
                          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent"></div>
                        </div>
                        
                        <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center relative">
                          <div className="flex items-center text-xs text-gray-500">
                            <span className="material-icons text-gray-400 text-sm mr-1">schedule</span>
                            <span>{timeDisplay}</span>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              className="p-1.5 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/prompts/${prompt.id}`);
                              }}
                            >
                              <span className="material-icons text-sm">edit</span>
                            </button>
                            <button 
                              className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(prompt, e);
                              }}
                            >
                              <span className="material-icons text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                // 无提示词提示
                <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <span className="material-icons text-4xl">search_off</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">暂无提示词</h3>
                  <p className="text-gray-600 text-center max-w-md mb-6">
                    {searchTerm 
                      ? `没有找到包含"${searchTerm}"的提示词` 
                      : `你尚未创建任何${promptTypeMap[promptType as keyof typeof promptTypeMap]?.label}提示词，点击下方按钮创建第一个提示词。`}
                  </p>
                  <button 
                    className={`px-4 py-2 rounded-lg text-white flex items-center ${
                      promptTypeMap[promptType as keyof typeof promptTypeMap]?.group === 'novel' 
                        ? 'bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600' 
                        : 'bg-gradient-to-r from-purple-500 to-rose-500 hover:from-purple-600 hover:to-rose-600'
                    } transition-all duration-200`}
                    onClick={() => searchTerm ? setSearchTerm('') : openCreateModal()}
                  >
                    <span className="material-icons text-sm mr-2">{searchTerm ? 'clear' : 'add'}</span>
                    {searchTerm ? '清除搜索' : '创建提示词'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* 创建提示词弹窗 */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="创建新提示词"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">提示词标题 <span className="text-red-500">*</span></label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入提示词标题..."
              value={formData.title}
              onChange={handleInputChange}
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">提示词类型 <span className="text-red-500">*</span></label>
            <select
              id="type"
              name="type"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.type}
              onChange={handleTypeChange}
            >
              <option value={promptType}>{promptTypeMap[promptType as keyof typeof promptTypeMap]?.label}</option>
            </select>
            
            <div className="mt-2 flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${promptTypeMap[formData.type as keyof typeof promptTypeMap]?.color}`}>
                <span className="material-icons text-sm mr-1">{promptTypeMap[formData.type as keyof typeof promptTypeMap]?.icon}</span>
                {promptTypeMap[formData.type as keyof typeof promptTypeMap]?.label}
              </span>
              <span className="ml-2 text-sm text-gray-500">选择提示词的用途类型</span>
            </div>
          </div>
          
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">提示词内容 <span className="text-red-500">*</span></label>
            <textarea
              id="content"
              name="content"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[200px]"
              placeholder="输入提示词内容..."
              value={formData.content}
              onChange={handleInputChange}
            ></textarea>
            <p className="mt-1 text-sm text-gray-500">使用方括号 [关键词] 标记可替换的变量</p>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              id="description"
              name="description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
              placeholder="描述这个提示词的用途和使用场景..."
              value={formData.description}
              onChange={handleInputChange}
            ></textarea>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">使用示例</label>
              <button 
                type="button"
                className="text-blue-600 text-sm flex items-center hover:text-blue-800"
                onClick={addExample}
              >
                <span className="material-icons text-sm mr-1">add</span>
                添加示例
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.examples.map((example, index) => (
                <div key={index} className="flex items-start">
                  <textarea
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`示例 ${index + 1}...`}
                    value={example}
                    onChange={(e) => handleExampleChange(index, e.target.value)}
                    rows={2}
                  ></textarea>
                  {formData.examples.length > 1 && (
                    <button 
                      type="button"
                      className="ml-2 p-1 text-gray-400 hover:text-red-600"
                      onClick={() => removeExample(index)}
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-1 text-sm text-gray-500">添加使用示例帮助理解如何使用这个提示词</p>
          </div>
          
          <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
            <button 
              type="button"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setShowCreateModal(false)}
            >
              取消
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              创建提示词
            </button>
          </div>
        </form>
      </Modal>
      
      {/* 删除提示词弹窗 */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        title="删除提示词"
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-icons text-red-600 text-2xl">delete</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 text-center mb-2">确定要删除这个提示词吗？</h3>
            <p className="text-gray-600 text-center">
              您即将删除提示词 "{selectedPrompt?.title}"。此操作无法撤销。
            </p>
          </div>
          
          <div className="flex justify-center space-x-3">
            <button 
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setShowDeleteModal(false)}
            >
              取消
            </button>
            <button 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              onClick={handleDelete}
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
      
      {/* 提示词详情弹窗 */}
      <Modal 
        isOpen={showDetailModal} 
        onClose={() => setShowDetailModal(false)}
        title={selectedPrompt?.title || '提示词详情'}
        maxWidth="max-w-3xl"
      >
        <div className="p-6">
          {selectedPrompt && (
            <PromptDetailContent 
              prompt={selectedPrompt}
              showEditButtons={true}
              onEdit={() => {
                setShowDetailModal(false);
                router.push(`/prompts/${selectedPrompt.id}`);
              }}
              onDelete={() => {
                setShowDetailModal(false);
                openDeleteModal(selectedPrompt);
              }}
              onCopy={() => {
                navigator.clipboard.writeText(selectedPrompt.content);
                alert('提示词内容已复制到剪贴板');
              }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
} 