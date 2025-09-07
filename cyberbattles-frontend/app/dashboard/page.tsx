"use client";
import React, { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const Dashboard = () => {
  const router = useRouter();
  const [jwt, setJwt] = useState("");
  const [showJwt, setShowJwt] = useState(false);

  // New state for the team join feature
  const [teamId, setTeamId] = useState("");
  const [joinMessage, setJoinMessage] = useState({ type: "", text: "" });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleGetJwt = async () => {
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true);
        setJwt(token);
        setShowJwt(true);
        localStorage.setItem("token",token);
      } catch (error) {
        console.error("Failed to get JWT:", error);
        setJwt("Could not retrieve token.");
        setShowJwt(true);
      }
    } else {
      console.error("No user is signed in.");
    }
  };

  const handleGoToTeam = () => {
      try {
        router.push("/team");
      } catch (error) {
        console.error("Navigation failed:", error);
      }
    };

  /**
   * Handles the logic for a user to join a team.
   */
  const handleJoinTeam = async () => {
    // Basic validation
    if (!teamId) {
      setJoinMessage({ type: "error", text: "Please enter a Team ID." });
      return;
    }
    if (!auth.currentUser) {
      setJoinMessage({
        type: "error",
        text: "You must be logged in to join a team.",
      });
      return;
    }

    // Clear previous messages and get user UID
    setJoinMessage({ type: "", text: "" });
    const uid = auth.currentUser.uid;
    const teamRef = doc(db, "teams", teamId);

    // Try to find and update the team document
    try {
      const docSnap = await getDoc(teamRef);

      if (docSnap.exists()) {
        // Team was found, add the user's UID to the memberIds array
        await updateDoc(teamRef, {
          memberIds: arrayUnion(uid),
        });
        setJoinMessage({
          type: "success",
          text: `Successfully joined team: ${docSnap.data().name}!`,
        });
        setTeamId("");
      } else {
        // Team with the given ID was not found
        setJoinMessage({
          type: "error",
          text: "Team not found. Please check the ID and try again.",
        });
      }
    } catch (error) {
      console.error("Error joining team:", error);
      setJoinMessage({
        type: "error",
        text: "Could not join team. Please try again later.",
      });
    }
  };

  return (
    <>
      {/* Fixed Navbar */}
      <Navbar/>

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

            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-1 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold mb-2">Want to get started?</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleGoToTeam}
                  className="px-4 py-2 bg-blue-600 rounded-xl hover:opacity-90 transition font-bold"
                >
                  Click Here
                </button>
              </div>
              {joinMessage.text && (
                <p
                  className={`mt-3 text-sm ${
                    joinMessage.type === "success"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {joinMessage.text}
                </p>
              )}
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