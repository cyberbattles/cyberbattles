'use client';
import Navbar from "../../components/Navbar"
import React, { useState } from "react";
export default function LearnPage() {

  let learnItems = [
    ["Getting Started", "This is the information about getting started"], 
    ["Red Teaming", "Something about red teaming"],
    ["Blue Teaming", "Now we are talking about blue teaming"],
    ["Importance of Uptime", "Uptime this and uptime that"],
    ["Basics of SSH", "Here are the basics of SSH"],
    ["Network Probing", "How network probing works blah blah blah"]
]

  const [selectedIndex, setSelectedIndex] = useState(0)

  const optionStyle = "mt-10 w-full border-bottom border-solid border-b-2 hover:scale-105 duration-300"

  return (
    <>
    <Navbar/>

    <div className="p-10">
      
      
    <section className="min-h-screen p-50 w-full flex flex-col items-center gap-20">
        <p className="text-7xl mt-10">
            Learn
        </p>

        <div className="flex flex-row gap-20 w-full">
            <div className="basis-1/3 text-xl flex flex-col gap-4 p-10 rounded-xl border">
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
            <div className="basis-2/3 text-xl flex flex-col items-center gap-4 p-10 rounded-xl border">
                {learnItems.map((item, index) => (
                    <>
                    <div
                        className={selectedIndex === index ? 'p-5 w-full flex text-3xl border-bottom border-solid border-b-2 ' : 'hidden'}
                        >
                            <p>{item[0]}</p>
                    </div>
                    <div
                        className={selectedIndex === index ? 'p-5 flex flex-col gap-10 w-full ' : 'hidden'}
                        >
                            <p>{item[1]}</p>
                    </div>
                    </>
                ))
                }
            </div>
        </div>
        

    </section>



          

        
    </div>
    </>

    
  );
}

