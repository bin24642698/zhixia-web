'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';

interface SidebarProps {
  activeMenu?: string;
}

export default function Sidebar({ activeMenu = 'works' }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isFirstVisit } = useNavigation();

  // 导航处理函数
  const handleNavigation = (path: string) => {
    router.push(path);
  };

  // 当前路径
  const isActive = (path: string): boolean => {
    if (!pathname) return false;
    return pathname === path;
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-white shadow-sm flex flex-col rounded-tr-2xl rounded-br-2xl">
      <div className="p-5 border-b border-gray-200 flex items-center">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-full flex items-center justify-center text-white font-bold mr-3 text-base shadow-sm">智</div>
        <span 
          className="text-xl font-medium text-gray-700"
          style={{ fontFamily: "'Dancing Script', cursive" }}
        >
          智界智能
        </span>
      </div>

      <div className="flex-1 py-6 px-2">
        <div
          className={`menu-item ${activeMenu === 'works' || (pathname && pathname.startsWith('/works')) ? 'active' : ''}`}
          onClick={() => handleNavigation('/works')}
        >
          <div className="menu-icon">
            <span className="material-icons text-2xl">auto_stories</span>
          </div>
          <span className="menu-text">小说创作</span>
        </div>
        <div
          className={`menu-item ${activeMenu === 'prompts' || (pathname && pathname.startsWith('/prompts')) ? 'active' : ''}`}
          onClick={() => handleNavigation('/prompts')}
        >
          <div className="menu-icon">
            <span className="material-icons text-2xl">edit_note</span>
          </div>
          <span className="menu-text">提示词管理</span>
        </div>
        <div
          className={`menu-item ${activeMenu === 'novel' ? 'active' : ''}`}
          onClick={() => handleNavigation('/')}
        >
          <div className="menu-icon">
            <span className="material-icons text-2xl">home</span>
          </div>
          <span className="menu-text">首页</span>
        </div>

        <div
          className={`menu-item ${activeMenu === 'creativemap' || (pathname && pathname.startsWith('/creativemap')) ? 'active' : ''}`}
          onClick={() => handleNavigation('/creativemap')}
        >
          <div className="menu-icon">
            <span className="material-icons text-2xl">map</span>
          </div>
          <span className="menu-text">创意地图</span>
        </div>
      </div>

      <div className="p-4 mt-auto">
        {/* 创作小贴士卡片已删除 */}
      </div>
    </div>
  );
}