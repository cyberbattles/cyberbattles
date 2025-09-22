import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import logo from "../public/images/logo.png";
import close from "../public/images/close_icon.png";
import hamburger from "../public/images/hamburger_icon.png";
import React, { useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

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
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [photoURL, setPhotoURL] = useState(
    "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png",
  );

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
    <nav className="fixed w-full h-40 shadow-xl bg-black z-50">
      <div className="flex flex-basis items-center h-full w-full ">
        <div className="flex w-2/3 items-center pl-5">
          <div className="flex lg:hidden relative">
            {/* Hamburger icon always visible */}
            <Image
              src={hamburger}
              alt="hamburger"
              width={50}
              className="invert ml-10 cursor-pointer"
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
                    key={item}
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
            <Link href="/profile">
              <img
                src={photoURL}
                alt="avatar"
                width={100}
                className="rounded-full"
              />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
