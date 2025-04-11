'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/BackButton';
import { Prompt, getPromptById, updatePrompt, deletePrompt } from '@/lib/db';

// 提示词类型映射
const promptTypeMap = {
  'analysis': { label: '分析', color: 'bg-blue-100 text-blue-800', icon: 'analytics' },
  'writing': { label: '写作', color: 'bg-green-100 text-green-800', icon: 'create' },
  'worldbuilding': { label: '世界观', color: 'bg-purple-100 text-purple-800', icon: 'public' },
  'character': { label: '角色', color: 'bg-amber-100 text-amber-800', icon: 'person' },
  'plot': { label: '情节', color: 'bg-rose-100 text-rose-800', icon: 'timeline' }
};

// 提示词内容组件，用于在详情页和弹窗中共享
export function PromptDetailContent({
  prompt,
  isEditing = false,
  editedPrompt,
  handleInputChange,
  handleExampleChange,
  addExample,
  removeExample,
  showEditButtons = true,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onCopy
}: {
  prompt: Prompt;
  isEditing?: boolean;
  editedPrompt?: Prompt;
  handleInputChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleExampleChange?: (index: number, value: string) => void;
  addExample?: () => void;
  removeExample?: (index: number) => void;
  showEditButtons?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {!isEditing ? (
        // 查看模式
        <>
          <div className="p-6">
            <div className="flex items-center mb-6">
              <span className={`material-icons text-2xl mr-3 ${promptTypeMap[prompt.type]?.color.split(' ')[1]}`}>
                {promptTypeMap[prompt.type]?.icon}
              </span>
              <h2 className="text-2xl font-semibold text-gray-900">{prompt.title}</h2>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">提示词内容</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{prompt.content}</p>
              </div>
            </div>
            
            {prompt.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">描述</h3>
                <p className="text-gray-700">{prompt.description}</p>
              </div>
            )}
            
            {prompt.examples && prompt.examples.length > 0 && prompt.examples[0] !== '' && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">使用示例</h3>
                <ul className="space-y-2">
                  {prompt.examples.map((example, index) => (
                    <li key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-gray-700">{example}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="border-t border-gray-200 pt-4 mt-6">
              <div className="flex justify-between text-sm text-gray-500">
                <div>创建于: {new Date(prompt.createdAt).toLocaleDateString()}</div>
                <div>更新于: {new Date(prompt.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
          
          {showEditButtons && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <button 
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 flex items-center hover:bg-gray-50 transition-colors"
                  onClick={onCopy}
                >
                  <span className="material-icons mr-1">content_copy</span>
                  复制提示词
                </button>
                
                <div className="flex space-x-3">
                  {onEdit && (
                    <button 
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      onClick={onEdit}
                    >
                      <span className="material-icons mr-1">edit</span>
                      编辑提示词
                    </button>
                  )}
                  
                  {onDelete && (
                    <button 
                      className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center hover:bg-red-100 transition-colors"
                      onClick={onDelete}
                    >
                      <span className="material-icons mr-1">delete</span>
                      删除提示词
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        // 编辑模式
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">提示词标题</label>
              <input
                type="text"
                name="title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={editedPrompt?.title || ''}
                onChange={handleInputChange}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">提示词类型</label>
              <div className="py-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium ${promptTypeMap[editedPrompt?.type || 'analysis']?.color}`}>
                  {promptTypeMap[editedPrompt?.type || 'analysis']?.label}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">提示词内容</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[150px]"
                name="content"
                value={editedPrompt?.content || ''}
                onChange={handleInputChange}
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                name="description"
                value={editedPrompt?.description || ''}
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
                {editedPrompt?.examples?.map((example, index) => (
                  <div key={index} className="flex items-start">
                    <textarea
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={example}
                      onChange={(e) => handleExampleChange && handleExampleChange(index, e.target.value)}
                      rows={2}
                    ></textarea>
                    {(editedPrompt.examples?.length || 0) > 1 && (
                      <button 
                        type="button" 
                        className="ml-2 p-1 text-gray-400 hover:text-red-600"
                        onClick={() => removeExample && removeExample(index)}
                      >
                        <span className="material-icons">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                type="button"
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={onCancel}
              >
                取消
              </button>
              <button 
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={onSave}
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PromptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const promptId = params.id ? parseInt(params.id as string) : null;
  
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isEditing, setIsEditing] = useState(true);
  const [editedPrompt, setEditedPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 从数据库获取提示词
  useEffect(() => {
    const fetchPrompt = async () => {
      if (!promptId) {
        setError('无效的提示词ID');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const promptData = await getPromptById(promptId);
        
        if (promptData) {
          setPrompt(promptData);
          setEditedPrompt(promptData);
        } else {
          setError('提示词不存在');
        }
      } catch (err) {
        console.error('获取提示词失败:', err);
        setError('获取提示词失败');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPrompt();
  }, [promptId]);
  
  // 处理输入变更
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // 忽略对type字段的修改
    if (name === 'type') return;
    setEditedPrompt(prev => prev ? { ...prev, [name]: value } : null);
  };
  
  // 处理示例变更
  const handleExampleChange = (index: number, value: string) => {
    if (!editedPrompt) return;
    
    const newExamples = [...(editedPrompt.examples || [])];
    newExamples[index] = value;
    
    setEditedPrompt({
      ...editedPrompt,
      examples: newExamples
    });
  };
  
  // 添加示例
  const addExample = () => {
    if (!editedPrompt) return;
    
    setEditedPrompt({
      ...editedPrompt,
      examples: [...(editedPrompt.examples || []), '']
    });
  };
  
  // 移除示例
  const removeExample = (index: number) => {
    if (!editedPrompt) return;
    
    const newExamples = [...(editedPrompt.examples || [])];
    newExamples.splice(index, 1);
    
    setEditedPrompt({
      ...editedPrompt,
      examples: newExamples
    });
  };
  
  // 保存修改
  const handleSave = async () => {
    if (!editedPrompt || !editedPrompt.id || !prompt) return;
    
    try {
      const updatedPrompt = {
        ...editedPrompt,
        type: prompt.type,
        updatedAt: new Date()
      };
      
      await updatePrompt(updatedPrompt);
      setPrompt(updatedPrompt);
      setIsEditing(false);
    } catch (error) {
      console.error('更新提示词失败:', error);
      alert('更新提示词失败，请重试');
    }
  };
  
  // 删除提示词
  const handleDelete = async () => {
    if (!prompt || !prompt.id) return;
    
    if (confirm('确定要删除这个提示词吗？此操作无法撤销。')) {
      try {
        await deletePrompt(prompt.id);
        router.push(prompt?.type ? `/prompts/type/${prompt.type}` : '/prompts');
      } catch (error) {
        console.error('删除提示词失败:', error);
        alert('删除提示词失败，请重试');
      }
    }
  };
  
  // 复制提示词内容
  const handleCopy = () => {
    if (!prompt) return;
    
    navigator.clipboard.writeText(prompt.content);
    alert('提示词内容已复制到剪贴板');
  };
  
  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 animate-fadeIn">
        <Sidebar activeMenu="prompts" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">正在加载提示词内容...</p>
        </div>
      </div>
    );
  }
  
  if (error || !prompt) {
    return (
      <div className="flex h-screen bg-gray-50 animate-fadeIn">
        <Sidebar activeMenu="prompts" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="material-icons text-gray-400 text-2xl">search_off</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">未找到提示词</h3>
          <p className="text-gray-600 mb-4">{error || '该提示词可能已被删除或不存在'}</p>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => router.push('/prompts')}
          >
            返回提示词列表
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-50 animate-fadeIn">
      <Sidebar activeMenu="prompts" />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        <div className="h-16 border-b border-gray-200 bg-white shadow-sm flex justify-between items-center px-8 rounded-bl-2xl">
          <div className="flex items-center">
            <BackButton backPath={prompt?.type ? `/prompts/type/${prompt.type}` : '/prompts'} />
            <h1 className="text-xl font-medium text-gray-800 mr-4">
              {isEditing ? '编辑提示词' : prompt.title}
            </h1>
            <span className={`badge ${promptTypeMap[prompt.type]?.color.includes('blue') ? 'badge-blue' : 
                                      promptTypeMap[prompt.type]?.color.includes('green') ? 'badge-green' : 
                                      promptTypeMap[prompt.type]?.color.includes('purple') ? 'badge-purple' : 
                                      promptTypeMap[prompt.type]?.color.includes('amber') ? 'badge-yellow' : 
                                      'badge-red'}`}>
              {promptTypeMap[prompt.type]?.label}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                <button 
                  className="btn-outline"
                  onClick={() => {
                    router.push(prompt?.type ? `/prompts/type/${prompt.type}` : '/prompts');
                  }}
                >
                  <span>返回列表</span>
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setIsEditing(true)}
                >
                  <span className="material-icons mr-2 text-sm">edit</span>
                  <span>编辑提示词</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
        
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <PromptDetailContent 
              prompt={prompt}
              isEditing={isEditing}
              editedPrompt={editedPrompt || undefined}
              handleInputChange={handleInputChange}
              handleExampleChange={handleExampleChange}
              addExample={addExample}
              removeExample={removeExample}
              onEdit={() => setIsEditing(true)}
              onSave={handleSave}
              onCancel={() => {
                setIsEditing(false);
                setEditedPrompt(prompt);
              }}
              onDelete={handleDelete}
              onCopy={handleCopy}
            />
          </div>
        </main>
      </div>
    </div>
  );
} 