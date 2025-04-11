'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllWorks, addWork, updateWork, deleteWork, Work } from '@/lib/db';
import Sidebar from '@/components/Sidebar';
import BackButton from '@/components/BackButton';

export default function WorksPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentWorkId, setCurrentWorkId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
  });
  const [error, setError] = useState('');
  const router = useRouter();

  // 添加导入TXT相关状态
  const [fileUploadMode, setFileUploadMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [chapterPreview, setChapterPreview] = useState<{ title: string; content: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const allWorks = await getAllWorks();
        setWorks(allWorks);
      } catch (error) {
        console.error('获取作品失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorks();
  }, []);

  const handleCreateWork = () => {
    setIsEditMode(false);
    setCurrentWorkId(null);
    setFormData({
      title: '',
    });
    setFileUploadMode(false);
    setUploadedFile(null);
    setChapterPreview([]);
    setShowPreview(false);
    setIsModalOpen(true);
  };

  const handleEditWork = (work: Work) => {
    setIsEditMode(true);
    setCurrentWorkId(work.id ?? null);
    setFormData({
      title: work.title,
    });
    setIsModalOpen(true);
  };

  const handleDeleteWork = async (id: number) => {
    if (!window.confirm('确定要删除这个作品吗？此操作不可恢复。')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteWork(id);
      // 更新作品列表
      const allWorks = await getAllWorks();
      setWorks(allWorks);
    } catch (error) {
      console.error('删除作品失败:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError('');
    setFormData({
      title: '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!formData.title.trim()) {
        throw new Error('标题不能为空');
      }

      const now = new Date();
      
      // Prepare data, adding back empty/default values for removed fields for DB compatibility
      const workData = {
        title: formData.title,
        description: '', // Default empty string
        type: 'novel' as 'novel' | 'character' | 'worldbuilding' | 'plot', // Default type
        content: '', // Default empty string
      };

      if (isEditMode && currentWorkId) {
        // 更新现有作品
        // Note: Editing might need a different approach if fields are truly removed later
        await updateWork({
          ...workData,
          id: currentWorkId,
          updatedAt: now,
          createdAt: works.find(w => w.id === currentWorkId)?.createdAt || now 
        });
      } else {
        // 创建新作品
        const newWork = await addWork({
          ...workData,
          createdAt: now,
          updatedAt: now
        });

        // 如果是导入TXT模式且有章节，则直接跳转到作品详情页
        if (fileUploadMode && chapterPreview.length > 0) {
          // 保存作品内容（包含章节信息）
          await updateWork({
            ...newWork,
            content: JSON.stringify(chapterPreview),
            updatedAt: new Date()
          });
          
          router.push(`/works/${newWork.id}`);
          return;
        }
      }

      // 重新获取作品列表
      const allWorks = await getAllWorks();
      setWorks(allWorks);
      
      // 重置表单并关闭创建界面
      setFormData({
        title: '',
      });
      setIsModalOpen(false);
      setFileUploadMode(false);
      setUploadedFile(null);
      setChapterPreview([]);
      setShowPreview(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditMode ? '更新作品失败' : '创建作品失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理TXT文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    
    if (file.type !== 'text/plain' && !file.name.toLowerCase().endsWith('.txt')) {
      setError('请上传TXT文本文件');
      return;
    }

    setUploading(true);
    setUploadedFile(file);
    setError('');

    try {
      // 设置作品标题为文件名（去除.txt后缀）
      const fileName = file.name.replace(/\.txt$/i, '');
      setFormData({ 
        title: fileName 
      });

      // 读取TXT文件内容
      const text = await file.text();
      
      // 解析章节
      const chapters = parseChapters(text);
      
      if (chapters.length === 0) {
        // 如果未识别到章节，创建单个章节
        setChapterPreview([
          {
            title: '第一章',
            content: text
          }
        ]);
      } else {
        setChapterPreview(chapters);
      }
      
      setShowPreview(true);
    } catch (err) {
      setError('文件解析失败，请重试');
      console.error('文件解析错误:', err);
    } finally {
      setUploading(false);
    }
  };

  // 解析章节函数
  const parseChapters = (text: string): { title: string; content: string }[] => {
    // 合并所有章节标题模式为一个正则表达式，使用分组来识别不同格式
    const chapterPattern = /(第[零一二三四五六七八九十百千0-9]+章|第[0-9]+章|Chapter\s+[0-9]+|CHAPTER\s+[0-9]+)\s*[^\n]*/gi;
    
    // 查找所有章节标题及其位置
    let chapterMatches: { title: string, index: number }[] = [];
    let match;
    
    while ((match = chapterPattern.exec(text)) !== null) {
      // 防止重复匹配相同位置的章节
      let isDuplicate = false;
      for (const existingMatch of chapterMatches) {
        // 检查是否有重叠：如果新匹配的起始位置在某个现有匹配的范围内
        if (Math.abs(existingMatch.index - match.index) < 10) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        chapterMatches.push({
          title: match[0].trim(),
          index: match.index
        });
      }
    }
    
    // 按位置排序章节标题
    chapterMatches.sort((a, b) => a.index - b.index);
    
    // 如果没有找到任何章节标题
    if (chapterMatches.length === 0) {
      return [];
    }
    
    // 提取章节内容
    const chapters: { title: string; content: string }[] = [];
    
    for (let i = 0; i < chapterMatches.length; i++) {
      const current = chapterMatches[i];
      const next = chapterMatches[i + 1];
      
      const chapterContent = next 
        ? text.substring(current.index, next.index).trim()
        : text.substring(current.index).trim();
      
      chapters.push({
        title: current.title,
        content: chapterContent
      });
    }
    
    return chapters;
  };

  // 切换到文件上传模式
  const toggleFileUploadMode = () => {
    setFileUploadMode(!fileUploadMode);
    if (fileUploadMode) {
      // 切换回普通模式时清理文件相关状态
      setUploadedFile(null);
      setChapterPreview([]);
      setShowPreview(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 animate-fadeIn">
      {/* 左侧导航栏 */}
      <Sidebar activeMenu="works" />
      
      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <div className="h-16 border-b border-gray-200 bg-white shadow-sm flex justify-between items-center px-8 rounded-bl-2xl">
          <div className="flex items-center">
            <BackButton />
            <h1 className="text-xl font-medium text-gray-800 mr-4">我的作品</h1>
            <span className="badge badge-blue">管理</span>
          </div>
        </div>
        
        {/* 主要内容 */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="section-title">全部作品</h2>
              <button className="btn-primary" onClick={handleCreateWork}>
                <span className="material-icons mr-2 text-sm">add</span>
                <span>创建新作品</span>
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="w-12 h-12 bg-blue-200 rounded-full mb-4"></div>
                  <div className="h-4 w-24 bg-blue-200 rounded"></div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 创建新作品卡片 */}
                <div 
                  className="card group cursor-pointer bg-gradient-to-br from-blue-50 to-white p-6 flex flex-col items-center justify-center h-80 w-[360px]"
                  onClick={handleCreateWork}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-6 text-white shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-110">
                    <span className="material-icons text-2xl">add</span>
                  </div>
                  <h3 className="text-blue-700 font-bold mb-2 text-lg group-hover:text-blue-800 transition-colors duration-200">创建新作品</h3>
                  <p className="text-blue-600 text-sm text-center">开启你的创作之旅</p>
                </div>
                
                {/* 作品列表 */}
                {works.map((work) => (
                  <div 
                    key={work.id} 
                    className="card p-6 flex flex-col cursor-pointer hover:shadow-md transition-shadow duration-200 h-80 w-[360px]"
                    onClick={() => router.push(`/works/${work.id}`)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className={`material-icons ${
                          work.type === 'novel' ? 'text-blue-500' :
                          work.type === 'character' ? 'text-purple-500' :
                          work.type === 'worldbuilding' ? 'text-green-500' :
                          'text-yellow-500'
                        } mr-2`}>
                          {work.type === 'novel' ? 'auto_stories' :
                           work.type === 'character' ? 'person' :
                           work.type === 'worldbuilding' ? 'public' :
                           'timeline'}
                        </span>
                        <h3 className="font-medium text-gray-800 truncate max-w-[180px]">{work.title}</h3>
                      </div>
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
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{work.description}</p>
                    <div className="mt-auto">
                      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                        <span>创建于: {new Date(work.createdAt).toLocaleDateString()}</span>
                        <span>更新于: {new Date(work.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-100 pt-3">
                        <button 
                          className="text-red-500 hover:text-red-700 text-sm flex items-center transition-colors duration-200"
                          onClick={(e) => {
                            e.stopPropagation(); // 阻止事件冒泡
                            handleDeleteWork(work.id!);
                          }}
                          disabled={isDeleting}
                        >
                          <span className="material-icons text-sm mr-1">delete</span>
                          删除
                        </button>
                        <button 
                          className="text-blue-500 hover:text-blue-700 text-sm flex items-center transition-colors duration-200"
                          onClick={(e) => {
                            e.stopPropagation(); // 阻止事件冒泡
                            handleEditWork(work);
                          }}
                        >
                          <span className="material-icons text-sm mr-1">edit</span>
                          编辑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {works.length === 0 && (
                  <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <span className="material-icons text-4xl text-gray-300 mb-3">auto_stories</span>
                        <p className="text-gray-500">暂无作品</p>
                        <p className="text-gray-400 text-sm mt-1">点击"创建新作品"开始你的创作之旅</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* 底部 */}
        <div className="h-16 bg-white border-t border-gray-200 flex justify-center items-center px-8 shadow-sm rounded-tl-2xl">
          <div className="text-sm text-gray-500">
            © 2024 智界引擎
          </div>
        </div>
      </div>

      {/* 创建/编辑作品弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex justify-between items-center rounded-t-2xl z-10">
              <h2 className="text-xl font-medium text-gray-800">{isEditMode ? '编辑作品' : '创建新作品'}</h2>
              <button 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                onClick={handleCloseModal}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="p-6">
              {!isEditMode && (
                <div className="mb-6 flex border-b border-gray-200">
                  <button
                    className={`px-4 py-2 font-medium text-sm ${!fileUploadMode ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setFileUploadMode(false)}
                  >
                    <span className="material-icons text-sm mr-1 align-text-bottom">edit</span>
                    手动创建
                  </button>
                  <button
                    className={`px-4 py-2 font-medium text-sm ${fileUploadMode ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setFileUploadMode(true)}
                  >
                    <span className="material-icons text-sm mr-1 align-text-bottom">upload_file</span>
                    导入TXT
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600">
                  <div className="flex items-center">
                    <span className="material-icons mr-2 text-red-500">error</span>
                    <span>{error}</span>
                  </div>
                </div>
              )}
              
              {fileUploadMode && !isEditMode ? (
                <div>
                  {!showPreview ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center mb-6">
                      <span className="material-icons text-4xl text-gray-400 mb-2">upload_file</span>
                      <p className="text-gray-600 mb-4">选择或拖放TXT文件</p>
                      <input
                        type="file"
                        accept=".txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                        disabled={uploading}
                      />
                      <label
                        htmlFor="file-upload"
                        className={`btn-primary cursor-pointer ${uploading ? 'opacity-70' : ''}`}
                      >
                        {uploading ? (
                          <>
                            <span className="material-icons animate-spin mr-2 text-sm">refresh</span>
                            <span>处理中...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-icons mr-2 text-sm">file_upload</span>
                            <span>选择文件</span>
                          </>
                        )}
                      </label>
                      <p className="text-gray-500 text-xs mt-4">支持TXT格式，自动识别章节结构</p>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-800">已识别 {chapterPreview.length} 个章节</h3>
                        <button
                          className="text-blue-600 text-sm flex items-center"
                          onClick={() => setShowPreview(false)}
                        >
                          <span className="material-icons text-sm mr-1">arrow_back</span>
                          重新选择
                        </button>
                      </div>
                      
                      <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <p className="text-sm text-gray-600">章节预览</p>
                        </div>
                        <div className="max-h-64 overflow-auto p-2">
                          {chapterPreview.map((chapter, index) => (
                            <div key={index} className="border-b border-gray-100 last:border-b-0 py-2">
                              <p className="font-medium text-gray-800">{chapter.title}</p>
                              <p className="text-gray-600 text-sm truncate">{chapter.content.substring(chapter.title.length, chapter.title.length + 100)}...</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <label htmlFor="title" className="block text-gray-700 font-medium mb-2">作品标题</label>
                        <input
                          type="text"
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="请输入作品标题"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <label htmlFor="title" className="block text-gray-700 font-medium mb-2">作品标题</label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="请输入作品标题"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-4 sticky bottom-0 pt-4 bg-white border-t border-gray-100 mt-6">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCloseModal}
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="material-icons animate-spin mr-2 text-sm">refresh</span>
                          <span>{isEditMode ? '保存中...' : '创建中...'}</span>
                        </>
                      ) : (
                        <>
                          <span className="material-icons mr-2 text-sm">save</span>
                          <span>{isEditMode ? '保存修改' : '创建作品'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
              
              {fileUploadMode && showPreview && (
                <div className="flex justify-end space-x-4 sticky bottom-0 pt-4 bg-white border-t border-gray-100 mt-6">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCloseModal}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSubmit}
                    disabled={isLoading || chapterPreview.length === 0}
                  >
                    {isLoading ? (
                      <>
                        <span className="material-icons animate-spin mr-2 text-sm">refresh</span>
                        <span>导入中...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-icons mr-2 text-sm">file_download_done</span>
                        <span>导入作品</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 