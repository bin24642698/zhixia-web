'use client';

import React from 'react';
import { Todo } from '@/lib/db';
import TodoItem from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClear: () => Promise<void>;
}

export default function TodoList({ todos, onToggle, onDelete, onClear }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p>暂无待办事项</p>
      </div>
    );
  }

  const completedCount = todos.filter(todo => todo.completed).length;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-700">
          待办事项 ({completedCount}/{todos.length})
        </h2>
        {todos.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-red-500 hover:text-red-700 focus:outline-none"
          >
            清空所有
          </button>
        )}
      </div>
      <ul>
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
} 