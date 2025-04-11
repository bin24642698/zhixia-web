'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/BackButton';
import { Prompt, addPrompt, deletePrompt, getAllPrompts, getPromptsByType } from '@/lib/db';
import { PromptDetailContent } from './[id]/page';

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

// 分组定义
const promptGroups = {
  'novel': { 
    label: '小说创作', 
    color: 'from-blue-500 to-green-500',
    icon: 'auto_stories',
    types: ['analysis', 'writing'] as PromptType[]
  },
  'creative': { 
    label: '创意地图', 
    color: 'from-purple-500 to-rose-500',
    icon: 'map',
    types: ['introduction', 'outline', 'detailed_outline', 'character', 'worldbuilding', 'plot'] as PromptType[]
  }
};

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

export default function PromptsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typePrompts, setTypePrompts] = useState<{[key in PromptType]?: Prompt[]}>({});
  const [formData, setFormData] = useState({
    title: '',
    type: 'analysis' as Prompt['type'],
    content: promptTemplates['analysis'],
    description: '',
    examples: ['']
  });

  // 加载提示词数据
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setIsLoading(true);
        const loadedPrompts = await getAllPrompts();
        setPrompts(loadedPrompts);
      } catch (error) {
        console.error('加载提示词失败:', error);
        // 如果没有数据，设置为空数组
        setPrompts([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPrompts();
  }, []);

  // 加载所有类型的提示词数量
  useEffect(() => {
    const loadAllTypePrompts = async () => {
      const types = Object.keys(promptTypeMap) as PromptType[];
      const typePromptsObj: {[key in PromptType]?: Prompt[]} = {};
      
      for (const type of types) {
        try {
          const typePrompts = await getPromptsByType(type);
          typePromptsObj[type] = typePrompts;
        } catch (error) {
          console.error(`加载${type}类型提示词失败:`, error);
          typePromptsObj[type] = [];
        }
      }
      
      setTypePrompts(typePromptsObj);
    };
    
    loadAllTypePrompts();
  }, []);
  
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
    const newType = e.target.value as Prompt['type'];
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
      type: 'analysis',
      content: promptTemplates['analysis'],
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
      const promptData: Omit<Prompt, 'id'> = {
        ...formData,
        createdAt: now,
        updatedAt: now
      };
      
      const newPrompt = await addPrompt(promptData);
      setPrompts(prev => [newPrompt, ...prev]);
      setShowCreateModal(false);
      
      // 刷新列表
      const updatedPrompts = await getAllPrompts();
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
      
      // 刷新提示词列表
      const updatedPrompts = await getAllPrompts();
      setPrompts(updatedPrompts);
    } catch (error) {
      console.error('删除提示词失败:', error);
      alert('删除提示词失败，请重试');
    }
  };

  // 打开提示词详情弹窗
  const openDetailModal = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setShowDetailModal(true);
  };
  
  // 处理卡片点击
  const handleCardClick = async (type: PromptType) => {
    router.push(`/prompts/type/${type}`);
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
            {/* 搜索和过滤 */}
            <div className="mb-8 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="material-icons mr-3 text-blue-600">category</span>
                提示词分类
              </h2>
              <div className="flex items-center space-x-4">
                <div className="relative w-64">
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
            </div>
            
            {/* 小说创作分组 */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center text-white shadow-md mr-4">
                  <span className="material-icons text-xl">auto_stories</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">小说创作</h3>
                  <p className="text-gray-600 text-sm">用于分析和生成小说内容的提示词</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-[100px]">
                {promptGroups.novel.types.map(type => {
                  const typeInfo = promptTypeMap[type];
                  const typePromptsCount = typePrompts[type]?.length || 0;
                  
                  return (
                    <div
                      key={type}
                      className="card group cursor-pointer bg-gradient-to-br from-blue-50 to-white p-6 flex flex-col h-80 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl hover:translate-y-[-5px] w-[360px] flex-shrink-0"
                      onClick={() => handleCardClick(type)}
                    >
                      <div className={`w-16 h-16 bg-gradient-to-br ${typeInfo.gradient} rounded-full flex items-center justify-center mb-6 text-white shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-110`}>
                        <span className="material-icons text-2xl">{typeInfo.icon}</span>
                      </div>

                      <h3 className={`font-bold mb-3 text-xl ml-3 ${type === 'analysis' ? 'text-blue-700 group-hover:text-blue-800' : 'text-green-700 group-hover:text-green-800'} transition-colors duration-200`}>
                        {typeInfo.label}
                      </h3>
                      <p className={`text-sm mb-5 ${type === 'analysis' ? 'text-blue-600' : 'text-green-600'}`}>
                        {type === 'analysis' ? '分析故事内容、角色和情节结构' : '生成和改进故事内容与场景描写'}
                      </p>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`inline-block w-3 h-3 rounded-full ${type === 'analysis' ? 'bg-blue-500' : 'bg-green-500'} mr-2`}></span>
                          <span className="text-sm text-gray-600">{typePromptsCount} 个提示词</span>
                        </div>
                        <span className={`material-icons ${type === 'analysis' ? 'text-blue-500' : 'text-green-500'} group-hover:translate-x-2 transition-transform duration-300`}>arrow_forward</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 创意地图分组 */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-rose-500 flex items-center justify-center text-white shadow-md mr-4">
                  <span className="material-icons text-xl">map</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">创意地图</h3>
                  <p className="text-gray-600 text-sm">世界观构建和创意设计工具提示词</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-[100px]">
                {promptGroups.creative.types.map(type => {
                  const typeInfo = promptTypeMap[type];
                  const typePromptsCount = typePrompts[type]?.length || 0;
                  
                  // 卡片描述文本
                  const descriptions = {
                    'introduction': '创建引人入胜的开篇导语，为故事设定基调',
                    'outline': '规划故事框架和章节划分',
                    'detailed_outline': '创建详细的章节和场景规划',
                    'character': '设计人物性格、背景和关系',
                    'worldbuilding': '构建世界历史、地理和文化',
                    'plot': '设计情节结构、冲突和转折点'
                  };
                  
                  // 色彩映射
                  const colorMap = {
                    'introduction': {
                      light: 'from-indigo-50',
                      dark: 'from-indigo-600 to-indigo-700',
                      text: 'text-indigo-600',
                      hover: 'group-hover:text-indigo-700',
                      dot: 'bg-indigo-500',
                      tint: 'text-indigo-500'
                    },
                    'outline': {
                      light: 'from-blue-50',
                      dark: 'from-blue-600 to-blue-700',
                      text: 'text-blue-600',
                      hover: 'group-hover:text-blue-700',
                      dot: 'bg-blue-500',
                      tint: 'text-blue-500'
                    },
                    'detailed_outline': {
                      light: 'from-teal-50',
                      dark: 'from-teal-600 to-teal-700',
                      text: 'text-teal-600',
                      hover: 'group-hover:text-teal-700',
                      dot: 'bg-teal-500',
                      tint: 'text-teal-500'
                    },
                    'character': {
                      light: 'from-amber-50',
                      dark: 'from-amber-600 to-amber-700',
                      text: 'text-amber-600',
                      hover: 'group-hover:text-amber-700',
                      dot: 'bg-amber-500',
                      tint: 'text-amber-500'
                    },
                    'worldbuilding': {
                      light: 'from-purple-50',
                      dark: 'from-purple-600 to-purple-700',
                      text: 'text-purple-600',
                      hover: 'group-hover:text-purple-700',
                      dot: 'bg-purple-500',
                      tint: 'text-purple-500'
                    },
                    'plot': {
                      light: 'from-rose-50',
                      dark: 'from-rose-600 to-rose-700',
                      text: 'text-rose-600',
                      hover: 'group-hover:text-rose-700',
                      dot: 'bg-rose-500',
                      tint: 'text-rose-500'
                    }
                  };
                  
                  const colors = colorMap[type as keyof typeof colorMap];
                  
                  return (
                    <div
                      key={type}
                      className={`card group cursor-pointer bg-gradient-to-br ${colors.light} to-white p-6 flex flex-col h-80 shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl hover:translate-y-[-5px] w-[360px] flex-shrink-0`}
                      onClick={() => handleCardClick(type)}
                    >
                      <div className={`w-16 h-16 bg-gradient-to-br ${typeInfo.gradient} rounded-full flex items-center justify-center mb-6 text-white shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-110`}>
                        <span className="material-icons text-2xl">{typeInfo.icon}</span>
                      </div>

                      <h3 className={`font-bold mb-3 text-xl ml-3 ${colors.text} ${colors.hover} transition-colors duration-200`}>
                        {typeInfo.label}
                      </h3>

                      <p className={`text-sm mb-5 ${colors.text.replace('-600', '-700')}`}>
                        {descriptions[type as keyof typeof descriptions]}
                      </p>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`inline-block w-3 h-3 rounded-full ${colors.dot} mr-2`}></span>
                          <span className="text-sm text-gray-600">{typePromptsCount} 个提示词</span>
                        </div>
                        <span className={`material-icons ${colors.tint} group-hover:translate-x-2 transition-transform duration-300`}>arrow_forward</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
        
        {/* 底部 */}
        <div className="h-16 bg-white border-t border-gray-200 flex justify-center items-center px-8 shadow-sm rounded-tl-2xl">
          <div className="text-sm text-gray-500">
            © 2024 智界引擎
          </div>
        </div>
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
              <option value="analysis">分析</option>
              <option value="writing">写作</option>
              <option value="introduction">导语</option>
              <option value="outline">大纲</option>
              <option value="detailed_outline">细纲</option>
              <option value="character">角色</option>
              <option value="worldbuilding">世界观</option>
              <option value="plot">情节</option>
            </select>
            
            <div className="mt-2 flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${promptTypeMap[formData.type]?.color}`}>
                <span className="material-icons text-sm mr-1">{promptTypeMap[formData.type]?.icon}</span>
                {promptTypeMap[formData.type]?.label}
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