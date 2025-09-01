'use client';
import React, { useState, useEffect } from "react";
import Image from "next/image";
import logo from "../../public/images/logo.png"
import Navbar from "@/components/Navbar";
import { auth } from "../../lib/firebase";
import { getAuth, onAuthStateChanged, updateEmail } from "firebase/auth";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
} from "firebase/auth";
import {
    getDownloadURL,
    getStorage,
    ref,
    uploadBytes
} from "firebase/storage";
import { useRouter } from "next/navigation";
import { FileData } from "firebase/ai";

//------------------------------

export default function ProfilePage() {

let learnItems = [
    ["Edit Profile", ""], 
    ["Authentication", ""],
    ["Delete Account", ""]
]

const optionStyle = "mt-10 w-full border-bottom border-solid border-b-2 hover:scale-105 duration-300"

// Firebase imports
const auth = getAuth();
const storage = getStorage();

// React imports
const router = useRouter();

// useState hooks
const [currentUser, setCurrentUser] = useState<any | null>(null)
const [photoURL, setPhotoURL] = useState("https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png")

const [selectedIndex, setSelectedIndex] = useState(0)
const [username, setUsername] = useState("");
const [photo, setPhoto] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

{/* Check if the user auth state has changed. If so update the currentUser .*/}
try{
    onAuthStateChanged(auth, (user) => {
        if (user && !currentUser){
            setCurrentUser(user)
            if (user.photoURL){
                setPhotoURL(user.photoURL)
            }
        }
    })
}  catch (error) {
    setCurrentUser(null)
    console.error("Failed:", error);
}


// Firebase functions
const handleChange = (e:any) => {
    console.log(e)
    console.log(e.target.files[0])
    if (e.target.files[0]) {
        setPhoto(e.target.files[0])
    }
}

const handleUpload = async (e:any) => {
    
    const fileRef = ref(storage, currentUser.uid + '.png')
    
    setLoading(true);

    if (photo){
        const snapshot = await uploadBytes(fileRef, photo)
        const tmpPhotoURL = await getDownloadURL(fileRef)
        console.log(username)
        if (username) {
            await updateProfile(currentUser, {displayName: username, photoURL: tmpPhotoURL})
        } else {
            await updateProfile(currentUser, {photoURL: tmpPhotoURL})
        }
    }

    if (username) {
        await updateProfile(currentUser, {displayName: username})
    }

    setLoading(false)
    window.location.reload()
    
}

const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try{
        window.location.reload()
    } catch (err: any) {
        setError(err.message);
    }
};


return (
    <>
    <Navbar/>

    <div className="p-10">
    
    <section className="min-h-screen pt-50 w-full flex flex-col items-center gap-20">
        <div>
            <p className="text-7xl mt-10">
                Profile
            </p>
        </div>
        

        <div className="flex flex-row gap-10 w-full justify-center">
            <div className="basis-1/4 text-xl flex flex-col gap-4 p-10 rounded-xl border">
                {learnItems.map((item, index) => (
                    <p 
                        key={index} 
                        className={optionStyle}
                        onClick={(event) => {
                            setSelectedIndex(index);
                        }}
                        >
                            {item[0]}
                        </p>
                ))
                }

            </div>
            <div className="basis-3/4 text-xl flex flex-col items-center gap-4 p-10 rounded-xl border">
            <div className="p-5 w-full flex text-3xl border-bottom border-solid border-b-2" >
                <p>{learnItems[selectedIndex][0]}</p>
            </div>
            {/* Edit profile */}
            { selectedIndex === 0 &&
                    <form onSubmit={handleUpload} className="p-5 w-full flex flex-col gap-20">
                        <div className="flex flex-row w-full justify-between items-center">
                            <div className="p-3 w-1/3 placeholder:text-white text-white ">
                                Username:
                            </div>
                            {
                            currentUser &&
                            <input
                                className="p-3 w-2/3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-white text-white font-bold"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={currentUser.displayName}
                            />
                            }
                        </div>
                        <div className="flex flex-row w-full items-center">
                            <div className="p-3 w-1/3 placeholder:text-white text-white ">
                                Profile Picture:
                            </div>
                            <div
                                className="flex flex-row items-center justify-between w-2/3">
                                {
                                    currentUser &&
                                    <img 
                                        src={photoURL}
                                        alt="avatar"
                                        width={200}
                                        height={200}
                                        className="rounded-xl" />
                                }
                                <input
                                    className="w-2/3 ml-20 bg-blue-600 rounded-xl text-white py-2 px-6 w-1/2 hover:opacity-90 transition font-bold"
                                    type="file" onChange={handleChange}/>
                            </div>

                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <div className="flex flex-row w-full justify-between items-center gap-5">
                            <button
                            disabled={loading}
                            onClick={handleUpload}
                            className="bg-green-600 rounded-xl text-white py-2 px-6 w-1/2 hover:opacity-90 transition font-bold"
                            >
                                Save changes
                            </button>
                            <button
                            onClick={handleCancel}
                            className="rounded-xl text-white py-2 px-6 w-1/2 hover:opacity-90 transition font-bold border-1"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
            }
            {/* Authentication */}
            { selectedIndex === 1 &&
                <div className="p-5 flex flex-col gap-10 w-full">
                    Auth
                </div>
            }
            {/* Delete account */}
            { selectedIndex === 2 &&
                <form className="p-5 flex flex-col gap-10 w-full">
                    <button>Delete</button>
                </form>
            }
            </div>
        </div>
    </section>
    </div>
    </>

    
);
}

