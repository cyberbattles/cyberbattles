import {MDXRemote} from 'next-mdx-remote/rsc';
import {getLearnModules} from '@/app/learn/learn';
import LearnShell from './LearnShell';

const CodeBlock = ({content}: {content: string}) => {
  return (
    <div className="my-4 overflow-hidden rounded-md bg-black">
      <div
        className="flex items-center border-b border-gray-800 bg-gray-500 px-4
          py-2"
      >
        <span className="font-mono text-xs font-bold text-white">terminal</span>
      </div>
      <pre
        className="overflow-x-auto p-4 font-mono text-sm whitespace-pre-wrap
          text-shadow-white"
      >
        <code>{content}</code>
      </pre>
    </div>
  );
};

const mdxComponents = {
  h2: (props: React.ComponentProps<'h3'>) => (
    <h3
      className="mt-8 mb-2 border-b border-gray-800 pb-2 text-xl font-bold
        text-white"
      {...props}
    />
  ),
  h3: (props: React.ComponentProps<'h3'>) => (
    <h3
      className="mt-8 mb-2 border-b border-gray-800 pb-2 text-xl font-bold
        text-white"
      {...props}
    />
  ),
  p: (props: React.ComponentProps<'div'>) => (
    <div
      className="leading-7 whitespace-pre-line text-gray-300"
      {...props}
    />
  ),
  pre: (props: React.ComponentProps<'pre'>) => {
    const codeChild = props.children as React.ReactElement<{children?: string}>;
    const content =
      codeChild?.props?.children ?? '';
    return <CodeBlock content={String(content).trim()} />;
  },
  ul: (props: React.ComponentProps<'ul'>) => (
    <ul className="list-inside list-disc space-y-1 leading-7 text-gray-300" {...props} />
  ),
  li: (props: React.ComponentProps<'li'>) => (
    <li className="text-gray-300" {...props} />
  ),
};

export default function LearnPage() {
  const modules = getLearnModules();

  const moduleEntries = modules.map(mod => ({
    meta: mod.meta,
    rendered: (
      <MDXRemote source={mod.content} components={mdxComponents} />
    ),
  }));

  return <LearnShell modules={moduleEntries} />;
}
