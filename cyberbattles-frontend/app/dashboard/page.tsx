"use client";

import React, { useState } from "react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const Dashboard = () => {
  const router = useRouter();
  const [jwt, setJwt] = useState("");
  const [showJwt, setShowJwt] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  /**
   * Fetches the current user's JWT and displays it.
   */
  const handleGetJwt = async () => {
    if (auth.currentUser) {
      try {
        // Force refresh to get a new token
        const token = await auth.currentUser.getIdToken(true);
        setJwt(token);
        setShowJwt(true);
      } catch (error) {
        console.error("Failed to get JWT:", error);
        setJwt("Could not retrieve token.");
        setShowJwt(true);
      }
    } else {
      console.error("No user is signed in.");
    }
  };

  return (
    <>
      {/* Fixed Navbar */}
      <Navbar loggedIn={true} />

      {/* Dashboard Layout */}
      <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
        {/* Sidebar */}
        <aside className="w-64 bg-[#1e1e1e] shadow-md">
          <div className="p-6 text-xl font-bold border-b border-gray-700">
            Dashboard
          </div>
          <nav className="p-6">
            <ul className="space-y-4">
              <li>
                <a href="#" className="hover:text-blue-400">
                  Overview
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-400">
                  Analytics
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-400">
                  Reports
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-400">
                  Settings
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          {/* Header */}
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Welcome, User!</h1>
            <div className="flex gap-4">
              <button
                className="px-4 py-2 bg-blue-600 rounded-xl hover:opacity-90 transition font-bold"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </header>

          {/* Dashboard Widgets */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">
              <h2 className="text-lg font-semibold mb-2">Total Users</h2>
              <p className="text-2xl font-bold text-blue-400">1,245</p>
            </div>
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">
              <h2 className="text-lg font-semibold mb-2">Active Games</h2>
              <p className="text-2xl font-bold text-green-400">5</p>
            </div>
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">
              <h2 className="text-lg font-semibold mb-2">Active Players</h2>
              <p className="text-2xl font-bold text-yellow-400">76</p>
            </div>
            {/* JWT Display Widget */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-1 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold mb-2">
                Your JWT (For Testing)
              </h3>
              <button
                onClick={handleGetJwt}
                className="px-4 py-2 bg-green-600 rounded-xl hover:opacity-90 transition font-bold mb-2"
              >
                Click to Reveal
              </button>
              {showJwt && (
                <textarea
                  readOnly
                  className="w-full h-24 p-2 bg-[#2f2f2f] border border-gray-600 rounded-md text-sm break-all"
                  value={jwt}
                />
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Dashboard;

