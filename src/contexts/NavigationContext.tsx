'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// 定义上下文类型
interface NavigationContextType {
  isFirstVisit: boolean;
  setIsFirstVisit: (value: boolean) => void;
}

// 创建上下文
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// 首次访问存储键
const FIRST_VISIT_KEY = 'zhixia_first_visit';

// 初始化客户端数据库连接
let navStateDBPromise: Promise<IDBPDatabase<unknown>> | null = null;

// 在客户端初始化数据库
if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
  navStateDBPromise = openDB('zhixia_navigation', 7, {
    upgrade(db) {
      // 确保删除旧的对象存储
      if (db.objectStoreNames.contains('state')) {
        db.deleteObjectStore('state');
      }
      // 重新创建对象存储
      db.createObjectStore('state');
    },
  });
}

// 提供上下文的组件
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 检查是否是首次访问
    const checkFirstVisit = async () => {
      try {
        // 确保只在浏览器环境中执行，且数据库已初始化
        if (!navStateDBPromise) {
          // 在服务器端或数据库不可用时，默认为非首次访问
          setIsFirstVisit(false);
          return;
        }
        
        const db = await navStateDBPromise;
        const visitStatus = await db.get('state', FIRST_VISIT_KEY);
        
        if (!visitStatus) {
          // 首次访问，设置标记并导航到首页
          await db.put('state', 'visited', FIRST_VISIT_KEY);
          setIsFirstVisit(true);
          
          // 如果当前不在首页，则导航到首页
          if (pathname !== '/') {
            router.push('/');
          }
        } else {
          // 非首次访问，保持当前页面
          setIsFirstVisit(false);
        }
      } catch (error) {
        console.error('检查首次访问状态失败:', error);
        // 出错时默认为非首次访问
        setIsFirstVisit(false);
      }
    };
    
    checkFirstVisit();
  }, [pathname, router]);

  return (
    <NavigationContext.Provider value={{ isFirstVisit, setIsFirstVisit }}>
      {children}
    </NavigationContext.Provider>
  );
}

// 使用上下文的钩子
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
} 