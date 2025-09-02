'use client';
import Navbar from "../../components/Navbar"
import React, { useEffect, useRef, useState } from "react";

type ContentSegment = 
  | { type: "text"; content: string }
  | { type: "code"; content: string }

type LearnItem = {
  title: string
  segments: ContentSegment[]
  resources?: string[]
}


export default function LearnPage() {

    // Altered the Learn Item array to be more user/educational friendly.

    const learnItems: LearnItem[] = [
        {
          title: "Getting Started",
          segments: [
            { type: "text", content: "It is important before you begin your adventure on CyberBattles that you have an educational understanding of the key cybersecurity concepts. These concepts are vital in industry and provide you with the information necessary to enjoy this high action game." },
            { type: "text", content: "Visit the modules below and once completed begin your journey on CyberBattles." }
          ]
        },
        {
            title: "Red Teaming",
            segments: [
              { type: "text", content: "Red teaming is a cybersecurity definition for ethical hackers conducting simulated cyberattacks towards organisations to help identify vulnerabilities and make improvements to security operations." },
              { type: "text", content: "Red team hackers use the same tools as malicious attackers but their goal is the opposite, they get permission by the organisation before hacking them and do not conduct any attacks that would damage the environment of the organisation." },
              { type: "text", content: "During simulated attacks red teams often face off against blue teams who act as system defenders." },
              { type: "text", content: "Common targets include AI systems, datasets, firewalls, cryptographic systems, endpoint systems, intrusion detection systems, web applications, web servers." },
              { type: "text", content: "Common techniques include:" },
              { type: "text", content: "- Social Engineering\n- Physical Security test\n- Network sniffing\n- Brute forcing credentials" }
            ],
            resources: ["https://www.ibm.com/think/topics/red-teaming"]
          },
          {
            title: "Blue Teaming",
            segments: [
              { type: "text", content: "Blue teaming is a cybersecurity definition that is there to defend an organisation internally against cyberattacks, including against red teaming. The objectives of blue teaming is to mitigate vulnerabilities and security incidents through analysis of the organisations infrastructure. They also educate employees and conduct security audits, incident response and recovery." },
              { type: "text", content: "The blue team is internal so they have access to the entire infrastructure of the organisation which generates an easily identifiable road map of potential risks and endpoints that may be targeted. This gives them a significant edge over red teaming who usually has a ‘black box’ field of view. " },
              { type: "text", content: "A black box is a system which can be viewed in terms of inputs and outputs without knowing any knowledge of the internal components." },
              { type: "text", content: "Assessments are usually completed via audits of internal structures and a security report is written and delivered to the organisations shareholders. The format of the report consists of methods, recommendations for updates to the infrastructure and a risk rating. Blue team members must be very knowledgeable in their field, understanding cybersecurity and have a high attention to detail. Many attacks may be silent, or internal and their detection must be thorough." }
            ],
            resources: ["https://www.ibm.com/think/topics/blue-team", "https://en.wikipedia.org/wiki/Black_box"]
          },
        {
          title: "Basics of SSH",
          segments: [
            { type: "text", content: "Secure Shell Protocol more commonly known as SSH runs on top of the TCP/IP protocol suite, which transports and delivers data packets. SSH is used to transmit any arbitrary data over a network, with common use cases being remotely managing servers, infrastructure and employee computers. Securely transferring files, accessing services in the cloud and connecting remotely to services in a private network. " },
            { type: "text", content: "SSH is secure because of its incorporation of encryption and authentication via a process called public key cryptography. Users generate a public and private key, the private key is kept secret by its owner, whereas the public key is available for anyone to access, the two keys correspond with each other, and in order to establish a users identity the public and private key must match, validating the user." },
            { type: "text", content: "In an SSH connection, both sides have a public/private key pair and each side authenticates the other using these keys." },
            { type: "text", content: "We will go through some common SSH commands that you will begin to become familiar with overtime." },
            { type: "code", content: "ssh username@hostname" },
            { type: "text", content: "To connect to a remote server via ssh, the command requires your account name on the remote machine, and the IP address or domain of the server for the hostname. You may be prompted for the password of your account which will then connect you to the remote server. Users can also access the server without requiring a password, this can be done by generating the public/private key pair." },
            { type: "code", content: "ssh-keygen\nssh-copy-id username@hostname" },
            { type: "text", content: "Users can generate a private/public key pair with ssh-keygen. This allows users to login without a password, using the private key stored on the machine. The second command copies the public key to the authorised keys on the server allowing users to simply ssh without the need of a password." },
            { type: "code", content: 'ssh username@host "ls -la"'},
            { type: "text", content: "You can also run commands inside and outside of the remote server. In this case, we are running a list command which shows the names of files in a particular directory, the argument -la in this case gives additional information about the files including file owners, permissions and date of creation."},
            { type: "code", content: "scp localfile.txt username@hostname:/remote/path"},
            { type: "text", content: "SSH allows the user to also copy files to a remote server. In this command the user copies a file from their current local directory to a path in the remote server. This command also can be reversed to copy files from the remote server to the users local directory."}
          ],
          resources: ["https://www.ssh.com/academy/ssh/command#ssh-command-in-linux", "https://www.cloudflare.com/learning/access-management/what-is-ssh/"]
        },
        {
          title: "Importance of Uptime",
          segments: [
            { type: "text", content: "Uptime ensures that your services are reliable and accessible." }
          ]
        }
      ]

  const [selectedIndex, setSelectedIndex] = useState(0)

  const optionStyle = "mt-10 w-full border-bottom border-solid border-b-2 hover:scale-105 duration-300"

  return (
    <>
      <Navbar/>
      <div className="min-h-screen pt-30 overflow-hidden">
        <section className="container mx-auto px-6 py-16">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-6xl font-bold text-white mb-4">
              Learn
            </h1>
            <p className="text-xl text-white-600 max-w-2xl italic mx-auto">
              Explore topics and expand your knowledge with our interactive learning platform
            </p>
          </div>
  
          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto ">
            {/* Topics Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-3 sticky top-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                  Topics
                </h3>
                <div className="space-y-2">
                  {learnItems.map((item, index) => (
                    <button
                      key={index}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 group ${
                        selectedIndex === index
                          ? 'bg-gradient-to-r from-gray-500 to-gray-950 text-white shadow-lg scale-105'
                          : 'bg-white/50 text-gray-700 hover:bg-white/80 hover:shadow-md hover:scale-102'
                      }`}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-2">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-auto h-[470px]">
                {learnItems.map((item, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-300 ${selectedIndex === index ? 'block' : 'hidden'}`}
                  >
                    {/* Content Header */}
                    <div className="bg-gray-950 p-8 text-white">
                      <h2 className="text-3xl font-bold mb-2">{item.title}</h2>
                      <div className="w-20 h-1 bg-white/50 rounded-full"></div>
                    </div>

                    {/* Content Body */}
                    <div className="p-8">
                      <div className="prose prose-lg max-w-none">
                        {item.segments.map((seg: { type: string; content: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, i: React.Key | null | undefined) =>
                          seg.type === "text" ? (
                            <div key={i} className="text-gray-700 leading-relaxed whitespace-pre-line my-2">
                              {seg.content}
                            </div>
                          ) : (
                            <pre key={i} className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
                              <code className="text-sm text-gray-900">{seg.content}</code>
                            </pre>
                          )
                        )}

                        {item.resources && (
                          <div className="text-blue-700 italic leading-relaxed whitespace-pre-line mt-4">
                            {item.resources.join("\n")}
                          </div>
                        )}
                      </div>

                      {/* Progress Indicator */}
                      <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Topic {selectedIndex + 1} of {learnItems.length}</span>
                          <div className="flex gap-2">
                            {learnItems.map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  i === selectedIndex ? 'bg-blue-500' : 'bg-gray-300'
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

  
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                  disabled={selectedIndex === 0}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    selectedIndex === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white/70 text-gray-700 hover:bg-white/90 hover:shadow-md'
                  }`}
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setSelectedIndex(Math.min(learnItems.length - 1, selectedIndex + 1))}
                  disabled={selectedIndex === learnItems.length - 1}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    selectedIndex === learnItems.length - 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-gray-500 to-gray-500 text-white hover:shadow-lg hover:scale-105'
                  }`}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )};

  /* 
  AI Reference: Asked for a rough outline for a educational learning page. AI was only used once for a rough outline.
  https://claude.ai/chat/365afac0-351e-4544-9ec5-08fb33385ebe
  */