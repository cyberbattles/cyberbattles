'use client';
import React, {useEffect, useRef, useState} from 'react';
import {
  FaLock,
  FaUnlock,
  FaPlay,
  FaBook,
  FaGraduationCap,
  FaShieldAlt,
  FaTerminal,
  FaServer,
  FaChevronRight,
  FaCheck,
} from 'react-icons/fa';

// REF: Used claude to update how it looks
// https://claude.ai/chat/275e0248-c0a1-4fbf-a503-7293669bd103

type ContentSegment =
  | {type: 'text'; content: string}
  | {type: 'heading'; content: string}
  | {type: 'code'; content: string};

type LearnItem = {
  title: string;
  segments: ContentSegment[];
  resources?: string[];
  icon: React.ReactNode;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
};
// Code Highlighter Component
const CodeBlock = ({content}: {content: string}) => {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
      <div className="relative bg-gray-900/90 backdrop-blur-sm border border-cyan-500/30 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
          <span className="text-xs text-gray-400">bash</span>
        </div>
        <pre className="p-4 text-sm text-green-500 font-mono overflow-x-auto">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
};

export default function ModernLearnPage() {
  const learnItems: LearnItem[] = [
    {
      title: 'Getting Started',
      icon: <FaPlay className="text-lg" />,
      difficulty: 'Beginner',
      estimatedTime: '1 min',
      segments: [
        {
          type: 'text',
          content:
            "Welcome to your cybersecurity journey! Before diving into the exciting world of CyberBattles, it's crucial to build a solid foundation of key cybersecurity concepts. These fundamentals are not just academic—they're the same principles used by professionals in the industry every day.",
        },
        {
          type: 'text',
          content:
            'Each module below is carefully crafted to give you practical knowledge and hands-on experience. Complete them in order to unlock your full potential in this high-stakes digital battlefield.',
        },
      ],
    },
    {
      title: 'Red Teaming',
      icon: <FaShieldAlt className="text-lg" />,
      difficulty: 'Intermediate',
      estimatedTime: '5 min',
      segments: [
        {
          type: 'text',
          content:
            'Red teaming represents the offensive side of cybersecurity—ethical hackers who simulate real-world cyberattacks to help organizations identify and fix vulnerabilities before malicious actors can exploit them.',
        },
        {
          type: 'text',
          content:
            'Unlike malicious attackers, red team professionals operate with explicit permission and focus on improving security rather than causing damage. They use the same sophisticated tools and techniques as cybercriminals, but their mission is protection through controlled testing.',
        },
        {
          type: 'text',
          content:
            "Red teams often engage in adversarial exercises with blue teams (system defenders), creating realistic scenarios that test an organization's entire security posture—from technical controls to human factors.",
        },
        {
          type: 'text',
          content:
            'Common Targets:\n• AI systems and machine learning models\n• Critical databases and data repositories\n• Network firewalls and perimeter defenses\n• Cryptographic implementations\n• Endpoint security solutions\n• Intrusion detection systems\n• Web applications and APIs\n• Server infrastructure',
        },
        {
          type: 'text',
          content:
            'Arsenal of Techniques:\n• Social engineering and phishing campaigns\n• Physical security assessments\n• Network reconnaissance and sniffing\n• Credential attacks and password spraying\n• Privilege escalation and lateral movement',
        },
      ],
      resources: ['https://www.ibm.com/think/topics/red-teaming'],
    },
    {
      title: 'Blue Teaming',
      icon: <FaShieldAlt className="text-lg" />,
      difficulty: 'Intermediate',
      estimatedTime: '5 min',
      segments: [
        {
          type: 'text',
          content:
            "Blue teaming is the defensive backbone of cybersecurity—the vigilant guardians who protect organizational assets from both external threats and internal vulnerabilities. They're the digital first responders who detect, analyze, and neutralize security incidents.",
        },
        {
          type: 'text',
          content:
            "Unlike red teams who simulate attacks, blue teams have comprehensive access to an organization's entire infrastructure. This 'white box' perspective allows them to create detailed risk assessments and implement proactive security measures.",
        },
        {
          type: 'text',
          content:
            'The Black Box Advantage: While red teams often work with limited information (black box testing), blue teams leverage their internal knowledge to anticipate attack vectors and strengthen defenses before threats materialize.',
        },
        {
          type: 'text',
          content:
            'Core Responsibilities:\n• Continuous security monitoring and threat hunting\n• Incident response and forensic analysis\n• Security awareness training and education\n• Infrastructure hardening and patch management\n• Risk assessment and compliance reporting\n• Security tool deployment and management',
        },
        {
          type: 'text',
          content:
            "Blue team professionals must possess deep technical expertise, exceptional analytical skills, and the ability to think like both defenders and attackers. They're often the unsung heroes who prevent breaches that never make headlines.",
        },
      ],
      resources: [
        'https://www.ibm.com/think/topics/blue-team',
        'https://en.wikipedia.org/wiki/Black_box',
      ],
    },
    {
      title: 'Basics of SSH',
      icon: <FaTerminal className="text-lg" />,
      difficulty: 'Intermediate',
      estimatedTime: '15 min',
      segments: [
        {
          type: 'text',
          content:
            'Secure Shell Protocol (SSH) is the cornerstone of secure remote administration. Built on top of the reliable TCP/IP protocol suite, SSH enables encrypted communication channels for managing servers, transferring files, and accessing remote services safely across untrusted networks.',
        },
        {
          type: 'text',
          content:
            'Why SSH is Secure: SSH employs public key cryptography, creating an unbreakable authentication system. Each user generates a mathematically linked key pair—a private key (kept secret) and a public key (shared freely). Only when these keys match can identity be verified and secure communication established.',
        },
        {
          type: 'text',
          content:
            "Mutual Authentication: In SSH connections, both client and server authenticate each other using their respective key pairs, ensuring you're connecting to the legitimate server and the server can verify your identity.",
        },
        {
          type: 'text',
          content:
            "Let's explore the essential SSH commands that form the foundation of secure remote operations:",
        },
        {type: 'code', content: 'ssh username@hostname'},
        {
          type: 'text',
          content:
            "The fundamental SSH connection command. Replace 'username' with your account name on the remote system and 'hostname' with the server's IP address or domain name. You'll be prompted for your password unless key-based authentication is configured.",
        },
        {type: 'code', content: 'ssh-keygen\nssh-copy-id username@hostname'},
        {
          type: 'text',
          content:
            "Generate your security credentials with ssh-keygen, creating your personal key pair. Then use ssh-copy-id to securely install your public key on the remote server's authorized_keys file. This enables password-free authentication using your private key.",
        },
        {type: 'code', content: 'ssh username@host "ls -la"'},
        {
          type: 'text',
          content:
            "Execute commands remotely without maintaining an interactive session. This example runs 'ls -la' on the remote server, displaying detailed file information including permissions, ownership, and modification dates, then returns you to your local terminal.",
        },
        {
          type: 'code',
          content: 'scp localfile.txt username@hostname:/remote/path',
        },
        {
          type: 'text',
          content:
            "Securely transfer files using SSH's built-in copy protocol. This command uploads 'localfile.txt' to the specified remote path. Reverse the source and destination to download files from the remote server to your local machine.",
        },
      ],
      resources: [
        'https://www.ssh.com/academy/ssh/command#ssh-command-in-linux',
        'https://www.cloudflare.com/learning/access-management/what-is-ssh/',
      ],
    },
    {
      title: 'Capture the Flags',
      icon: <FaTerminal className="text-lg" />,
      difficulty: 'Advanced',
      estimatedTime: '25 min',
      segments: [
        {
          type: 'text',
          content:
            'CTF or Capture the Flag is a cybersecurity competitive event where participants solve security-related challenges to find hidden strings called flags. Often found in the format ',
        },
        {
          type: 'code',
          content:
            'CTF{yoU_FoUnD_M3}',
        },
        {
          type: 'text',
          content:
            "These challenges simulate real-world vulnerabilities and problems across areas like cryptography, web security, reverse engineering, forensics and binary exploitation.",
        },
        {
          type: 'text',
          content:
            "The goal is to capture as many flags as possible as a team or individual within a time limit. Each flag earns points and players or teams are ranked on a scoreboard.",
        },
        {
          type: 'heading',
          content:
            "Cryptography",
        },
        {type: 'text', content: "Cryptography included breaking weak algorithms, recovering keys, understanding math flaws, such as a Caesar Cipher algorithm.\n\n In the example below, we see a encoded message which has used a caeser cipher algorithm. All letters are shifted by a certain number of offsets. In this case, we have an offset of 3, so A would become D. To crack the encryption we can shift the offset, print the result and end when a flag is discovered."},
        {
          type: 'code',
          content:
            'ciphertext = "fdwfk_wkh_iodj"\ndef decrypt(text, shift):\n   result = ""\n   for c in text:\n     if c.isalpha():\n       shift_base = ord(A) if c.isupper() else ord(a)\n       result += chr((ord(c) - shift_base - shift) % 26 + shift_base)\n     else:\n     result += c\n   return result',
        },
        {
        type: 'code',
          content:
            'for s in range(26):\n   print(s, decrypt(ciphertext, s))\nOUTPUT: catch_the_flag',
        },
        {
          type: 'heading',
          content:
            "Binary Exploitation (PWN)",
        },
        {
          type: 'text',
          content:
            "Binary Exploitation includes reverse engineering of binaries, exploiting memory bugs like buffer overflows, formatted strings. An example of this is an input overflow to get a shell.\n\n In the below code the function vuln() is called from main. Using gets() the program reads bytes from standard input into buffer without any bounds checking. If the user types more than 32 bytes, those extra bytes are written into adjacent memory releasing the flag.",
        },
        {
          type: 'code',
            content:
              'void win() {\n    printf("CTF{buffer_overflow_success});\n}\n\n\nvoid vuln() {\n    char buf[32];\n    gets(buf); // Vulnerable function!\n}\n\n\nint main() {\n    vuln();\n    return 0;\n}',
          },
          {
            type: 'heading',
            content:
              "Reverse Engineering",
          },
          {
            type: 'text',
            content:
              "Involves analysing compiled code to recover logic or keys. Examples include disassembling binary to find hidden flags.",
          },
          {
            type: 'heading',
            content:
              "Web Exploitation",
          },
          {
            type: 'text',
            content:
              "Occurs via exploiting vulnerable web apps (SQLI, XSS, insecure auth) by potentially injecting payloads into parameters.\n\n In the example provided below an SQL attack occurs. We are assuming that the application builds an SQL query by string concatenation. If an attacker was to supply the command below, because 1 is always true, the WHERE clause can evaluate to true, bypassing authentication.",
          },
          {
            type: 'code',
              content:
                "-- Vulnerable login check\nSELECT * FROM users WHERE username = '$user' AND password = '$pass';\n\n-- Attacker Input\n' OR '1'='1\n Authentication bypassed!",
            },
            {
              type: 'heading',
              content:
                "Forensics",
            },
            {
              type: 'text',
              content:
                "Analysing files, memory dumps, disk images or network traffic to receover hidden files, such as inside a PNG.",
            },
            {
              type: 'heading',
              content:
                "OSINT",
            },
            {
              type: 'text',
              content:
                "OSINT (Open-Source Intelligence) is the process of collecting and analyzing information from publicly available sources to generate useful intelligence. These sources can include websites, social media, news articles, government publications, forums, images, and even metadata hidden in files.",
            },
            {
              type: 'heading',
              content:
                "Beginner Learning Tool",
            },
            {
              type: 'text',
              content:
                "CyberChef is a simple, intuitive web app for analysing and decoding data without having to deal with complex tools or programming languages. CyberChef encourages both technical and non-technical people to explore data formats, encryption and compression. A simple, intuitive web app for analysing and decoding data without having to deal with complex tools or programming languages. CyberChef encourages both technical and non-technical people to explore data formats, encryption and compression.",
            },
      ],
      resources: [
        'https://gchq.github.io/CyberChef/',
        'https://ctf.hacker101.com/',
        'https://www.vmray.com/def-con-ctf-finals-an-inside-view/',
      ],
    },
    {
      title: 'Importance of Uptime',
      icon: <FaServer className="text-lg" />,
      difficulty: 'Beginner',
      estimatedTime: '10 min',
      segments: [
        {
          type: 'text',
          content:
            'System uptime is the foundation of digital trust and business continuity. In our interconnected world, even seconds of downtime can result in significant financial losses, damaged reputation, and compromised user experience.',
        },
        {
          type: 'text',
          content:
            'Business Impact: For mission-critical systems, 99.9% uptime means 8.76 hours of downtime per year, while 99.99% allows only 52.56 minutes. Understanding these metrics helps organizations balance reliability investments with business requirements.',
        },
      ],
    },
  ];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
  const [isLocked, setIsLocked] = useState([false, true, true, true, true, true]);

  const handleModuleComplete = () => {
    const newCompleted = [...completedModules];
    newCompleted[selectedIndex] = true;
    setCompletedModules(newCompleted);

    // Unlock next module
    if (selectedIndex + 1 < isLocked.length) {
      const newLocked = [...isLocked];
      newLocked[selectedIndex + 1] = false;
      setIsLocked(newLocked);
    }
  };

  const progressPercentage =
    (completedModules.filter(Boolean).length / learnItems.length) * 100;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative pt-24 pb-12">
        <div className="container mx-auto px-6">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-black mb-5 pt-20">
              <span className="bg-white bg-clip-text text-transparent">
                Learn
              </span>
            </h1>

            <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              Master cybersecurity fundamentals through hands-on modules
              designed by industry experts. Build the skills that matter in
              real-world scenarios.
            </p>

            {/* Progress Bar */}
            <div className="max-w-md mx-auto mt-8">
              <div className="flex items-center justify-between text-sm text-white/60 mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-900 rounded-full transition-all duration-700 ease-out"
                  style={{width: `${progressPercentage}%`}}
                ></div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {/* Enhanced Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 sticky top-28 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <FaBook className="text-white-400 text-xl" />
                  <h3 className="text-xl font-bold text-white">
                    Learning Path
                  </h3>
                </div>

                <div className="space-y-3">
                  {learnItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        !isLocked[index] && setSelectedIndex(index)
                      }
                      className={`w-full text-left p-4 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                        selectedIndex === index
                          ? 'bg-gradient-to-r from-blue-800/20 to-blue-500/20 border border-cyan-50/30 shadow-lg scale-105'
                          : isLocked[index]
                            ? 'bg-gray-800/30 border border-gray-700/30 cursor-not-allowed opacity-50'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-102 cursor-pointer'
                      }`}
                      disabled={isLocked[index]}
                    >
                      {!isLocked[index] && selectedIndex === index && (
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent animate-pulse"></div>
                      )}

                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              selectedIndex === index
                                ? 'bg-cyan-200/20 text-white-300'
                                : isLocked[index]
                                  ? 'bg-gray-700 text-gray-500'
                                  : 'bg-white/10 text-white/70'
                            }`}
                          >
                            {item.icon}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm">
                              {item.title}
                            </div>
                            <div className="text-xs text-white/50">
                              {item.estimatedTime}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {completedModules[index] && (
                            <FaCheck className="text-green-400 text-sm" />
                          )}
                          {isLocked[index] ? (
                            <FaLock className="text-gray-400 text-sm" />
                          ) : (
                            <FaUnlock className="text-blue-400 text-sm" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Content Area */}
            <div className="lg:col-span-3">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                {learnItems.map((item, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-500 ${selectedIndex === index ? 'block' : 'hidden'}`}
                  >
                    {/* Enhanced Header */}
                    <div className="bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-sm p-8 border-b border-white/10">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-cyan-400/20 rounded-xl text-cyan-300">
                              {item.icon}
                            </div>
                            <div>
                              <h2 className="text-3xl font-bold text-white mb-1">
                                {item.title}
                              </h2>
                              <div className="flex items-center gap-4 text-sm">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    item.difficulty === 'Beginner'
                                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                      : item.difficulty === 'Intermediate'
                                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  }`}
                                >
                                  {item.difficulty}
                                </span>
                                <span className="text-white/60">
                                  ⏱️ {item.estimatedTime}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="w-20 h-1 bg-gradient-to-r from-cyan-900 to-blue-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Content Body */}
                    <div className="p-8 max-h-[500px] overflow-y-auto custom-scrollbar">
                      <div className="space-y-6">
                      {item.segments.map((seg, i) => {
                      if (seg.type === 'text') {
                        return (
                          <div
                            key={i}
                            className="text-white/80 leading-relaxed whitespace-pre-line text-lg"
                          >
                            {seg.content}
                          </div>
                        );
                      } else if (seg.type === 'heading') {
                        return (
                          <h3
                            key={i}
                            className="text-2xl font-bold text-white mt-8 mb-4"
                          >
                            {seg.content}
                          </h3>
                        );
                      } else if (seg.type === 'code') {
                        return (
                          <div key={i} className="my-6">
                            <CodeBlock content={String(seg.content)} />
                          </div>
                        );
                      }
                    })}
                        {item.resources && (
                          <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <h4 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
                              📚 Additional Resources
                            </h4>
                            <div className="space-y-2">
                              {item.resources.map((resource, i) => (
                                <a
                                  key={i}
                                  href={resource}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-blue-300 hover:text-blue-200 transition-colors underline"
                                >
                                  {resource}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Enhanced Progress Section */}
                      <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-white/60">
                            Module {selectedIndex + 1} of {learnItems.length}
                          </div>
                          <div className="flex gap-2">
                            {learnItems.map((_, i) => (
                              <div
                                key={i}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                  i === selectedIndex
                                    ? 'bg-cyan-900 scale-125'
                                    : completedModules[i]
                                      ? 'bg-green-400'
                                      : 'bg-white/20'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Navigation */}
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() =>
                    setSelectedIndex(Math.max(0, selectedIndex - 1))
                  }
                  disabled={selectedIndex === 0}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    selectedIndex === 0
                      ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
                      : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105 backdrop-blur-sm border border-white/20'
                  }`}
                >
                  ← Previous
                </button>

                <button
                  onClick={handleModuleComplete}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                >
                  Mark Complete
                </button>

                <button
                  onClick={() => {
                    const newIndex = Math.min(
                      learnItems.length - 1,
                      selectedIndex + 1,
                    );
                    if (!isLocked[newIndex]) {
                      setSelectedIndex(newIndex);
                    }
                  }}
                  disabled={
                    selectedIndex === learnItems.length - 1 ||
                    isLocked[selectedIndex + 1]
                  }
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    selectedIndex === learnItems.length - 1 ||
                    isLocked[selectedIndex + 1]
                      ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:shadow-lg hover:scale-105'
                  }`}
                >
                  Next <FaChevronRight className="text-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(96, 165, 250, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(96, 165, 250, 0.7);
        }
      `}</style>
    </div>
  );
}
