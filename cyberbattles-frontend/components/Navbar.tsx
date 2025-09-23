import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import logo from "../public/images/logo.png";
import { IoMenu } from "react-icons/io5";
import avatarPlaceholder from "../public/images/avatar_placeholder.png";
import React, { useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

import type { User } from "firebase/auth";

function Navbar() {
  const router = useRouter();
  const genericItems = ["Home", "Leaderboard", "Lab"];
  const genericLinks = ["/", "/leaderboard", "/lab"];
  const userItems = ["Dashboard", "Leaderboard", "Learn", "Traffic", "Shell"];
  const userLinks = [
    "/dashboard",
    "/leaderboard",
    "/learn",
    "/network-traffic",
    "/shell",
  ];

  const [[items, links], setItems] = useState([genericItems, genericLinks]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [photoURL, setPhotoURL] = useState("");

  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  {
    /* Check if the user auth state has changed. If so update the currentUser .*/
  }
  try {
    onAuthStateChanged(auth, (user) => {
      if (user && !currentUser) {
        setCurrentUser(user);
        if (user.photoURL) {
          setPhotoURL(user.photoURL);
        }
        setItems([userItems, userLinks]);
      }
    });
  } catch (error) {
    setCurrentUser(null);
    console.error("Failed:", error);
  }

  // Forces a reload when clicking onto the homepage from the homepage
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === "/") {
      e.preventDefault();
      router.replace("/");
      window.location.reload();
    }
  };

  return (
    <nav className="fixed w-full h-25 sm:h-40 shadow-xl bg-black z-50">
      <div className="flex flex-basis items-center h-full w-full ">
        <div className="flex w-2/3 items-center pl-5">
          <div className="flex lg:hidden relative">
            {/* Hamburger icon */}
            <IoMenu
              className="ml-5 cursor-pointer w-15 h-15"
              onClick={handleClick}
            />

            {/* Dropdown menu */}
            <div
              className={`absolute w-50 h-80 pt-2 top-16 left-0 bg-black rounded-xl transition-opacity duration-700 ease-in-out ${
                isOpen ? "opacity-100 flex flex-col" : "opacity-0 hidden"
              }`}
            >
              {/* Menu items */}
              <ul className="flex flex-col justify-between w-full h-full py-10 pl-4">
                {["Home", ...items].map((item, index) => (
                  <Link
                    key={index}
                    href={index === 0 ? "/" : links[index - 1]}
                    onClick={index === 0 ? handleHomeClick : undefined}
                  >
                    <li className="capitalize text-xl hover:scale-110 duration-300 font-bold cursor-pointer">
                      {item}
                    </li>
                  </Link>
                ))}
              </ul>
            </div>
          </div>

          {/* Logo */}
          <Link href="/" onClick={handleHomeClick}>
            <div
              className={`flex-shrink-0 flex items-center ${isOpen ? "hidden" : ""}`}
            >
              <Image
                src={logo}
                alt="logo"
                className="xl:flex hidden max-w-[150px] flex-shrink-0"
              />
            </div>
          </Link>
          <ul className="justify-between w-full gap-5 mr-60 ml-10 hidden lg:flex ">
            {items.map((item, index) => (
              <Link key={item} href={links[index]}>
                <li className="capitalize text-2xl hover:scale-110 duration-300 font-bold cursor-pointer">
                  {item}
                </li>
              </Link>
            ))}
          </ul>
        </div>
        <div className="flex justify-end items-center w-full lg:w-1/3 pr-5 gap-5">
          <div className="">
            {currentUser && (
              <Link href="/dashboard">
                <p className="flex text-2xl hover:scale-110 duration-300">
                  {currentUser.displayName}
                </p>
              </Link>
            )}
            {!currentUser && (
              <Link href="/login">
                <p className="capitalize text-2xl hover:scale-110 duration-300">
                  Login
                </p>
              </Link>
            )}
          </div>
          {currentUser && (
            <Link href="/profile" className="w-16 h-16 sm:w-24 sm:h-24">
              {currentUser.photoURL ? (
                <Image src={photoURL} alt="avatar" className="rounded-full" />
              ) : (
                <Image
                  src={avatarPlaceholder}
                  alt="avatar"
                  className="rounded-full"
                />
              )}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
