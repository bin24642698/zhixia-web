'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { saveApiKey } from '@/lib/AIservice';
import { openDB } from 'idb';
import { resetDatabases } from '@/lib/db';

// API密钥存储键
const API_KEY_STORAGE_KEY = 'zhixia_api_key';

export default function Home() {
  // 修改默认选中的菜单为小说创作
  const [activeMenu, setActiveMenu] = useState('novel');
  const router = useRouter();

  // 添加设置弹窗状态
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // 加载保存的API密钥
  useEffect(() => {
    const loadApiKey = async () => {
      // Ensure this runs only on the client
      if (typeof window !== 'undefined') {
        try {
          // 使用indexedDB查询API密钥
          // Consider creating a helper in db.ts or a separate settings module for this
          const db = await openDB('zhixia_settings', 7); // Assuming version 7 is correct for this DB too
          const savedApiKey = await db.get('settings', API_KEY_STORAGE_KEY);
          if (savedApiKey) {
            setApiKey(savedApiKey);
          }
          db.close(); // Close the connection when done
        } catch (error) {
          console.error('加载API密钥失败:', error);
        }
      }
    };

    loadApiKey();
  }, []);

  // 保存API密钥
  const handleSaveApiKey = async () => {
    // Ensure this runs only on the client
    if (typeof window !== 'undefined') {
      await saveApiKey(apiKey); // Assuming saveApiKey also handles client-side checks
      setShowSettings(false);
    }
  };

  // 重置数据库
  const handleResetDatabases = async () => {
    // Ensure this runs only on the client
    if (typeof window !== 'undefined' && window.confirm('确定要重置所有数据库吗？这将删除所有存储的数据，包括作品、提示词等。')) {
      try {
        setIsResetting(true);
        await resetDatabases(); // Call the updated function from db.ts
        alert('数据库已重置，页面将刷新');
        window.location.reload();
      } catch (error) {
        console.error('重置数据库失败:', error);
        alert('重置数据库失败，请查看控制台获取详细信息');
      } finally {
        setIsResetting(false);
      }
    }
  };

  // 创建卡片内容，避免条件渲染导致的问题
  const renderCards = () => {
    return (
      <>
        <div className="card group cursor-pointer bg-gradient-to-br from-blue-50 to-white p-6 flex flex-col items-center justify-center h-64" onClick={() => router.push('/works')}>
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
              <h3 className="font-medium text-gray-800">探索创作模板</h3>
            </div>
            <span className="badge badge-purple">推荐</span>
          </div>
          <p className="text-gray-600 text-sm mb-4">使用专业模板快速开始你的创作</p>
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="bg-purple-50 rounded-xl p-3 flex flex-col items-center justify-center hover:bg-purple-100 transition-colors duration-200 cursor-pointer">
              <span className="material-icons text-purple-600 mb-1">psychology</span>
              <span className="text-xs text-purple-700 text-center">奇幻小说</span>
            </div>
            <div className="bg-green-50 rounded-xl p-3 flex flex-col items-center justify-center hover:bg-green-100 transition-colors duration-200 cursor-pointer">
              <span className="material-icons text-green-600 mb-1">favorite</span>
              <span className="text-xs text-green-700 text-center">爱情小说</span>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 flex flex-col items-center justify-center hover:bg-blue-100 transition-colors duration-200 cursor-pointer">
              <span className="material-icons text-blue-600 mb-1">rocket_launch</span>
              <span className="text-xs text-blue-700 text-center">科幻小说</span>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 flex flex-col items-center justify-center hover:bg-yellow-100 transition-colors duration-200 cursor-pointer">
              <span className="material-icons text-yellow-600 mb-1">local_police</span>
              <span className="text-xs text-yellow-700 text-center">悬疑小说</span>
            </div>
          </div>
        </div>

        <div className="card p-6 h-64 flex flex-col bg-gradient-to-br from-green-50 to-blue-50 border-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <span className="material-icons text-green-500 mr-2">insights</span>
              <h3 className="font-medium text-gray-800">创作统计</h3>
            </div>
            <span className="badge badge-green">新功能</span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="text-4xl font-bold text-green-600 mb-2">0</div>
            <p className="text-gray-600 text-sm">开始创作，追踪你的写作进度</p>
          </div>
          <button className="btn-secondary w-full mt-4">
            <span className="material-icons mr-2 text-sm">bar_chart</span>
            <span>查看详情</span>
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 animate-fadeIn">
      {/* 左侧导航栏 */}
      <Sidebar activeMenu="novel" />

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <div className="h-16 border-b border-gray-200 bg-white shadow-sm flex justify-between items-center px-8 rounded-bl-2xl">
          <div className="flex items-center">
            <h1 className="text-xl font-medium text-gray-800 mr-4">创作空间</h1>
            <span className="badge badge-blue">Beta</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              className="btn-secondary"
              onClick={() => setShowSettings(true)}
            >
              <span className="material-icons mr-2 text-sm">settings</span>
              <span>设置</span>
            </button>
            <button className="btn-primary">
              <span className="material-icons mr-2 text-sm">person</span>
              <span>登录</span>
            </button>
          </div>
        </div>

        {/* 主要内容 */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <h2 className="section-title">我的创作</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {/* 移除isClient条件，直接渲染卡片 */}
              {renderCards()}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="h-16 bg-white border-t border-gray-200 flex justify-center items-center px-8 shadow-sm rounded-tl-2xl">
          <div className="text-sm text-gray-500">
            © 2024 智界引擎
          </div>
        </div>
      </div>

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
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
                placeholder="请输入API密钥"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <div className="mt-2 space-y-2">
                <p className="text-xs text-gray-500">
                  设置API密钥以使用AI功能。如果不设置，将使用默认密钥。
                </p>
                <div className="bg-blue-50 p-3 rounded-xl text-xs text-blue-700">
                  <p className="font-medium mb-1">API密钥说明：</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>API密钥用于访问AI服务</li>
                    <li>密钥将安全地存储在您的浏览器中</li>
                    <li>您可以随时更改或删除密钥</li>
                    <li>如果您没有自己的API密钥，可以使用默认密钥</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t pt-4 border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">高级选项</h3>
              <button
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center transition-colors"
                onClick={handleResetDatabases}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <span className="material-icons animate-spin mr-2 text-sm">refresh</span>
                    <span>重置中...</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons mr-2 text-sm">delete_forever</span>
                    <span>重置所有数据库</span>
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                此操作将删除所有本地存储的数据并解决可能的数据库版本冲突问题。
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="btn-outline"
                onClick={() => setShowSettings(false)}
              >
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveApiKey}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
