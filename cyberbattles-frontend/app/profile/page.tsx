'use client';
import Navbar from "../../components/Navbar"
import React, { useState } from "react";
export default function LearnPage() {

  let learnItems = [
    ["Edit Profile", ""], 
    ["Authentication", ""],
    ["Delete Account", ""]
]

  const [selectedIndex, setSelectedIndex] = useState(0)

  const optionStyle = "mt-10 w-full border-bottom border-solid border-b-2 hover:scale-105 duration-300"

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
                <div className="p-5 flex flex-col gap-10 w-full">
                    Edit
                </div>
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

