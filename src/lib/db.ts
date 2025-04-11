import { openDB, IDBPDatabase, deleteDB } from 'idb';

// 定义存储对象的类型
interface Todo {
  id?: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

// 定义作品类型
interface Work {
  id?: number;
  title: string;
  description: string;
  type: 'novel' | 'character' | 'worldbuilding' | 'plot';
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// 定义提示词类型
interface Prompt {
  id?: number;
  title: string;
  type: 'analysis' | 'writing' | 'worldbuilding' | 'character' | 'plot' | 'introduction' | 'outline' | 'detailed_outline';
  content: string;
  description?: string;
  examples?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 生成唯一ID
const generateId = (): number => {
  return Date.now() + Math.floor(Math.random() * 1000);
};

// 数据库名称
const DB_NAME = 'zhixia_writing_app';
const DB_VERSION = 7; // 版本升级

// 所有数据库名称
const ALL_DB_NAMES = [
  'zhixia_writing_app',
  'zhixia_settings',
  'zhixia_navigation'
];

// 数据库store名称
const STORES = {
  TODOS: 'todos',
  WORKS: 'works',
  PROMPTS: 'prompts'
};

// 重置数据库函数 - 仅在开发环境遇到版本问题时使用
const resetDatabases = async (): Promise<void> => {
  // Check if running on the client before attempting deletion
  if (typeof window === 'undefined') {
    console.error("Cannot reset databases on the server.");
    return Promise.reject(new Error("Cannot reset databases on the server."));
  }
  try {
    // Close existing connections before deleting - openDB might handle this, but explicit is safer
    if (dbPromiseInstance) {
      const db = await dbPromiseInstance;
      db.close();
      dbPromiseInstance = null; // Reset instance after closing
      console.log(`Closed existing connection to ${DB_NAME}`);
    }
    // Also need to handle closing 'zhixia_settings' if open, maybe move reset logic higher up?

    for (const dbName of ALL_DB_NAMES) {
      // Ensure deleteDB is only called client-side
      await deleteDB(dbName);
      console.log(`数据库 ${dbName} 已删除`);
    }
    console.log('所有数据库已重置，请刷新页面');
    return Promise.resolve();
  } catch (error) {
    console.error('重置数据库失败:', error);
    return Promise.reject(error);
  }
};

// 初始化数据库连接 - 修改为延迟加载
let dbPromiseInstance: Promise<IDBPDatabase> | null = null;

// Function to get the DB promise, initializing it only once on the client-side
const getDbPromise = (): Promise<IDBPDatabase> => {
  if (typeof window === 'undefined') {
    // Return a promise that never resolves or throws an error on the server
    return Promise.reject(new Error("IndexedDB cannot be accessed on the server."));
  }
  if (!dbPromiseInstance) {
    console.log(`Opening database ${DB_NAME} version ${DB_VERSION}`); // Debug log
    dbPromiseInstance = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading database ${DB_NAME} from version ${oldVersion} to ${newVersion}`); // Debug log
        // Upgrade logic remains the same
        // 先删除现有的对象库，避免结构不一致
        if (db.objectStoreNames.contains(STORES.TODOS)) {
          console.log(`Deleting old store: ${STORES.TODOS}`);
          db.deleteObjectStore(STORES.TODOS);
        }
        if (db.objectStoreNames.contains(STORES.WORKS)) {
          console.log(`Deleting old store: ${STORES.WORKS}`);
          db.deleteObjectStore(STORES.WORKS);
        }
        if (db.objectStoreNames.contains(STORES.PROMPTS)) {
          console.log(`Deleting old store: ${STORES.PROMPTS}`);
          db.deleteObjectStore(STORES.PROMPTS);
        }
        
        // 重新创建待办事项对象库，使用内联键
        console.log(`Creating new store: ${STORES.TODOS}`);
        const todoStore = db.createObjectStore(STORES.TODOS, { 
          keyPath: 'id' 
        });
        todoStore.createIndex('createdAt', 'createdAt');

        // 重新创建作品对象库，使用内联键
        console.log(`Creating new store: ${STORES.WORKS}`);
        const workStore = db.createObjectStore(STORES.WORKS, { 
          keyPath: 'id'
        });
        workStore.createIndex('updatedAt', 'updatedAt');
        workStore.createIndex('type', 'type');

        // 重新创建提示词对象库，使用内联键
        console.log(`Creating new store: ${STORES.PROMPTS}`);
        const promptStore = db.createObjectStore(STORES.PROMPTS, { 
          keyPath: 'id'
        });
        promptStore.createIndex('updatedAt', 'updatedAt');
        promptStore.createIndex('type', 'type');
      },
      blocked() {
        // Handle scenario where the DB is blocked (e.g., open in another tab)
        console.error(`Database ${DB_NAME} is blocked. Please close other tabs using this database.`);
        // Potentially alert the user or throw a specific error
        alert(`数据库 "${DB_NAME}" 被其他页面阻止打开。请关闭使用此数据库的其他标签页，然后刷新。`);
      },
      blocking() {
        // Handle scenario where this tab is blocking another from upgrading
        console.warn(`Database ${DB_NAME} is blocking an upgrade. Closing connection.`);
         // Close the connection to allow the other tab to upgrade.
         // The page will need to be reloaded or the db operations retried after the upgrade.
         getDbPromise().then(db => db.close());
         // Maybe alert the user?
         alert(`此页面正在阻止数据库更新。将尝试关闭连接，您可能需要刷新页面。`);
      },
      terminated() {
         // Handle connection termination (e.g., browser closed the DB)
         console.warn(`Database ${DB_NAME} connection terminated unexpectedly. Resetting instance.`);
         dbPromiseInstance = null; // Allow re-initialization on next access
      }
    });
  }
  return dbPromiseInstance;
};

// 通用获取所有数据的函数
async function getAll<T>(storeName: string): Promise<T[]> {
  try {
    const db = await getDbPromise();
    return db.getAll(storeName);
  } catch (error) {
    console.error(`获取所有${storeName}数据失败:`, error);
    return [];
  }
}

// 通用获取单个数据的函数
async function getById<T>(storeName: string, id: number): Promise<T | undefined> {
  try {
    const db = await getDbPromise();
    return db.get(storeName, id);
  } catch (error) {
    console.error(`获取ID为${id}的${storeName}数据失败:`, error);
    return undefined;
  }
}

// 通用添加数据的函数
async function add<T extends { id?: number }>(storeName: string, item: Omit<T, 'id'>): Promise<T> {
  try {
    const db = await getDbPromise();
    const id = generateId();
    // 明确创建包含ID的对象
    const newItem = { ...item, id } as T;
    
    // 使用事务确保操作成功
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.add(newItem);
    await tx.done;
    
    return newItem;
  } catch (error) {
    console.error(`添加${storeName}数据失败:`, error);
    throw error; // 重新抛出错误，让调用者处理
  }
}

// 通用更新数据的函数
async function update<T extends { id: number }>(storeName: string, item: T): Promise<T> {
  try {
    const db = await getDbPromise();
    // 使用事务确保操作成功
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.put(item);
    await tx.done;
    
    return item;
  } catch (error) {
    console.error(`更新${storeName}数据失败:`, error);
    throw error;
  }
}

// 通用删除数据的函数
async function remove(storeName: string, id: number): Promise<void> {
  try {
    const db = await getDbPromise();
    // 使用事务确保操作成功
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.delete(id);
    await tx.done;
  } catch (error) {
    console.error(`删除ID为${id}的${storeName}数据失败:`, error);
    throw error;
  }
}

// 通用清空数据的函数
async function clear(storeName: string): Promise<void> {
  try {
    const db = await getDbPromise();
    // 使用事务确保操作成功
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.clear();
    await tx.done;
  } catch (error) {
    console.error(`清空${storeName}数据失败:`, error);
    throw error;
  }
}

// 待办事项相关操作
async function addTodo(todo: Omit<Todo, 'id'>): Promise<Todo> {
  return add<Todo>(STORES.TODOS, todo);
}

async function getAllTodos(): Promise<Todo[]> {
  const todos = await getAll<Todo>(STORES.TODOS);
  // 按创建日期排序
  return todos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function getTodoById(id: number): Promise<Todo | null> {
  const todo = await getById<Todo>(STORES.TODOS, id);
  return todo || null;
}

async function updateTodo(todo: Todo): Promise<Todo> {
  if (!todo.id) throw new Error('Todo ID is required');
  return update<Todo & { id: number }>(STORES.TODOS, todo as Todo & { id: number });
}

async function deleteTodo(id: number): Promise<void> {
  return remove(STORES.TODOS, id);
}

async function clearAllTodos(): Promise<void> {
  return clear(STORES.TODOS);
}

// 作品相关操作
async function addWork(work: Omit<Work, 'id'>): Promise<Work> {
  return add<Work>(STORES.WORKS, work);
}

async function getAllWorks(): Promise<Work[]> {
  const works = await getAll<Work>(STORES.WORKS);
  // 按更新日期排序，最新的在前面
  return works.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

async function getWorksByType(type: Work['type']): Promise<Work[]> {
  // 获取所有作品并过滤
  const works = await getAll<Work>(STORES.WORKS);
  return works.filter(work => work.type === type);
}

async function getWorkById(id: number): Promise<Work | null> {
  const work = await getById<Work>(STORES.WORKS, id);
  return work || null;
}

async function updateWork(work: Work): Promise<Work> {
  if (!work.id) throw new Error('Work ID is required');
  return update<Work & { id: number }>(STORES.WORKS, work as Work & { id: number });
}

async function deleteWork(id: number): Promise<void> {
  return remove(STORES.WORKS, id);
}

// 提示词相关操作
async function addPrompt(prompt: Omit<Prompt, 'id'>): Promise<Prompt> {
  return add<Prompt>(STORES.PROMPTS, prompt);
}

async function getAllPrompts(): Promise<Prompt[]> {
  const prompts = await getAll<Prompt>(STORES.PROMPTS);
  // 按更新日期排序，最新的在前面
  return prompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

async function getPromptsByType(type: Prompt['type']): Promise<Prompt[]> {
  const prompts = await getAll<Prompt>(STORES.PROMPTS);
  return prompts.filter(prompt => prompt.type === type);
}

async function getPromptById(id: number): Promise<Prompt | null> {
  const prompt = await getById<Prompt>(STORES.PROMPTS, id);
  return prompt || null;
}

async function updatePrompt(prompt: Prompt): Promise<Prompt> {
  if (!prompt.id) throw new Error('Prompt ID is required');
  return update<Prompt & { id: number }>(STORES.PROMPTS, prompt as Prompt & { id: number });
}

async function deletePrompt(id: number): Promise<void> {
  return remove(STORES.PROMPTS, id);
}

// Export all necessary functions and types
export {
  resetDatabases,
  addTodo, getAllTodos, getTodoById, updateTodo, deleteTodo, clearAllTodos,
  addWork, getAllWorks, getWorksByType, getWorkById, updateWork, deleteWork,
  addPrompt, getAllPrompts, getPromptsByType, getPromptById, updatePrompt, deletePrompt
};

// Export types separately using 'export type'
export type { Todo, Work, Prompt };

// Ensure no top-level dbPromise export remains 