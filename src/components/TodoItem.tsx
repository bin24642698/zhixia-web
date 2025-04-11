'use client';

import React from 'react';
import { Todo } from '@/lib/db';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <li className="flex items-center justify-between p-4 border-b border-gray-200 group">
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => todo.id && onToggle(todo.id)}
          className="w-5 h-5 mr-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span
          className={`text-lg ${
            todo.completed ? 'line-through text-gray-400' : 'text-gray-700'
          }`}
        >
          {todo.title}
        </span>
      </div>
      <button
        onClick={() => todo.id && onDelete(todo.id)}
        className="invisible group-hover:visible p-2 text-red-500 hover:text-red-700 focus:outline-none"
        aria-label="删除"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </li>
  );
} 