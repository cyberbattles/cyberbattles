'use client';
import Navbar from "../../components/Navbar"
import React, { useState } from "react";
export default function LearnPage() {

  let learnItems = ["Getting Started", "Red Teaming", "Blue Teaming", "Importance of Uptime", "Basics of SSH", "Network Probing"]
  let learnContents = [
    "This is the information about getting started",
    "Something about red teaming",
    "Now we are talking about blue teaming",
    "Uptime this and uptime that",
    "Here are the basics of SSH",
    "How network probing works blah blah blah"
  ]
  const [selectedIndex, setSelectedIndex] = useState(0)

  const optionStyle = "mt-10 w-full border-bottom border-solid border-b-2 hover:scale-105 duration-300"

  return (
    <>
    <Navbar/>

    <div className="p-10">
      
      
    <section className="min-h-screen p-50 w-full flex flex-col items-center gap-40">
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
                            {item}
                        </p>
                ))
                }

            </div>
            <div className="basis-2/3 text-xl flex flex-col items-center gap-4 p-10 rounded-xl border">
                {learnContents.map((item, index) => (
                    <>
                    <div
                        className={selectedIndex === index ? 'p-5 w-full flex text-3xl border-bottom border-solid border-b-2 ' : 'hidden'}
                        >
                            <p>{learnItems[index]}</p>
                    </div>
                    <div
                        className={selectedIndex === index ? 'p-5 flex flex-col gap-10 w-full ' : 'hidden'}
                        >
                            <p>{item}</p>
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

