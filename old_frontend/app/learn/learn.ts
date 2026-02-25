import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type LearnModuleMeta = {
  title: string;
  icon: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  resources?: string[];
};

export type LearnModule = {
  slug: string;
  meta: LearnModuleMeta;
  content: string;
};

const contentDir = path.join(process.cwd(), 'content', 'learn');

export function getLearnModules(): LearnModule[] {
  const files = fs
    .readdirSync(contentDir)
    .filter(f => f.endsWith('.mdx'))
    .sort();

  return files.map(filename => {
    const filePath = path.join(contentDir, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const {data, content} = matter(raw);

    return {
      slug: filename.replace(/\.mdx$/, ''),
      meta: data as LearnModuleMeta,
      content,
    };
  });
}
