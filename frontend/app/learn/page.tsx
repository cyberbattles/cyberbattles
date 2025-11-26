'use client';
import React, {useEffect, useState} from 'react';
import {
  FaLock,
  FaUnlock,
  FaPlay,
  FaBook,
  FaShieldAlt,
  FaTerminal,
  FaServer,
  FaChevronRight,
  FaCheck,
  FaClock,
} from 'react-icons/fa';

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

export default function ModernLearnPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [completedModules, setCompletedModules] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);

  const [isLocked, setIsLocked] = useState<boolean[]>([
    false,
    true,
    true,
    true,
    true,
    true,
  ]);

  const learnItems: LearnItem[] = [
    {
      title: 'Getting Started',
      icon: <FaPlay />,
      difficulty: 'Beginner',
      estimatedTime: '1 min',
      segments: [
        {
          type: 'text',
          content:
            "Welcome to your cybersecurity journey! Before diving into the exciting world of CyberBattles, it's crucial to build a solid foundation of key cybersecurity concepts. These fundamentals are not just academic, they're the same principles used by professionals in the industry every day.",
        },
        {
          type: 'text',
          content:
            'Each module below is carefully crafted to give you practical knowledge and hands-on experience. Complete them in order to unlock your full potential in this high-stakes digital battlefield.',
        },
      ],
    },
    {
      title: 'Ethical Hacking',
      icon: <FaShieldAlt />,
      difficulty: 'Intermediate',
      estimatedTime: '5 min',
      segments: [
        {
          type: 'text',
          content:
            'Ethical hackers represent the offensive side of cybersecurity hackers who simulate real-world cyberattacks to help organizations identify and fix vulnerabilities before malicious actors can exploit them. Ethical hackers have the same skills and use the same tools and tactics as malicious hackers, but their goal is always to improve network security without harming the network or its users.',
        },
        {
          type: 'text',
          content:
            'Unlike malicious attackers, these professionals operate with explicit permission and focus on improving security rather than causing damage. They use the same sophisticated tools and techniques as cybercriminals, but their mission is protection through controlled testing.',
        },
        {
          type: 'text',
          content:
            'In many ways, ethical hacking is like a rehearsal for real-world cyberattacks. Organizations hire ethical hackers to launch simulated attacks on their computer networks. During these attacks, the ethical hackers demonstrate how actual cybercriminals break into a network and the damage they could do once inside.',
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
      resources: ['https://www.ibm.com/think/topics/ethical-hacking'],
    },
    {
      title: 'Blue Teaming',
      icon: <FaShieldAlt />,
      difficulty: 'Intermediate',
      estimatedTime: '5 min',
      segments: [
        {
          type: 'text',
          content:
            "Blue teaming is the defensive backbone of cybersecurity, the vigilant guardians who protect organizational assets from both external threats and internal vulnerabilities. They're the digital first responders who detect, analyze, and neutralize security incidents.",
        },
        {
          type: 'text',
          content:
            "Blue teams have comprehensive access to an organization's entire infrastructure. This 'white box' perspective allows them to create detailed risk assessments and implement proactive security measures.",
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
      icon: <FaTerminal />,
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
            'Why SSH is Secure: SSH employs public key cryptography, creating an unbreakable authentication system. Each user generates a mathematically linked key pair, a private key (kept secret) and a public key (shared freely). Only when these keys match can identity be verified and secure communication established.',
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
      icon: <FaTerminal />,
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
          content: 'CTF{yoU_FoUnD_M3}',
        },
        {
          type: 'text',
          content:
            'These challenges simulate real-world vulnerabilities and problems across areas like cryptography, web security, reverse engineering, forensics and binary exploitation.',
        },
        {
          type: 'text',
          content:
            'The goal is to capture as many flags as possible as a team or individual within a time limit. Each flag earns points and players or teams are ranked on a scoreboard.',
        },
        {
          type: 'heading',
          content: 'Cryptography',
        },
        {
          type: 'text',
          content:
            'Cryptography included breaking weak algorithms, recovering keys, understanding math flaws, such as a Caesar Cipher algorithm.\n\n In the example below, we see a encoded message which has used a caeser cipher algorithm. All letters are shifted by a certain number of offsets. In this case, we have an offset of 3, so A would become D. To crack the encryption we can shift the offset, print the result and end when a flag is discovered.',
        },
        {
          type: 'code',
          content:
            'ciphertext = "fdwfk_wkh_iodj"\ndef decrypt(text, shift):\n   result = ""\n   for c in text:\n     if c.isalpha():\n       shift_base = ord(A) if c.isupper() else ord(a)\n       result += chr((ord(c) - shift_base - shift) % 26 + shift_base)\n     else:\n      result += c\n   return result',
        },
        {
          type: 'code',
          content:
            'for s in range(26):\n   print(s, decrypt(ciphertext, s))\nOUTPUT: catch_the_flag',
        },
        {
          type: 'heading',
          content: 'Binary Exploitation (PWN)',
        },
        {
          type: 'text',
          content:
            'Binary Exploitation includes reverse engineering of binaries, exploiting memory bugs like buffer overflows, formatted strings. An example of this is an input overflow to get a shell.\n\n In the below code the function vuln() is called from main. Using gets() the program reads bytes from standard input into buffer without any bounds checking. If the user types more than 32 bytes, those extra bytes are written into adjacent memory releasing the flag.',
        },
        {
          type: 'code',
          content:
            'void win() {\n    printf("CTF{buffer_overflow_success});\n}\n\n\nvoid vuln() {\n    char buf[32];\n    gets(buf); // Vulnerable function!\n}\n\n\nint main() {\n    vuln();\n    return 0;\n}',
        },
        {
          type: 'heading',
          content: 'Reverse Engineering',
        },
        {
          type: 'text',
          content:
            'Involves analysing compiled code to recover logic or keys. Examples include disassembling binary to find hidden flags.',
        },
        {
          type: 'heading',
          content: 'Web Exploitation',
        },
        {
          type: 'text',
          content:
            'Occurs via exploiting vulnerable web apps (SQLI, XSS, insecure auth) by potentially injecting payloads into parameters.\n\n In the example provided below an SQL attack occurs. We are assuming that the application builds an SQL query by string concatenation. If an attacker was to supply the command below, because 1 is always true, the WHERE clause can evaluate to true, bypassing authentication.',
        },
        {
          type: 'code',
          content:
            "-- Vulnerable login check\nSELECT * FROM users WHERE username = '$user' AND password = '$pass';\n\n-- Attacker Input\n' OR '1'='1\n Authentication bypassed!",
        },
        {
          type: 'heading',
          content: 'Forensics',
        },
        {
          type: 'text',
          content:
            'Analysing files, memory dumps, disk images or network traffic to receover hidden files, such as inside a PNG.',
        },
        {
          type: 'heading',
          content: 'OSINT',
        },
        {
          type: 'text',
          content:
            'OSINT (Open-Source Intelligence) is the process of collecting and analyzing information from publicly available sources to generate useful intelligence. These sources can include websites, social media, news articles, government publications, forums, images, and even metadata hidden in files.',
        },
        {
          type: 'heading',
          content: 'Beginner Learning Tool',
        },
        {
          type: 'text',
          content:
            'CyberChef is a simple, intuitive web app for analysing and decoding data without having to deal with complex tools or programming languages. CyberChef encourages both technical and non-technical people to explore data formats, encryption and compression. A simple, intuitive web app for analysing and decoding data without having to deal with complex tools or programming languages. CyberChef encourages both technical and non-technical people to explore data formats, encryption and compression.',
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
      icon: <FaServer />,
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

  // Load progress from LocalStorage on mount
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('cyber_learn_progress');
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        // Validate structure briefly or just trust localstorage
        if (parsed.completedModules && parsed.isLocked) {
          setCompletedModules(parsed.completedModules);
          setIsLocked(parsed.isLocked);
        }
      }
    } catch (e) {
      console.error('Failed to load progress', e);
    }
  }, []);

  // Save progress handler
  const saveProgressToStorage = (completed: boolean[], locked: boolean[]) => {
    localStorage.setItem(
      'cyber_learn_progress',
      JSON.stringify({
        completedModules: completed,
        isLocked: locked,
      }),
    );
  };

  const handleModuleComplete = () => {
    const newCompleted = [...completedModules];
    newCompleted[selectedIndex] = true;

    // Unlock next module logic
    const newLocked = [...isLocked];
    if (selectedIndex + 1 < newLocked.length) {
      newLocked[selectedIndex + 1] = false;
    }

    // Update State
    setCompletedModules(newCompleted);
    setIsLocked(newLocked);

    // Persist
    saveProgressToStorage(newCompleted, newLocked);
  };

  const progressPercentage =
    (completedModules.filter(Boolean).length / learnItems.length) * 100;

  return (
    <div className="min-h-screen bg-[#2f2f2f] pt-25 text-white sm:pt-40">
      <div className="pt-16 pb-12">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-5xl font-bold text-white">Learn</h1>

            <p
              className="mx-auto max-w-3xl text-xl leading-relaxed
                text-white/90"
            >
              Learn how to defend and attack in the world of cybersecurity with
              realistic modules designed to build your skills step-by-step.
            </p>

            <div className="mx-auto mt-8 max-w-md rounded bg-[#1e1e1e] p-4">
              <div
                className="mb-2 flex items-center justify-between font-mono
                  text-sm text-white"
              >
                <span>Learning Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-sm bg-black">
                <div
                  className="h-full bg-green-600"
                  style={{width: `${progressPercentage}%`}}
                ></div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-8 lg:grid-cols-4">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div
                className="sticky top-24 rounded-lg bg-[#1e1e1e] p-4 md:top-45"
              >
                <div
                  className="mb-6 flex items-center gap-3 border-b
                    border-gray-700 pb-4"
                >
                  <FaBook className="text-gray-200" />
                  <h3 className="text-lg font-bold text-gray-200">Modules</h3>
                </div>

                <div className="space-y-2">
                  {learnItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        !isLocked[index] && setSelectedIndex(index)
                      }
                      disabled={isLocked[index]}
                      className={`group flex w-full items-center justify-between
                      rounded p-3 text-left transition-colors ${
                        selectedIndex === index
                          ? 'border-l-4 bg-gray-500 text-white'
                          : isLocked[index]
                            ? 'cursor-not-allowed text-gray-600 opacity-50'
                            : `text-gray-400 hover:bg-gray-800
                              hover:text-gray-200`
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`text-sm
                          ${selectedIndex === index ? 'text-white' : 'text-gray-500'}`}
                        >
                          {item.icon}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {item.title}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {completedModules[index] && (
                          <FaCheck className="text-xs text-green-500" />
                        )}
                        {isLocked[index] ? (
                          <FaLock className="text-xs" />
                        ) : (
                          <FaUnlock
                            className="text-xs text-gray-600
                              group-hover:text-gray-400"
                          />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
              <div
                className="min-h-[600px] overflow-hidden rounded-lg
                  bg-[#1e1e1e]"
              >
                {learnItems.map((item, index) => (
                  <div
                    key={index}
                    className={selectedIndex === index ? 'block' : 'hidden'}
                  >
                    {/* Module Header */}
                    <div className="bg-gray-850 border-b border-[#333333] p-8">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="mb-4 flex items-center gap-4">
                            <div
                              className="rounded border border-gray-700
                                bg-gray-800 p-3"
                            >
                              {item.icon}
                            </div>
                            <div>
                              <h2 className="mb-1 text-2xl font-bold text-white">
                                {item.title}
                              </h2>
                              <div
                                className="flex items-center gap-4 font-mono
                                  text-sm text-gray-400"
                              >
                                <span
                                  className={`rounded border px-2 py-0.5 text-xs
                                  ${
                                    item.difficulty === 'Beginner'
                                      ? `border-green-900 bg-green-900/20
                                        text-green-500`
                                      : item.difficulty === 'Intermediate'
                                        ? `border-yellow-900 bg-yellow-900/20
                                          text-yellow-500`
                                        : `border-red-900 bg-red-900/20
                                          text-red-500`
                                  }`}
                                >
                                  {item.difficulty}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FaClock className="text-xs" />{' '}
                                  {item.estimatedTime}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Module Content */}
                    <div className="p-8">
                      <div className="max-w-4xl space-y-6">
                        {item.segments.map((seg, i) => {
                          if (seg.type === 'text') {
                            return (
                              <div
                                key={i}
                                className="leading-7 whitespace-pre-line
                                  text-gray-300"
                              >
                                {seg.content}
                              </div>
                            );
                          } else if (seg.type === 'heading') {
                            return (
                              <h3
                                key={i}
                                className="mt-8 mb-2 border-b border-gray-800
                                  pb-2 text-xl font-bold text-white"
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
                          return null;
                        })}

                        {item.resources && (
                          <div className="mt-10 rounded bg-[#2f2f2f] p-6">
                            <h4
                              className="mb-3 flex items-center gap-2 font-bold
                                text-gray-200"
                            >
                              References
                            </h4>
                            <ul
                              className="list-inside list-disc space-y-1
                                text-sm"
                            >
                              {item.resources.map((resource, i) => (
                                <li key={i}>
                                  <a
                                    href={resource}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-shadow-white
                                      hover:underline"
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
                      <div
                        className="mt-12 flex items-center justify-between
                          border-t pt-6"
                      >
                        <button
                          onClick={() =>
                            setSelectedIndex(Math.max(0, selectedIndex - 1))
                          }
                          disabled={selectedIndex === 0}
                          className={`rounded px-4 py-2 text-sm font-medium
                          transition-colors ${
                            selectedIndex === 0
                              ? 'cursor-not-allowed text-gray-600'
                              : `text-gray-300 hover:bg-gray-800
                                hover:text-white`
                          }`}
                        >
                          &larr; Previous
                        </button>

                        <div className="flex gap-4">
                          {isLocked[selectedIndex]
                            ? null
                            : !completedModules[selectedIndex] && (
                                <button
                                  onClick={handleModuleComplete}
                                  className="rounded bg-green-700 px-6 py-2
                                    text-sm font-bold text-white
                                    transition-colors hover:bg-green-600"
                                >
                                  Mark Complete
                                </button>
                              )}

                          {learnItems.length === selectedIndex + 1 ? null : (
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
                              className={`flex items-center gap-2 rounded px-6
                                py-2 text-sm font-bold transition-colors ${
                                  selectedIndex === learnItems.length - 1 ||
                                  isLocked[selectedIndex + 1]
                                    ? 'cursor-not-allowed bg-red-500'
                                    : `cursor-pointer bg-blue-600 text-white
                                      hover:bg-blue-500`
                                }`}
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
