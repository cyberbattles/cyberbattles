import Image from "next/image"
import Link from "next/link";
import logo from "../public/images/logo.png"

interface Props {
    loggedIn: boolean;
    // items: string[];
    // links: string[];
}

function Navbar({ loggedIn }: Props) {
    let items = ["Home", "Lab", "Learn"];
    let links = ["/", "/lab", "/learn"];
    if (loggedIn) {
      items = ["Home", "Leaderboard", "Traffic", "Shell"];
      links = ["/", "/test", "/test", "/test"];
    }
  
    return (
      <nav className="fixed w-full h-30 shadow-xl bg-black z-50">
        <div className="flex justify-between items-center h-full w-full px-4">
          <div className="flex justify-between items-center">
            <Image src={logo} alt="logo" width={150} className="ml-5 mr-5" />
            <ul className="hidden sm:flex">
              {items.map((item, index) => (
                <Link key={item} href={links[index]}>
                  <li className="ml-20 lowercase text-2xl hover:scale-105 duration-300 font-bold cursor-pointer">
                    {item}
                  </li>
                </Link>
              ))}
            </ul>
          </div>
          <div className="flex justify-between items-center">
            <ul className="hidden sm:flex">
              <Link href="/login">
                <li className="mr-20 lowercase text-2xl hover:scale-105 duration-300 cursor-pointer">
                  Login
                </li>
              </Link>
            </ul>
            <div className="w-20 h-20 bg-gray-300 rounded-full ml-5 mr-10"></div>
          </div>
        </div>
      </nav>
    );
  }
  

export default Navbar