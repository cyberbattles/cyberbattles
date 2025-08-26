import Image from "next/image"
import Link from "next/link";
import logo from "../public/images/logo.png"
import React, { useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

function Navbar() {
    const genericItems = ["Home", "Lab", "Learn"]
    const genericLinks = ["/", "/lab", "/learn"]
    const userItems = ["Home", "Leaderboard", "Traffic", "Shell"]
    const userLinks = ["/", "/", "/", "/", "/"]

    const [[loggedIn, dname, items, links], setLoggedIn] = useState([false, "", genericItems, genericLinks]);

    {/* Check if the user auth state has changed. If so update the navbar */}
    try{
        onAuthStateChanged(auth, (user) => {
            if (user && !loggedIn){
                let dispName = ""
                if (user.displayName){
                    dispName = user.displayName
                }
                setLoggedIn([true, dispName, userItems, userLinks])
            }
        })
    }  catch (error) {
        setLoggedIn([false, "", genericItems, genericLinks])
        console.error("Navbar failed:", error);
    }
    
    return(
        <nav className="fixed w-full h-40 shadow-xl">
        <div className="flex justify-between items-center h-full w-full px-4">
            <div className="flex justify-between items-center">
                <Image src={logo} alt="logo of the website" width="150" className="ml-5 mr-5"/>
                <ul className="hidden lg:flex">
                    {/* Create each navbar item with its relevant link */}
                    {items.map((item, index) => (
                        <Link key={item} href={links[index]}>
                        <li key={item} className="ml-20 text-2xl hover:scale-110 duration-300">
                            {item}
                        </li>
                        </Link>
                    ))}
                </ul>
            </div>
            <div className="flex justify-between items-center">
                <ul className="hidden md:flex">
                    { loggedIn &&
                    <Link href="/dashboard">
                    <li className="mr-20 text-2xl hover:scale-110 duration-300">
                        {dname}
                    </li>
                    </Link>
                    }
                    { !loggedIn &&
                    <Link href="/login">
                    <li className="mr-20 text-2xl hover:scale-110 duration-300">
                        Login
                    </li>
                    </Link>
                    }
                </ul>
                { loggedIn &&
                <div className="w-20 h-20 bg-gray-300 rounded-full ml-5 mr-10"></div>
                }
                
            </div>
                
        </div>
        </nav>
    )
}

export default Navbar;