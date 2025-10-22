'use client';

import Image from 'next/image';
import Link from 'next/link';
import logo from '../public/images/logo.png';
import {IoMenu} from 'react-icons/io5';
import React, {useEffect, useState} from 'react';
import {useAuth} from '@/components/Auth';
import {collection, where, query, onSnapshot} from 'firebase/firestore';

import {db} from '@/lib/firebase';

const pfpPlaceholder = '/images/avatar_placeholder.png';
const genericItems = ['Home', 'Leaderboard', 'Learn'];
const genericLinks = ['/', '/leaderboard', '/learn'];
const userItems = ['Dashboard', 'Leaderboard', 'Learn'];
const userLinks = ['/dashboard', '/leaderboard', '/learn'];

function Navbar() {
  const [[items, links], setItems] = useState([genericItems, genericLinks]);
  const {currentUser} = useAuth();
  const [photoURL, setPhotoURL] = useState(pfpPlaceholder);

  const [isOpen, setIsOpen] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isInTeam, setIsInTeam] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (currentUser) {
      if (currentUser.photoURL) {
        setPhotoURL(currentUser.photoURL);
      }
    } else {
      // User logged out, reset everything to default
      setItems([genericItems, genericLinks]);
      setPhotoURL(pfpPlaceholder);
      setIsAdmin(false);
      setIsInTeam(false);
    }
  }, [currentUser]);

  // Check if user is admin
  useEffect(() => {
    if (!currentUser) {
      setIsAdmin(false);
      return;
    }

    const sessionQuery = query(
      collection(db, 'sessions'),
      where('adminUid', '==', currentUser.uid),
    );

    const unsubscribeSessions = onSnapshot(sessionQuery, querySnapshot => {
      setIsAdmin(!querySnapshot.empty);
    });

    return () => unsubscribeSessions();
  }, [currentUser]);

  // Check if user is in a team
  useEffect(() => {
    if (!currentUser) {
      setIsInTeam(false);
      return;
    }

    const teamsQuery = query(
      collection(db, 'teams'),
      where('memberIds', 'array-contains', currentUser.uid),
    );

    const unsubscribeTeams = onSnapshot(teamsQuery, querySnapshot => {
      setIsInTeam(!querySnapshot.empty);
    });

    return () => unsubscribeTeams();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setItems([genericItems, genericLinks]);
      return;
    }

    const newItems = [...userItems];
    const newLinks = [...userLinks];

    if (isInTeam) {
      newItems[0] = 'Lobby';
      newLinks[0] = '/lobby';
    } else if (isAdmin) {
      newItems[0] = 'Administration';
      newLinks[0] = '/administration';
    } else {
      newItems[0] = 'Dashboard';
      newLinks[0] = '/dashboard';
    }

    setItems([newItems, newLinks]);
  }, [currentUser, isAdmin, isInTeam]);

  return (
    <nav className="fixed w-full h-25 sm:h-40 shadow-xl bg-black z-50">
      <div className="flex justify-between flex-basis items-center h-full w-full ">
        <div className="flex items-center pl-5">
          {/* Logo */}
          <Link href="/">
            <div
              className={`flex-shrink-0 flex items-center ${isOpen ? 'hidden' : ''}`}
            >
              <Image
                src={logo}
                alt="logo"
                className="md:flex hidden max-w-[150px] flex-shrink-0"
              />
            </div>
          </Link>
          {/* Mobile Navbar Dropdown */}
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
                    onClick={handleClick}
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
            <Link href="/account" className="w-16 h-16 sm:w-24 sm:h-24">
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
