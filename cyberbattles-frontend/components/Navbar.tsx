import Image from "next/image"
import Link from "next/link";
import logo from "../public/images/logo.png"
import React, { useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

function Navbar() {
    let items = ["Home", "Lab", "Learn"]
    let links = ["/", "/lab", "/learn"]
    let loggedIn = false
    let dname = null

    try{
        const user = auth.currentUser;
        if (user) {
            // User is signed in, see docs for a list of available properties
            // https://firebase.google.com/docs/reference/js/auth.user
            loggedIn = true
            dname = user.displayName;
            items = ["Home", "leaderboard", "traffic", "shell"]
            links = ["/", "/test", "/test", "/test", "/test"]
        }
    }  catch (error) {
        console.error("Navbar failed:", error);
    }
    
    return(
        <nav className="fixed w-full h-40 shadow-xl">
        <div className="flex justify-between items-center h-full w-full px-4">
            <div className="flex justify-between items-center">
                <Image src={logo} alt="logo of the website" width="150" className="ml-5 mr-5"/>
                <ul className="hidden sm:flex">
                    {/* Create each navbar item with its relevant link */}
                    {items.map((item, index) => (
                        <Link key={item} href={links[index]}>
                        <li key={item} className="ml-20 lowercase text-2xl hover:scale-105 duration-300">
                            {item}
                        </li>
                        </Link>
                    ))}
                </ul>
            </div>
            <div className="flex justify-between items-center">
                <ul className="hidden sm:flex">
                    { loggedIn &&
                    <Link href="/dashboard">
                    <li className="mr-20 lowercase text-2xl hover:scale-105 duration-300">
                        {dname}
                    </li>
                    </Link>
                    }
                    { !loggedIn &&
                    <Link href="/login">
                    <li className="mr-20 lowercase text-2xl hover:scale-105 duration-300">
                        Login
                    </li>
                    </Link>
                    }
                </ul>
                <div className="w-20 h-20 bg-gray-300 rounded-full ml-5 mr-10"></div>
            </div>
                
        </div>
        </nav>
    )
}

export default Navbar