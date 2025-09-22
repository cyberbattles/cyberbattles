"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { doc, getDoc, updateDoc, arrayUnion, collection, where, query, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

const JoinClan = () => {
    const router = useRouter();
    const [clanId, setClanId] = useState("");
    const [joinMessage, setJoinMessage] = useState({ type: "", text: "" });
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isInClan, setIsInClan] = useState(false);
    const [uid, setUid] = useState<string | null>(null);
    const [clanLoading, setClanLoading] = useState(true);

    // Monitor auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            setUid(currentUser.uid);
            localStorage.setItem("currentuid", currentUser.uid);
          } else {
            setUser(null);
            setUid(null);
            localStorage.removeItem("currentuid");
          }
        });
        return () => unsubscribe();
      }, []);

      useEffect(() => {
        const checkUserClan = async () => {
          if (!uid) {
            setIsInClan(false);
            setClanLoading(false);
            return;
          }
      
          try {
            const clansRef = collection(db, "clans");
            const q = query(clansRef, where("memberIds", "array-contains", uid));
            const querySnapshot = await getDocs(q);
      
            // Simply set a boolean
            setIsInClan(!querySnapshot.empty);
          } catch (error) {
            console.error("Error checking user clan:", error);
            setIsInClan(false);
          } finally {
            setClanLoading(false);
          }
        };
      
        checkUserClan();
      }, [uid]);

    const handleJoinTeam = async () => {
        // Prevent multiple submissions
        if (isLoading) return;
        
        // Basic validation
        if (!clanId.trim()) {
            setJoinMessage({ type: "error", text: "Please enter a Team ID." });
            return;
        }
        
        if (!user) {
            setJoinMessage({
                type: "error",
                text: "You must be logged in to join a team.",
            });
            return;
        }

        if (isInClan) {
            setJoinMessage({
                type: "error",
                text: `You are already in a clan. Leave it before joining another.`,
            });
            return;
        }

        setIsLoading(true);
        setJoinMessage({ type: "", text: "" });

        try {
            const teamRef = doc(db, "clans", clanId.trim());
            const docSnap = await getDoc(teamRef);

            if (docSnap.exists()) {
                const clanData = docSnap.data();
                
                // Check if user is already a member
                if (clanData.memberIds && clanData.memberIds.includes(user.uid)) {
                    setJoinMessage({
                        type: "error",
                        text: "You are already a member of this team.",
                    });
                    setIsLoading(false);
                    router.push("/lobby");

                    return;
                }

                // Add the user's UID to the memberIds array
                await updateDoc(teamRef, {
                    memberIds: arrayUnion(user.uid),
                });
                
                setJoinMessage({
                    type: "success",
                    text: `Successfully joined clan: ${clanData.name}!`,
                });
                setClanId("");

                const userRef = doc(db, "login", user.uid);
                await updateDoc(userRef, {
                    inClan: true,
                });
                
                // Redirects to lobby page after join team
                router.push("/lobby");
                
                
            } else {
                setJoinMessage({
                    type: "error",
                    text: "Clan not found. Please check the ID and try again.",
                });
            }
        } catch (error) {
            console.error("Error joining team:", error);
            setJoinMessage({
                type: "error",
                text: "Could not join clan. Please try again later.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToSelection = () => {
        try {
            router.push("/clan");
        } catch (error) {
            console.error("Navigation failed:", error);
        }
    };

    return (
        <>
            <Navbar />
            <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
                <main className="flex-1 flex flex-col items-center justify-center p-8">
                    <header className="text-center mb-12">
                        <h1 className="text-4xl font-bold mb-4">Join Clan</h1>
                        <p className="text-lg text-gray-300">Enter your Clan ID to join.</p>
                    </header>

                    <section className="flex flex-col items-center space-y-8">
                        <div className="w-80">
                            <label htmlFor="teamCode" className="block text-sm font-medium text-gray-300 mb-2">
                                Clan Code
                            </label>
                            <input
                                id="teamCode"
                                type="text"
                                value={clanId}
                                onChange={(e) => setClanId(e.target.value)}
                                placeholder="Enter Clan ID"
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-[#1e1e1e] border border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div className="flex flex-col items-center space-y-4">
                            <button
                                className="w-80 py-4 px-8 bg-green-600 rounded-2xl hover:opacity-90 transition font-bold text-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleJoinTeam}
                                disabled={isLoading || !user}
                            >
                                {isLoading ? "Joining..." : "Join Clan"}
                            </button>
                            <button
                                className="w-80 py-3 px-8 bg-gray-600 rounded-2xl hover:opacity-90 transition font-semibold text-lg shadow-md disabled:opacity-50"
                                onClick={handleBackToSelection}
                                disabled={isLoading}
                            >
                                Back to Selection
                            </button>
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
                            {!user && !authLoading && (
                                <p className="mt-3 text-sm text-yellow-400">
                                    Please log in to join a clan.
                                </p>
                            )}
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
};

export default JoinClan;

