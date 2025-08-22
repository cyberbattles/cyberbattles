import logo from "../public/images/logo.png"
import cyberbattles from "../public/images/cyberbattles.png"
import Image from 'next/image'
import React from "react";
import Navbar from "@/components/Navbar";
import Link from 'next/link'

export default function LoginPage() {

  return (
    <>
    <Navbar loggedIn={false}/>

    <div className="p-10"></div>
    <div className="p-10">
      
      {/* <div className="absolute top-4 left-4 w-25 h-25">
        <Image src={logo} alt="logo of the website"/>     
      </div> */}
      
<section className="min-h-screen flex items-center justify-start pl-150">
  <div className="flex relative gap-8">

    {/* Left: Form */}
    <form action="" className="flex flex-col gap-4 relative">
      {/* Input container */}
      <div className="relative flex flex-col gap-4">
        <input
          className="p-7 rounded-xl border w-100"
          type="email"
          name="email"
          placeholder="Email"
        />
        <input
          className="p-7 rounded-xl border w-100"
          type="password"
          name="password"
          placeholder="Password"
        />

        {/* Image positioned at the vertical midpoint */}
        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-100 h-100">
          <Image
            src={cyberbattles}
            alt="text based logo of the website"
            layout="fill"
            objectFit="contain"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between mt-4">
        <Link href="/register" className="self-center cursor-pointer hover:underline">
          Create Account
        </Link>
        <button className="outline-solid rounded-xl text-white py-2 px-6 hover:scale-105 duration-300">
          Login
        </button>
      </div>
    </form>

  </div>
</section>




          

        
    </div>
</>
    
  );
}

