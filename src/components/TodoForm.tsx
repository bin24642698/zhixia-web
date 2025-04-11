'use client';

import React, { useState } from 'react';

interface TodoFormProps {
  onAdd: (title: string) => Promise<void>;
}

export default function TodoForm({ onAdd }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onAdd(title);
      setTitle('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex items-center">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="添加新的待办事项..."
          className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          disabled={isSubmitting || !title.trim()}
        >
          {isSubmitting ? '添加中...' : '添加'}
        </button>
      </div>
    </form>
  );
} 