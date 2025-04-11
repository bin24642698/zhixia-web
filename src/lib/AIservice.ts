import { OpenAI } from 'openai';
import { openDB } from 'idb';

// 模型常量
export const MODELS = {
  GEMINI_FLASH: 'google/gemini-2.0-flash-thinking-exp:free',
  GEMINI_PRO: 'google/gemini-2.5-pro-exp-03-25:free',
};

// API配置
const API_BASE = 'https://openrouter.ai/api/v1';
const API_KEY_STORAGE_KEY = 'zhixia_api_key';

// 初始化配置数据库
const settingsDBPromise = typeof window !== 'undefined' && typeof indexedDB !== 'undefined' 
  ? openDB('zhixia_settings', 7, {
      upgrade(db) {
        // 确保删除旧的对象存储
        if (db.objectStoreNames.contains('settings')) {
          db.deleteObjectStore('settings');
        }
        // 重新创建对象存储
        db.createObjectStore('settings');
      },
    })
  : null;

// 获取API密钥 - 修改为找不到时返回 null
const getApiKey = async (): Promise<string | null> => {
  if (typeof window !== 'undefined' && settingsDBPromise) {
    try {
      const db = await settingsDBPromise;
      if (!db) return null;
      const savedApiKey = await db.get('settings', API_KEY_STORAGE_KEY);
      // 如果找到且不为空，则返回，否则返回 null
      return savedApiKey || null;
    } catch (error) {
      console.error('获取API密钥失败:', error);
      // 出错也返回 null
      return null;
    }
  }
  // 非浏览器环境返回 null
  return null;
};

// 保存API密钥
export const saveApiKey = async (apiKey: string): Promise<void> => {
  if (typeof window !== 'undefined' && settingsDBPromise) {
    try {
      const db = await settingsDBPromise;
      if (!db) return;
      await db.put('settings', apiKey, API_KEY_STORAGE_KEY);
    } catch (error) {
      console.error('保存API密钥失败:', error);
    }
  }
};

// 用户设置的systemPrompt
let userSystemPrompt = " ";

// 生成选项接口
export interface GenerateOptions {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
  abortSignal?: AbortSignal;
  disableSystemPrompt?: boolean; // 新增：完全禁用系统提示词
}

// 章节接口
export interface Chapter {
  title: string;
  content: string;
}

// 默认选项 - 移除 systemPrompt，它将在调用时处理
const DEFAULT_OPTIONS: Omit<GenerateOptions, 'systemPrompt'> = {
  model: MODELS.GEMINI_FLASH,
  temperature: 0.7,
  maxTokens: 64000,
  stream: false
};

// 模型特定配置 - 移除温度设置，让默认值生效
const MODEL_SPECIFIC_OPTIONS = {
  [MODELS.GEMINI_FLASH]: {
    maxTokens: 64000,
  },
  [MODELS.GEMINI_PRO]: {
    maxTokens: 64000,
  }
};

// 错误处理函数
const handleAIError = (error: any): string => {
  console.error('AI服务错误:', error);

  // 检查特定错误类型
  const errorMessage = error?.message || '';
  if (errorMessage.includes('API key not configured')) {
      return '发送失败';
  }
  if (
    errorMessage.includes('token') ||
    errorMessage.includes('tokens') ||
    errorMessage.includes('长度') ||
    errorMessage.includes('length') ||
    errorMessage.includes('too long') ||
    errorMessage.includes('maximum')
  ) {
    return '内容长度超出模型限制，请尝试减少输入内容或切换到支持更长文本的模型';
  }
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('连接') ||
    errorMessage.includes('connection')
  ) {
    return '网络连接错误，请检查您的网络连接并重试';
  }
  if (
    errorMessage.includes('api key') ||
    errorMessage.includes('apikey') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('认证') ||
    error?.status === 401 // 常见的认证错误状态码
  ) {
    return 'API认证失败，请检查您的API密钥是否正确或有效';
  }

  // 默认错误消息
  return '生成内容失败，请稍后重试';
};

/**
 * System Prompt管理
 */
export const SystemPrompt = {
  set: (prompt: string): void => {
    userSystemPrompt = prompt || " ";
  },
  get: (): string => userSystemPrompt
};

/**
 * 格式化章节内容
 */
export const ChapterFormatter = {
  /**
   * 格式化选中的章节内容
   */
  format: (
    chapters: Chapter[] | { title: string; content: string }[],
    selectedIndices: number[]
  ): string => {
    if (!chapters || !Array.isArray(chapters) || !selectedIndices || !Array.isArray(selectedIndices)) {
      return "===== 章节内容 =====\n\n无有效内容";
    }

    try {
      // 提取选中的章节
      const selectedChaptersContent = selectedIndices
        .filter(index => index >= 0 && index < chapters.length)
        .map(index => {
          const chapter = chapters[index];
          const title = chapter?.title || `章节 ${index + 1}`;
          const content = chapter?.content || "";
          return `# ${title}\n\n${content}`;
        })
        .join('\n\n---\n\n');

      return `===== 章节内容 =====\n\n${selectedChaptersContent || "无内容"}`;
    } catch (error) {
      console.error("格式化章节内容失败:", error);
      return "===== 章节内容 =====\n\n格式化失败";
    }
  },

  /**
   * 兼容旧版API的格式化函数
   */
  formatPrompt: (
    chapters: Chapter[] | { title: string; content: string }[],
    selectedIndices: number[],
    prompt: string
  ): string => {
    const formattedChapters = ChapterFormatter.format(chapters, selectedIndices);
    // 确保 prompt 和 formattedChapters 之间有明确的分隔，并且 prompt 在前
    return `${prompt}\n\n${formattedChapters}`;
  }
};

/**
 * AI内容生成核心
 */
export const AIGenerator = {
  /**
   * 生成AI内容(非流式)
   */
  generate: async (
    content: string,
    options: Partial<GenerateOptions> = {}
  ): Promise<string> => {
    if (!content) return "";

    // 1. 获取 API Key
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error('API key not configured'); // 抛出特定错误
    }

    // 2. 合并选项
    const mergedOptions = {
      ...DEFAULT_OPTIONS,
      ...options, // 用户传入的选项覆盖默认值
      stream: false // 强制非流式
    };
    // 应用模型特定配置 (如果用户没有覆盖)
    if (MODEL_SPECIFIC_OPTIONS[mergedOptions.model]) {
        mergedOptions.maxTokens = options.maxTokens ?? MODEL_SPECIFIC_OPTIONS[mergedOptions.model].maxTokens;
    }
    // 获取当前 systemPrompt
    const currentSystemPrompt = options.systemPrompt ?? SystemPrompt.get();


    try {
      console.log(`使用模型: ${mergedOptions.model}, maxTokens: ${mergedOptions.maxTokens}`);

      // 3. 创建临时客户端
      const localClient = new OpenAI({
        apiKey: apiKey, // 使用本次获取的 key
        baseURL: API_BASE,
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
            "HTTP-Referer": "YOUR_SITE_URL",
            "X-Title": "YOUR_SITE_NAME",
        }
      });

      // 4. 构建消息数组
      const messages = [];
      if (currentSystemPrompt && currentSystemPrompt.trim()) {
        messages.push({ role: 'system', content: currentSystemPrompt });
      }
      messages.push({ role: 'user', content: content });

      // 5. 发起请求
      const response = await localClient.chat.completions.create({
        model: mergedOptions.model,
        messages: messages as any, // 类型断言可能需要调整
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.maxTokens,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      const errorMessage = handleAIError(error);
      throw new Error(errorMessage);
    }
  },

  /**
   * 生成AI内容(流式)
   */
  generateStream: async (
    content: string,
    options: Partial<GenerateOptions> = {},
    onChunk: (chunk: string) => void
  ): Promise<void> => {
    if (!content || typeof onChunk !== 'function') return;

    // 1. 获取 API Key
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error('API key not configured'); // 抛出特定错误
    }

    // 创建一个局部的中止信号检查变量
    let isLocalAborted = false;
    if (options.abortSignal) {
      // 监听中止信号
      options.abortSignal.addEventListener('abort', () => {
        isLocalAborted = true;
      });
    }

    // 2. 合并选项
    const mergedOptions = {
      ...DEFAULT_OPTIONS,
      ...options, // 用户传入的选项覆盖默认值
      stream: true // 强制流式
    };
     // 应用模型特定配置 (如果用户没有覆盖)
    if (MODEL_SPECIFIC_OPTIONS[mergedOptions.model]) {
        mergedOptions.maxTokens = options.maxTokens ?? MODEL_SPECIFIC_OPTIONS[mergedOptions.model].maxTokens;
    }
    // 获取当前 systemPrompt
    const currentSystemPrompt = options.systemPrompt ?? SystemPrompt.get();


    try {
      console.log(`流式生成使用模型: ${mergedOptions.model}, maxTokens: ${mergedOptions.maxTokens}`);

      // 3. 创建临时客户端
      const localClient = new OpenAI({
        apiKey: apiKey, // 使用本次获取的 key
        baseURL: API_BASE,
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
            "HTTP-Referer": "YOUR_SITE_URL",
            "X-Title": "YOUR_SITE_NAME",
        }
      });

      // 4. 构建消息数组
      const messages = [];
      // 仅当没有禁用系统提示词选项且系统提示词不为空时，才添加系统提示词
      if (!mergedOptions.disableSystemPrompt && currentSystemPrompt && currentSystemPrompt.trim()) {
        messages.push({ role: 'system', content: currentSystemPrompt });
      }
      messages.push({ role: 'user', content: content });

      // 5. 发起流式请求
      const stream = await localClient.chat.completions.create({
        model: mergedOptions.model,
        messages: messages as any, // 类型断言可能需要调整
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.maxTokens,
        stream: true,
        ...(mergedOptions.abortSignal ? { signal: mergedOptions.abortSignal } : {}), // 添加中止信号
      });

      for await (const chunk of stream) {
        // 如果中止信号已经触发，立即停止处理并抛出中止错误
        if (isLocalAborted) {
          throw new Error('AbortError');
        }
        
        const contentChunk = chunk.choices[0]?.delta?.content || '';
        if (contentChunk) {
          onChunk(contentChunk);
        }
      }
    } catch (error) {
      // 如果是中止错误，转换为标准的AbortError以便统一处理
      if (isLocalAborted || (error instanceof Error && error.message === 'AbortError')) {
        const abortError = new Error('AbortError');
        abortError.name = 'AbortError';
        throw abortError;
      }
      
      const errorMessage = handleAIError(error);
      throw new Error(errorMessage);
    }
  }
};

/**
 * 章节分析功能
 */
export const ChapterAnalyzer = {
  /**
   * 分析章节(非流式)
   */
  analyze: async (
    chapters: Chapter[] | { title: string; content: string }[],
    selectedIndices: number[],
    options: Partial<GenerateOptions> = {}
  ): Promise<string> => {
    const formattedContent = ChapterFormatter.format(chapters, selectedIndices);
    return await AIGenerator.generate(formattedContent, options);
  },

  /**
   * 分析章节(流式)
   */
  analyzeStream: async (
    chapters: Chapter[] | { title: string; content: string }[],
    selectedIndices: number[],
    options: Partial<GenerateOptions> = {},
    onChunk: (chunk: string) => void
  ): Promise<void> => {
    const formattedContent = ChapterFormatter.format(chapters, selectedIndices);
    await AIGenerator.generateStream(formattedContent, options, onChunk);
  }
};

// 兼容旧版API的导出
export const setSystemPrompt = SystemPrompt.set;
export const getSystemPrompt = SystemPrompt.get;
export const formatChaptersPrompt = ChapterFormatter.formatPrompt;
export const generateAIContent = AIGenerator.generate;
export const generateAIContentStream = AIGenerator.generateStream;
export const analyzeChapters = ChapterAnalyzer.analyze;
export const analyzeChaptersStream = ChapterAnalyzer.analyzeStream; 