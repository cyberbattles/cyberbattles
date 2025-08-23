"use client";
import React, { useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { auth } from "../lib/firebase"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";

import cyberbattles from "../public/images/cyberbattles.png";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("ccount created:", auth.currentUser);
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
      <div className="p-10"></div>
      <div className="p-10">
        <section className="min-h-screen flex items-center justify-start pl-150">
          <div className="flex relative gap-8">
            <form
              onSubmit={handleAuth}
              className="flex flex-col gap-4 relative w-[300px]"
            >
              <div className="relative flex flex-col gap-4">
                <input
                  className="p-4 rounded-xl border"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                />
                <input
                  className="p-4 rounded-xl border"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
                {isRegister && (
                  <input
                    className="p-4 rounded-xl border"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    required
                  />
                )}

                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-40 h-40">
                  <Image
                    src={cyberbattles}
                    alt="website logo"
                    layout="fill"
                    objectFit="contain"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                className={`${
                  isRegister ? "bg-green-600" : "bg-blue-600"
                } rounded-xl text-white py-2 px-6 hover:scale-105 duration-300`}
              >
                {isRegister ? "Create Account" : "Login"}
              </button>

              <p
                className="text-sm text-gray-500 cursor-pointer mt-2 hover:underline"
                onClick={() => setIsRegister(!isRegister)}
              >
                {isRegister
                  ? "Already have an account? Login"
                  : "Need an account? Create one"}
              </p>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
