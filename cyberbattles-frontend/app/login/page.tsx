"use client";
import React, { useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { auth } from "../../lib/firebase";
import cyberbattles from "../../public/images/cyberbattles.png";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            displayName: username,
          });
        }
        console.log("Account created:", auth.currentUser);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in:", auth.currentUser);
      }

      router.push("/dashboard"); // redirect after auth
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <Navbar loggedIn={false} />
      <section className="min-h-screen flex items-center justify-center px-12">
        <div className="max-w-sm w-full bg-[#2f2f2f] p-8 rounded-2xl shadow-md">
          <div className="flex flex-col items-center gap-4 mb-6">
            <Image
              src={cyberbattles}
              alt="website logo"
              width={150}
              height={100}
              className="object-contain"
            />
            <h2 className="text-3xl font-semibold text-white font-bold">
              {isRegister ? "Create Account" : "Login"}
            </h2>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {isRegister && (
              <input
                className="p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-white text-white font-bold"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
              />
            )}
            <input
              className="p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-white text-white font-bold"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              className="p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-white text-white font-bold"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            {isRegister && (
              <input
                className="p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-white text-white font-bold"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                required
              />
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              className={`${
                isRegister ? "bg-green-600" : "bg-blue-600"
              } rounded-xl text-white py-2 px-6 hover:opacity-90 transition font-bold`}
            >
              {isRegister ? "Create Account" : "Login"}
            </button>
          </form>

          <p
            className="text-sm text-white cursor-pointer mt-4 hover:underline text-center italic"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister
              ? "Already have an account? Login"
              : "Need an account? Create one"}
          </p>
        </div>
      </section>
    </>
  );
}