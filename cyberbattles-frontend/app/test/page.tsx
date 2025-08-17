import Navbar from "../../components/Navbar"
import React from "react";
export default function TestPage() {

  let navItems=["Home", "lab", "learn"]
  let navLinks=["/", "/test", "/test"]

  return (
    <>
    <Navbar items={navItems} links={navLinks}/>

    <div className="p-10">
      
      
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

      </div>

      {/* Buttons */}
      <div className="flex justify-between mt-4">
        <p className="self-center cursor-pointer">Create Account</p>
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

