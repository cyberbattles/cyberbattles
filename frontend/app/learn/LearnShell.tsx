'use client';
import React, {useEffect, useState, type ReactNode} from 'react';
import {
  FaBook,
  FaChevronRight,
  FaClock,
} from 'react-icons/fa';
import type {LearnModuleMeta} from '@/lib/learn';

const iconMap: Record<string, ReactNode> = {};

function useIcons() {
  const [icons, setIcons] = useState<Record<string, ReactNode>>(iconMap);
  useEffect(() => {
    if (Object.keys(iconMap).length > 0) return;

    import('react-icons/fa').then(mod => {
      iconMap.play = <mod.FaPlay />;
      iconMap.shield = <mod.FaShieldAlt />;
      iconMap.terminal = <mod.FaTerminal />;
      iconMap.server = <mod.FaServer />;
      iconMap.book = <mod.FaBook />;
      setIcons({...iconMap});
    });
  }, []);
  return icons;
}

type ModuleEntry = {
  meta: LearnModuleMeta;
  rendered: ReactNode;
};

export default function LearnShell({modules}: {modules: ModuleEntry[]}) {
  const icons = useIcons();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    try {
      const savedIndex = localStorage.getItem('cyber_learn_current_index');
      if (savedIndex !== null) {
        const index = parseInt(savedIndex, 10);
        if (!isNaN(index) && index >= 0 && index < modules.length) {
          setSelectedIndex(index);
        }
      }
    } catch (e) {
      console.error('Failed to load saved index', e);
    }
  }, [modules.length]);

  useEffect(() => {
    localStorage.setItem('cyber_learn_current_index', selectedIndex.toString());
  }, [selectedIndex]);

  return (
    <div className="min-h-screen bg-[#2f2f2f] pt-25 text-white sm:pt-40">
      <div className="pt-16 pb-12">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-5xl font-bold text-white">Learn</h1>

            <p className="mx-auto max-w-3xl text-xl leading-relaxed text-white/90">
              Learn how to defend and attack in the world of cybersecurity with
              realistic modules designed to build your skills step-by-step.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-4">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-lg bg-[#1e1e1e] p-4 md:top-45">
                <div className="mb-6 flex items-center gap-3 border-b border-gray-700 pb-4">
                  <FaBook className="text-gray-200" />
                  <h3 className="text-lg font-bold text-gray-200">Modules</h3>
                </div>

                <div className="space-y-2">
                  {modules.map((mod, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedIndex(index)}
                      className={`group flex w-full items-center justify-between
                      rounded p-3 text-left transition-colors ${
                        selectedIndex === index
                          ? 'border-l-4 bg-gray-500 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`text-sm
                          ${selectedIndex === index ? 'text-white' : 'text-gray-500'}`}
                        >
                          {icons[mod.meta.icon] || null}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {mod.meta.title}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="min-h-[600px] overflow-hidden rounded-lg bg-[#1e1e1e]">
                {modules.map((mod, index) => (
                  <div
                    key={index}
                    className={selectedIndex === index ? 'block' : 'hidden'}
                  >
                    <div className="bg-gray-850 border-b border-[#333333] p-8">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="mb-4 flex items-center gap-4">
                            <div className="rounded border border-gray-700 bg-gray-800 p-3">
                              {icons[mod.meta.icon] || null}
                            </div>
                            <div>
                              <h2 className="mb-1 text-2xl font-bold text-white">
                                {mod.meta.title}
                              </h2>
                              <div className="flex items-center gap-4 font-mono text-sm text-gray-400">
                                <span
                                  className={`rounded border px-2 py-0.5 text-xs
                                  ${
                                    mod.meta.difficulty === 'Beginner'
                                      ? 'border-green-900 bg-green-900/20 text-green-500'
                                      : mod.meta.difficulty === 'Intermediate'
                                        ? 'border-yellow-900 bg-yellow-900/20 text-yellow-500'
                                        : 'border-red-900 bg-red-900/20 text-red-500'
                                  }`}
                                >
                                  {mod.meta.difficulty}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FaClock className="text-xs" />{' '}
                                  {mod.meta.estimatedTime}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-8">
                      <div className="max-w-4xl space-y-6">
                        {mod.rendered}

                        {mod.meta.resources && (
                          <div className="mt-10 rounded bg-[#2f2f2f] p-6">
                            <h4 className="mb-3 flex items-center gap-2 font-bold text-gray-200">
                              References
                            </h4>
                            <ul className="list-inside list-disc space-y-1 text-sm">
                              {mod.meta.resources.map((resource, i) => (
                                <li key={i}>
                                  <a
                                    href={resource}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-shadow-white hover:underline"
                                  >
                                    {resource}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Footer Controls */}
                      <div className="mt-12 flex items-center justify-between border-t pt-6">
                        <button
                          onClick={() =>
                            setSelectedIndex(Math.max(0, selectedIndex - 1))
                          }
                          disabled={selectedIndex === 0}
                          className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                            selectedIndex === 0
                              ? 'cursor-not-allowed text-gray-600'
                              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          &larr; Previous
                        </button>

                        <div className="flex gap-4">
                          {modules.length === selectedIndex + 1 ? null : (
                            <button
                              onClick={() => {
                                const newIndex = Math.min(
                                  modules.length - 1,
                                  selectedIndex + 1,
                                );
                                setSelectedIndex(newIndex);
                              }}
                              className="flex items-center gap-2 rounded bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-colors cursor-pointer hover:bg-blue-500"
                            >
                              Next <FaChevronRight className="text-xs" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}