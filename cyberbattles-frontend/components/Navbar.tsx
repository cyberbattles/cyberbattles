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

  const [[items, links], setItems] = useState([genericItems, genericLinks]);
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [photoURL, setPhotoURL] = useState("https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png")

  {/* Check if the user auth state has changed. If so update the currentUser .*/}
  try{
    onAuthStateChanged(auth, (user) => {
        if (user && !currentUser){
            setCurrentUser(user)
            if (user.photoURL){
                setPhotoURL(user.photoURL)
            }
            setItems([userItems, userLinks])
        }
    })
  }  catch (error) {
    setCurrentUser(null)
    console.error("Failed:", error);
  }
    
  return (
    <nav className="fixed w-full h-40 shadow-xl bg-black z-50">
      <div className="flex justify-between items-center h-full w-full px-4">
        <div className="flex justify-between items-center">
          <Image src={logo} alt="logo" width={150} className="ml-5 mr-5" />
          <ul className="hidden md:flex">
            {items.map((item, index) => (
              <Link key={item} href={links[index]}>
                <li className="ml-20 lowercase text-2xl hover:scale-105 duration-300 font-bold cursor-pointer">
                  {item}
                </li>
              </Link>
            ))}
          </ul>
        </div>
        <div className="flex justify-between items-center">
        <ul className="hidden md:flex">
                { currentUser &&
                <Link href="/dashboard">
                <li className="mr-20 text-2xl hover:scale-110 duration-300">
                    {currentUser.displayName}
                </li>
                </Link>
                }
                { !currentUser &&
                <Link href="/login">
                <li className="mr-20 text-2xl hover:scale-110 duration-300">
                    Login
                </li>
                </Link>
                }
            </ul>
            { currentUser &&
            <Link href="/profile">
            <img
              src={photoURL}
              alt="avatar"
              width={100}
              className="rounded-full mr-10" />
            </Link>
            }

        </div>
      </div>
    </nav>
  );
}

export default Navbar