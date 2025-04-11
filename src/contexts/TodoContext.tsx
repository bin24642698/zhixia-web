'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Todo, addTodo, getAllTodos, updateTodo, deleteTodo, clearAllTodos } from '@/lib/db';

interface TodoContextType {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  addNewTodo: (title: string) => Promise<void>;
  toggleTodo: (id: number) => Promise<void>;
  removeTodo: (id: number) => Promise<void>;
  clearTodos: () => Promise<void>;
}

// 错误处理函数
const handleError = (err: unknown, defaultMessage: string): string => {
  return err instanceof Error ? err.message : defaultMessage;
};

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export function TodoProvider({ children }: { children: ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载所有待办事项
  useEffect(() => {
    const loadTodos = async () => {
      try {
        setLoading(true);
        const allTodos = await getAllTodos();
        setTodos(allTodos);
        setError(null);
      } catch (err) {
        setError(handleError(err, '加载待办事项失败'));
      } finally {
        setLoading(false);
      }
    };

    loadTodos();
  }, []);

  // 添加新的待办事项
  const addNewTodo = async (title: string) => {
    try {
      const newTodo: Omit<Todo, 'id'> = {
        title,
        completed: false,
        createdAt: new Date(),
      };
      
      const addedTodo = await addTodo(newTodo);
      setTodos(prev => [...prev, addedTodo]);
      setError(null);
    } catch (err) {
      setError(handleError(err, '添加待办事项失败'));
    }
  };

  // 切换待办事项的完成状态
  const toggleTodo = async (id: number) => {
    try {
      const todoToUpdate = todos.find(todo => todo.id === id);
      if (!todoToUpdate) return;

      const updatedTodo = {
        ...todoToUpdate,
        completed: !todoToUpdate.completed,
      };

      await updateTodo(updatedTodo);
      setTodos(prev => prev.map(todo => todo.id === id ? updatedTodo : todo));
      setError(null);
    } catch (err) {
      setError(handleError(err, '更新待办事项失败'));
    }
  };

  // 删除待办事项
  const removeTodo = async (id: number) => {
    try {
      await deleteTodo(id);
      setTodos(prev => prev.filter(todo => todo.id !== id));
      setError(null);
    } catch (err) {
      setError(handleError(err, '删除待办事项失败'));
    }
  };

  // 清空所有待办事项
  const clearTodos = async () => {
    try {
      await clearAllTodos();
      setTodos([]);
      setError(null);
    } catch (err) {
      setError(handleError(err, '清空待办事项失败'));
    }
  };

  return (
    <TodoContext.Provider
      value={{
        todos,
        loading,
        error,
        addNewTodo,
        toggleTodo,
        removeTodo,
        clearTodos,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
}

export function useTodo() {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
} 