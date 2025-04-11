import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { updateApiKey } from '../lib/AIservice';

// API密钥存储键
const API_KEY_STORAGE_KEY = 'zhixia_api_key';

function Home() {
  // 修改默认选中的菜单为小说创作
  const [activeMenu, setActiveMenu] = useState('novel');
  
  // 添加设置弹窗状态
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  // 加载保存的API密钥
  useEffect(() => {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);
  
  // 保存API密钥
  const saveApiKey = () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    updateApiKey(); // 更新API客户端
    setShowSettings(false);
  };

  // 创建卡片内容
  const renderCards = () => {
    return (
      <>
        <div className="card group cursor-pointer bg-gradient-to-br from-blue-50 to-white p-6 flex flex-col items-center justify-center h-64" onClick={() => window.location.href = '/next'}>
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-6 text-white shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-110">
            <span className="material-icons text-2xl">auto_stories</span>
          </div>
          <h3 className="text-blue-700 font-bold mb-2 text-lg group-hover:text-blue-800 transition-colors duration-200">我的作品</h3>
          <p className="text-blue-600 text-sm text-center">查看你的创作作品集</p>
        </div>
        
        <div className="card p-6 h-64 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <span className="material-icons text-purple-500 mr-2">auto_stories</span>
              <h3 className="font-bold text-gray-800">创作统计</h3>
            </div>
            <span className="text-xs text-gray-500">最近30天</span>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-purple-600 mb-1">0</p>
              <p className="text-sm text-gray-600">创作总字数</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600 mb-1">0</p>
                <p className="text-xs text-gray-600">作品数量</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-600 mb-1">0</p>
                <p className="text-xs text-gray-600">完成章节</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card p-6 h-64 flex flex-col">
          <div className="flex items-center mb-4">
            <span className="material-icons text-green-500 mr-2">explore</span>
            <h3 className="font-bold text-gray-800">探索创作模板</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 flex-1">
            <div className="bg-blue-50 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors duration-200">
              <span className="material-icons text-blue-600 mb-2">psychology</span>
              <p className="text-xs text-center text-blue-700 font-medium">奇幻小说</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-100 transition-colors duration-200">
              <span className="material-icons text-purple-600 mb-2">favorite</span>
              <p className="text-xs text-center text-purple-700 font-medium">言情小说</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-100 transition-colors duration-200">
              <span className="material-icons text-amber-600 mb-2">bolt</span>
              <p className="text-xs text-center text-amber-700 font-medium">武侠小说</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-100 transition-colors duration-200">
              <span className="material-icons text-emerald-600 mb-2">rocket_launch</span>
              <p className="text-xs text-center text-emerald-700 font-medium">科幻小说</p>
            </div>
          </div>
        </div>
        
        <div className="card group cursor-pointer bg-gradient-to-br from-green-50 to-white p-6 flex flex-col items-center justify-center h-64" onClick={() => window.location.href = '/next'}>
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-6 text-white shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-110">
            <span className="material-icons text-2xl">add</span>
          </div>
          <h3 className="text-green-700 font-bold mb-2 text-lg group-hover:text-green-800 transition-colors duration-200">创建新作品</h3>
          <p className="text-green-600 text-sm text-center">开始一个全新的创作</p>
        </div>
      </>
    );
  };

  // 渲染最近活动
  const renderRecentActivity = () => {
    return (
      <div className="mt-8">
        <h2 className="section-title">最近活动</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-gray-400 text-2xl">history</span>
            </div>
            <p className="text-gray-500 mb-2">暂无最近活动</p>
            <p className="text-gray-400 text-sm text-center">创建或编辑作品后，这里会显示你的活动记录</p>
          </div>
        </div>
      </div>
    );
  };

  // 渲染设置弹窗
  const renderSettingsModal = () => {
    if (!showSettings) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">设置</h2>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setShowSettings(false)}
            >
              <span className="material-icons">close</span>
            </button>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              API密钥
            </label>
            <input 
              type="text" 
              className="input"
              placeholder="输入你的API密钥"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">
              API密钥用于访问AI服务。如果你没有自己的密钥，系统将使用默认密钥。
            </p>
          </div>
          
          <div className="flex justify-end">
            <button 
              className="btn-outline mr-3"
              onClick={() => setShowSettings(false)}
            >
              取消
            </button>
            <button 
              className="btn-primary"
              onClick={saveApiKey}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <React.Fragment>
      <Head>
        <title>智界引擎 - 创作空间</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        {/* 侧边栏 */}
        <div className="w-64 bg-white border-r border-gray-100 p-4">
          <div className="flex items-center mb-8 px-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white mr-3">
              <span className="material-icons">auto_stories</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">智界引擎</h1>
          </div>
          
          <nav>
            <div className={`menu-item ${activeMenu === 'novel' ? 'active' : ''}`} onClick={() => setActiveMenu('novel')}>
              <div className="menu-icon">
                <span className="material-icons">auto_stories</span>
              </div>
              <span className="menu-text">小说创作</span>
            </div>
            
            <div className={`menu-item ${activeMenu === 'character' ? 'active' : ''}`} onClick={() => setActiveMenu('character')}>
              <div className="menu-icon">
                <span className="material-icons">person</span>
              </div>
              <span className="menu-text">角色管理</span>
            </div>
            
            <div className={`menu-item ${activeMenu === 'worldbuilding' ? 'active' : ''}`} onClick={() => setActiveMenu('worldbuilding')}>
              <div className="menu-icon">
                <span className="material-icons">public</span>
              </div>
              <span className="menu-text">世界观设定</span>
            </div>
            
            <div className={`menu-item ${activeMenu === 'plot' ? 'active' : ''}`} onClick={() => setActiveMenu('plot')}>
              <div className="menu-icon">
                <span className="material-icons">timeline</span>
              </div>
              <span className="menu-text">情节设计</span>
            </div>
            
            <div className={`menu-item ${activeMenu === 'prompts' ? 'active' : ''}`} onClick={() => setActiveMenu('prompts')}>
              <div className="menu-icon">
                <span className="material-icons">lightbulb</span>
              </div>
              <span className="menu-text">提示词管理</span>
            </div>
            
            <div className={`menu-item ${activeMenu === 'works' ? 'active' : ''}`} onClick={() => setActiveMenu('works')}>
              <div className="menu-icon">
                <span className="material-icons">folder</span>
              </div>
              <span className="menu-text">我的作品</span>
            </div>
          </nav>
        </div>
        
        {/* 主内容区 */}
        <div className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">创作空间</h1>
            <button 
              className="btn-outline"
              onClick={() => setShowSettings(true)}
            >
              <span className="material-icons mr-2 text-sm">settings</span>
              设置
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {renderCards()}
          </div>
          
          {renderRecentActivity()}
        </div>
      </div>
      
      {renderSettingsModal()}
    </React.Fragment>
  );
}

export default Home; 