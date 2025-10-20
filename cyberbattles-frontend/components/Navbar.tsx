'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import logo from '../public/images/logo.png';
import {IoMenu} from 'react-icons/io5';
import React, {useEffect, useState} from 'react';
import {useAuth} from '@/components/Auth';

function Navbar() {
  const router = useRouter();

  const pfpPlaceholder = '/images/avatar_placeholder.png';
  const genericItems = ['Home', 'Leaderboard', 'Learn'];
  const genericLinks = ['/', '/leaderboard', '/learn'];
  const userItems = ['Dashboard','Leaderboard', 'Learn'];
  const userLinks = [
    '/dashboard',
    '/leaderboard',
    '/learn',
  ];

  const [[items, links], setItems] = useState([genericItems, genericLinks]);
  const {currentUser} = useAuth();
  const [photoURL, setPhotoURL] = useState(pfpPlaceholder);

  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (currentUser) {
      setItems([userItems, userLinks]);
      if (currentUser.photoURL) {
        setPhotoURL(currentUser.photoURL);
      }
    } else {
      setItems([genericItems, genericLinks]);
      setPhotoURL(pfpPlaceholder); // Clear photoURL on logout
    }
  }, [currentUser]);

  // Forces a reload when clicking onto the homepage from the homepage
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      router.replace('/');
      window.location.reload();
    }
  };

  return (
    <nav className="fixed w-full h-25 sm:h-40 shadow-xl bg-black z-50">
      <div className="flex justify-between flex-basis items-center h-full w-full ">
        <div className="flex items-center pl-5">
          {/* Logo */}
          <Link href="/" onClick={handleHomeClick}>
            <div
              className={`flex-shrink-0 flex items-center ${isOpen ? 'hidden' : ''}`}
            >
              <Image
                src={logo}
                alt="logo"
                className="xl:flex hidden max-w-[150px] flex-shrink-0"
              />
            </div>
          </Link>
          <div className="flex md:hidden relative">
            {/* Hamburger icon */}
            <IoMenu
              className="ml-5 cursor-pointer w-15 h-15"
              onClick={handleClick}
            />

            {/* Dropdown menu */}
            <div
              className={`absolute w-50 h-80 pt-2 top-16 left-0 bg-black rounded-xl transition-opacity duration-700 ease-in-out ${
                isOpen ? 'opacity-100 flex flex-col' : 'opacity-0 hidden'
              }`}
            >
              {/* Menu items */}
              <ul className="flex flex-col justify-between w-full h-full py-10 pl-4">
                {['Home', ...items].map((item, index) => (
                  <Link
                    key={index}
                    href={index === 0 ? '/' : links[index - 1]}
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

          <ul className="ml-5 gap-5 hidden md:flex">
            {items.map((item, index) => (
              <Link key={item} href={links[index]}>
                <li className="capitalize text-2xl hover:scale-110 duration-300 font-bold cursor-pointer">
                  {item}
                </li>
              </Link>
            ))}
          </ul>
        </div>
        <div className="flex items-center pr-10 gap-5">
          <div className="">
            {currentUser && (
              <Link href="/account">
                <p className="flex text-2xl">{currentUser.displayName}</p>
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
              <Image
                src={photoURL}
                width="100"
                height="100"
                alt="avatar"
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
