import Image from "next/image"
import Link from "next/link";
import logo from "../public/images/logo.png"
import React, { useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

function Navbar() {
  const genericItems = ["Home", "Leaderboard", "Lab", ]
  const genericLinks = ["/", "/leaderboard", "/lab", ]
  const userItems = ["Dashboard", "Leaderboard", "Learn", "Traffic", "Shell"]
  const userLinks = ["/dashboard", "/leaderboard", "/learn", "/network-traffic", "/shell"]

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
      <div className="flex flex-basis items-center h-full w-full ">
        <div className="flex w-2/3 items-center pl-5">
          <Image src={logo} alt="logo" width={150} className="hidden lg:flex" />
          <ul className="flex  w-full gap-20 mr-80 ml-10 lg:ml-20">
            {items.map((item, index) => (
              <Link key={item} href={links[index]}>
                <li className="capitalize text-2xl hover:scale-110 duration-300 font-bold cursor-pointer">
                  {item}
                </li>
              </Link>
            ))}
          </ul>
        </div>
        <div className="flex justify-end items-center w-1/3 pr-5 gap-5">
        
        <div className="">
            { currentUser &&
              <Link href="/dashboard">
              <p className="capitalize hidden md:flex text-2xl hover:scale-110 duration-300">
                  {currentUser.displayName}
              </p>
              </Link>
              }
              { !currentUser &&
              <Link href="/login">
              <p className="capitalize text-2xl hover:scale-110 duration-300">
                  Login
              </p>
              </Link>
              }
          </div>
            { currentUser &&
            <Link href="/profile">
            <img
              src={photoURL}
              alt="avatar"
              width={100}
              className="rounded-full" />
            </Link>
            }

        </div>
      </div>
    </nav>
  );
}

export default Navbar