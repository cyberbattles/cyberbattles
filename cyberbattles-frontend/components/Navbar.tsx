import Image from "next/image"
import Link from "next/link";
import logo from "../public/images/logo.png"

interface Props {
    loggedIn: boolean;
    // items: string[];
    // links: string[];
}

function Navbar({loggedIn}: Props) {
    console.log(loggedIn)
    let items = ["Home", "Lab", "Learn"]
    let links = ["/", "/lab", "/learn"]
    if (loggedIn){
        console.log("hit")
        items = ["Home", "leaderboard", "traffic", "shell"]
        links = ["/", "/test", "/test", "/test", "/test"]
    }
    return(
        <nav className="fixed w-full h-40 shadow-xl">
        <div className="flex justify-between items-center h-full w-full px-4">
            <div className="flex justify-between items-center">
                <Image src={logo} alt="logo of the website" width="150" className="ml-5 mr-5"/>
                <ul className="hidden sm:flex">
                    {/* Create each navbar item with its relevant link */}
                    {items.map((item, index) => (
                        <Link key={item} href={links[index]}>
                        <li key={item} className="ml-20 lowercase text-2xl hover:scale-105 duration-300">
                            {item}
                        </li>
                        </Link>
                    ))}
                </ul>
            </div>
            <div className="flex justify-between items-center">
                <ul className="hidden sm:flex">
                    <Link href="/login">
                    <li className="mr-20 lowercase text-2xl hover:scale-105 duration-300">
                        Login
                    </li>
                    </Link>
                </ul>
                <div className="w-20 h-20 bg-gray-300 rounded-full ml-5 mr-10"></div>
            </div>
                
        </div>
        </nav>
    )
}

export default Navbar