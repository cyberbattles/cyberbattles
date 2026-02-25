'use client';

import Image from 'next/image';
import Link from 'next/link';
import logo from '../public/images/logo.svg';
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
      newLinks[0] = '/admin';
    } else {
      newItems[0] = 'Dashboard';
      newLinks[0] = '/dashboard';
    }

    setItems([newItems, newLinks]);
  }, [currentUser, isAdmin, isInTeam]);

  return (
    <nav className="fixed z-50 h-25 w-full bg-black shadow-xl sm:h-40">
      <div
        className="flex-basis flex h-full w-full items-center justify-between"
      >
        <div className="flex items-center pl-5">
          {/* Logo */}
          <Link href="/">
            <div
              className={`flex flex-shrink-0 items-center
                ${isOpen ? 'hidden' : ''}`}
            >
              <Image
                src={logo}
                alt="logo"
                className="hidden max-w-[150px] flex-shrink-0 p-8 md:flex"
                draggable={false}
              />
            </div>
          </Link>
          {/* Mobile Navbar Dropdown */}
          <div className="relative flex md:hidden">
            {/* Hamburger icon */}
            <IoMenu
              className="ml-5 h-15 w-15 cursor-pointer"
              onClick={handleClick}
            />

            {/* Dropdown menu */}
            <div
              className={`absolute top-16 left-0 h-80 w-50 rounded-xl bg-black
                pt-2 transition-opacity duration-700 ease-in-out ${
                  isOpen ? 'flex flex-col opacity-100' : 'hidden opacity-0'
                }`}
            >
              {/* Menu items */}
              <ul
                className="flex h-full w-full flex-col justify-between py-10
                  pl-4"
              >
                {['Home', ...items].map((item, index) => (
                  <Link
                    key={index}
                    href={index === 0 ? '/' : links[index - 1]}
                    onClick={handleClick}
                  >
                    <li
                      className="cursor-pointer text-xl font-bold capitalize
                        duration-300 hover:scale-110"
                    >
                      {item}
                    </li>
                  </Link>
                ))}
              </ul>
            </div>
          </div>

          <ul className="ml-5 hidden gap-5 md:flex">
            {items.map((item, index) => (
              <Link key={item} href={links[index]}>
                <li
                  className="cursor-pointer text-2xl font-bold capitalize
                    duration-300 hover:scale-110"
                >
                  {item}
                </li>
              </Link>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-5 pr-10">
          <div className="">
            {currentUser && (
              <Link href="/account">
                <p className="flex text-2xl">{currentUser.displayName}</p>
              </Link>
            )}
            {!currentUser && (
              <Link href="/login">
                <p className="text-2xl capitalize duration-300 hover:scale-110">
                  Login
                </p>
              </Link>
            )}
          </div>
          {currentUser && (
            <Link href="/account" className="h-16 w-16 sm:h-24 sm:w-24">
              <Image
                src={photoURL}
                draggable={false}
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
